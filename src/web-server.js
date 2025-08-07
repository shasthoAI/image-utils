import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { db } from './database.js';
import { compressImageFile, setCompressionConfig } from './compressor.js';
import { splitImageHorizontally } from './splitter.js';
import { convertPdfToImages } from './pdf_splitter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ensure upload directories exist
const uploadsDir = path.resolve(process.cwd(), 'uploads');
const outputsDir = path.resolve(process.cwd(), 'outputs');
[uploadsDir, outputsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|webp|gif|tiff|avif|pdf)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

// Helper function to create a job record
const createJob = (type, config) => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const configStr = JSON.stringify(config);
    
    db.run(
      'INSERT INTO jobs (id, type, config) VALUES (?, ?, ?)',
      [id, type, configStr],
      function(err) {
        if (err) reject(err);
        else resolve(id);
      }
    );
  });
};

// Helper function to update job status
const updateJobStatus = (jobId, status, errorMessage = null, completedAt = null) => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      'UPDATE jobs SET status = ?, updated_at = ?, error_message = ?, completed_at = ? WHERE id = ?',
      [status, now, errorMessage, completedAt, jobId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

// Helper function to add file record
const addFileRecord = (jobId, type, originalName, filePath, size, mimeType) => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    db.run(
      'INSERT INTO files (id, job_id, type, original_name, path, size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, jobId, type, originalName, filePath, size, mimeType],
      function(err) {
        if (err) reject(err);
        else resolve(id);
      }
    );
  });
};

// API Routes

// Get all jobs
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM jobs ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => ({
        ...row,
        config: JSON.parse(row.config)
      })));
    }
  });
});

// Get job details with files
app.get('/api/jobs/:id', (req, res) => {
  const jobId = req.params.id;
  
  db.get('SELECT * FROM jobs WHERE id = ?', [jobId], (err, job) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!job) {
      res.status(404).json({ error: 'Job not found' });
    } else {
      db.all('SELECT * FROM files WHERE job_id = ?', [jobId], (err, files) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({
            ...job,
            config: JSON.parse(job.config),
            files: files
          });
        }
      });
    }
  });
});

// Image compression endpoint
app.post('/api/compress', upload.array('files'), async (req, res) => {
  try {
    const config = {
      compressionLevel: req.body.level || 'medium',
      convertToWebP: req.body.webp === 'true',
      grayscale: req.body.grayscale === 'true',
      pngOptimized: req.body.pngOptimized === 'true'
    };

    const jobId = await createJob('compress', config);
    
    // Set compression configuration
    setCompressionConfig(config);
    
    const results = [];
    
    for (const file of req.files) {
      try {
        await addFileRecord(jobId, 'input', file.originalname, file.path, file.size, file.mimetype);
        
        const outputPath = path.join(outputsDir, `${jobId}_${file.originalname}`);
        const ext = path.extname(file.originalname).toLowerCase();
        
        const success = await compressImageFile(file.path, outputPath, ext);
        
        if (success) {
          const stats = fs.statSync(outputPath);
          await addFileRecord(jobId, 'output', path.basename(outputPath), outputPath, stats.size, file.mimetype);
          results.push({
            original: file.originalname,
            compressed: path.basename(outputPath),
            success: true
          });
        } else {
          results.push({
            original: file.originalname,
            success: false,
            error: 'Compression would increase file size'
          });
        }
      } catch (error) {
        results.push({
          original: file.originalname,
          success: false,
          error: error.message
        });
      }
    }
    
    await updateJobStatus(jobId, 'completed', null, new Date().toISOString());
    
    res.json({
      jobId,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Image splitting endpoint
app.post('/api/split', upload.array('files'), async (req, res) => {
  try {
    const config = {
      parts: parseInt(req.body.parts) || 6,
      topOffset: parseInt(req.body.topOffset) || 0,
      sliceHeight: parseInt(req.body.sliceHeight) || 0
    };

    const jobId = await createJob('split', config);
    const results = [];
    
    for (const file of req.files) {
      try {
        await addFileRecord(jobId, 'input', file.originalname, file.path, file.size, file.mimetype);
        
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const jobOutputDir = path.join(outputsDir, jobId);
        
        if (!fs.existsSync(jobOutputDir)) {
          fs.mkdirSync(jobOutputDir, { recursive: true });
        }
        
        await splitImageHorizontally(
          file.path,
          baseName,
          jobOutputDir,
          config.parts,
          config.topOffset,
          config.sliceHeight
        );
        
        // Record output files
        const outputFiles = fs.readdirSync(jobOutputDir)
          .filter(f => f.startsWith(baseName))
          .map(f => path.join(jobOutputDir, f));
        
        for (const outputFile of outputFiles) {
          const stats = fs.statSync(outputFile);
          await addFileRecord(jobId, 'output', path.basename(outputFile), outputFile, stats.size, file.mimetype);
        }
        
        results.push({
          original: file.originalname,
          parts: outputFiles.map(f => path.basename(f)),
          success: true
        });
        
      } catch (error) {
        results.push({
          original: file.originalname,
          success: false,
          error: error.message
        });
      }
    }
    
    await updateJobStatus(jobId, 'completed', null, new Date().toISOString());
    
    res.json({
      jobId,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDF splitting endpoint
app.post('/api/pdf-split', upload.array('files'), async (req, res) => {
  try {
    const config = {
      format: req.body.format || 'png',
      scale: parseInt(req.body.scale) || 150
    };

    const jobId = await createJob('pdf-split', config);
    const results = [];
    
    for (const file of req.files) {
      try {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
          results.push({
            original: file.originalname,
            success: false,
            error: 'File is not a PDF'
          });
          continue;
        }
        
        await addFileRecord(jobId, 'input', file.originalname, file.path, file.size, file.mimetype);
        
        const jobOutputDir = path.join(outputsDir, jobId);
        
        if (!fs.existsSync(jobOutputDir)) {
          fs.mkdirSync(jobOutputDir, { recursive: true });
        }
        
        await convertPdfToImages(file.path, jobOutputDir);
        
        // Record output files
        const baseName = path.basename(file.originalname, '.pdf');
        const outputFiles = fs.readdirSync(jobOutputDir)
          .filter(f => f.startsWith(baseName))
          .map(f => path.join(jobOutputDir, f));
        
        for (const outputFile of outputFiles) {
          const stats = fs.statSync(outputFile);
          await addFileRecord(jobId, 'output', path.basename(outputFile), outputFile, stats.size, `image/${config.format}`);
        }
        
        results.push({
          original: file.originalname,
          pages: outputFiles.map(f => path.basename(f)),
          success: true
        });
        
      } catch (error) {
        results.push({
          original: file.originalname,
          success: false,
          error: error.message
        });
      }
    }
    
    await updateJobStatus(jobId, 'completed', null, new Date().toISOString());
    
    res.json({
      jobId,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download file endpoint
app.get('/api/download/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params;
  
  // Check if file exists in job outputs
  db.get(
    'SELECT path FROM files WHERE job_id = ? AND type = "output" AND path LIKE ?',
    [jobId, `%${filename}`],
    (err, file) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!file || !fs.existsSync(file.path)) {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.download(file.path, filename);
      }
    }
  );
});

// Tool chain endpoints
app.get('/api/chains', (req, res) => {
  db.all('SELECT * FROM tool_chains ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(row => ({
        ...row,
        steps: JSON.parse(row.steps)
      })));
    }
  });
});

app.post('/api/chains', (req, res) => {
  const { name, steps } = req.body;
  const id = uuidv4();
  
  db.run(
    'INSERT INTO tool_chains (id, name, steps) VALUES (?, ?, ?)',
    [id, name, JSON.stringify(steps)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id, name, steps });
      }
    }
  );
});

// Execute tool chain
app.post('/api/chains/:id/execute', upload.array('files'), async (req, res) => {
  try {
    const chainId = req.params.id;
    
    // Get chain definition
    db.get('SELECT * FROM tool_chains WHERE id = ?', [chainId], async (err, chain) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!chain) {
        res.status(404).json({ error: 'Chain not found' });
        return;
      }
      
      const steps = JSON.parse(chain.steps);
      const executionId = uuidv4();
      
      // Create chain execution record
      db.run(
        'INSERT INTO chain_executions (id, chain_id, input_files) VALUES (?, ?, ?)',
        [executionId, chainId, JSON.stringify(req.files.map(f => f.originalname))],
        async () => {
          let currentFiles = req.files;
          const results = [];
          
          try {
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              
              // Update current step
              db.run(
                'UPDATE chain_executions SET current_step = ?, updated_at = ? WHERE id = ?',
                [i, new Date().toISOString(), executionId]
              );
              
              let stepResult;
              
              if (step.tool === 'compress') {
                stepResult = await executeCompressionStep(currentFiles, step.config, executionId);
              } else if (step.tool === 'split') {
                stepResult = await executeSplitStep(currentFiles, step.config, executionId);
              } else if (step.tool === 'pdf-split') {
                stepResult = await executePdfSplitStep(currentFiles, step.config, executionId);
              }
              
              results.push(stepResult);
              
              // Update current files for next step
              if (stepResult.outputFiles) {
                currentFiles = stepResult.outputFiles;
              }
            }
            
            // Mark execution as completed
            db.run(
              'UPDATE chain_executions SET status = "completed", output_files = ?, updated_at = ? WHERE id = ?',
              [JSON.stringify(results), new Date().toISOString(), executionId]
            );
            
            res.json({
              executionId,
              results
            });
            
          } catch (error) {
            db.run(
              'UPDATE chain_executions SET status = "failed", updated_at = ? WHERE id = ?',
              [new Date().toISOString(), executionId]
            );
            
            res.status(500).json({ error: error.message });
          }
        }
      );
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for chain execution
async function executeCompressionStep(files, config, executionId) {
  setCompressionConfig(config);
  const results = [];
  const outputFiles = [];
  
  for (const file of files) {
    const outputPath = path.join(outputsDir, `${executionId}_compressed_${file.filename || file.originalname}`);
    const ext = path.extname(file.filename || file.originalname).toLowerCase();
    
    const success = await compressImageFile(file.path, outputPath, ext);
    
    if (success && fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      outputFiles.push({
        originalname: path.basename(outputPath),
        filename: path.basename(outputPath),
        path: outputPath,
        size: stats.size,
        mimetype: file.mimetype
      });
    }
    
    results.push({
      original: file.originalname,
      success,
      output: success ? path.basename(outputPath) : null
    });
  }
  
  return {
    tool: 'compress',
    results,
    outputFiles
  };
}

async function executeSplitStep(files, config, executionId) {
  const results = [];
  const outputFiles = [];
  
  for (const file of files) {
    const baseName = path.basename(file.filename || file.originalname, path.extname(file.filename || file.originalname));
    const stepOutputDir = path.join(outputsDir, `${executionId}_split`);
    
    if (!fs.existsSync(stepOutputDir)) {
      fs.mkdirSync(stepOutputDir, { recursive: true });
    }
    
    await splitImageHorizontally(
      file.path,
      baseName,
      stepOutputDir,
      config.parts || 6,
      config.topOffset || 0,
      config.sliceHeight || 0
    );
    
    const splitFiles = fs.readdirSync(stepOutputDir)
      .filter(f => f.startsWith(baseName))
      .map(f => {
        const filePath = path.join(stepOutputDir, f);
        const stats = fs.statSync(filePath);
        return {
          originalname: f,
          filename: f,
          path: filePath,
          size: stats.size,
          mimetype: file.mimetype
        };
      });
    
    outputFiles.push(...splitFiles);
    
    results.push({
      original: file.originalname,
      success: true,
      parts: splitFiles.map(f => f.filename)
    });
  }
  
  return {
    tool: 'split',
    results,
    outputFiles
  };
}

async function executePdfSplitStep(files, config, executionId) {
  const results = [];
  const outputFiles = [];
  
  for (const file of files) {
    if (path.extname(file.filename || file.originalname).toLowerCase() !== '.pdf') {
      results.push({
        original: file.originalname,
        success: false,
        error: 'Not a PDF file'
      });
      continue;
    }
    
    const stepOutputDir = path.join(outputsDir, `${executionId}_pdf`);
    
    if (!fs.existsSync(stepOutputDir)) {
      fs.mkdirSync(stepOutputDir, { recursive: true });
    }
    
    await convertPdfToImages(file.path, stepOutputDir);
    
    const baseName = path.basename(file.filename || file.originalname, '.pdf');
    const pdfFiles = fs.readdirSync(stepOutputDir)
      .filter(f => f.startsWith(baseName))
      .map(f => {
        const filePath = path.join(stepOutputDir, f);
        const stats = fs.statSync(filePath);
        return {
          originalname: f,
          filename: f,
          path: filePath,
          size: stats.size,
          mimetype: `image/${config.format || 'png'}`
        };
      });
    
    outputFiles.push(...pdfFiles);
    
    results.push({
      original: file.originalname,
      success: true,
      pages: pdfFiles.map(f => f.filename)
    });
  }
  
  return {
    tool: 'pdf-split',
    results,
    outputFiles
  };
}

// Serve static files from uploads and outputs
app.use('/uploads', express.static(uploadsDir));
app.use('/outputs', express.static(outputsDir));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Image Tools Web Server running on http://localhost:${PORT}`);
});

export default app;