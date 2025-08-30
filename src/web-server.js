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
const DEFAULT_PORT = process.env.PORT || 3000;

// Resolve writable base directory (works in Electron packaged app)
const BASE_DIR = process.env.IMAGE_UTILS_DATA_DIR || process.cwd();

// Middleware
app.use(cors());
app.use(express.json());

// Check for built React UI (works in both dev and packaged app)
const possibleUiPaths = [
  path.resolve(__dirname, '..', 'app', 'dist'),                    // Development
  process.resourcesPath ? path.resolve(process.resourcesPath, 'app', 'dist') : null, // Packaged app
  path.resolve(process.cwd(), 'app', 'dist')                      // Alternative fallback
].filter(Boolean);

const uiDist = possibleUiPaths.find(p => fs.existsSync(p));
const publicFallback = path.join(__dirname, '..', 'public');

if (uiDist) {
  console.log(`🎯 Serving React UI from: ${uiDist}`);
  app.use(express.static(uiDist));
} else {
  console.warn(`⚠️  React UI not built. Tried paths:`);
  possibleUiPaths.forEach(p => console.warn(`   - ${p} ${fs.existsSync(p) ? '✅' : '❌'}`));
  console.log(`📁 Falling back to: ${publicFallback}`);
  app.use(express.static(publicFallback));
}

// Ensure upload directories exist under a writable base
const uploadsDir = path.resolve(BASE_DIR, 'uploads');
const outputsDir = path.resolve(BASE_DIR, 'outputs');
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
        // Determine the actual output path (handles WebP conversion, case-insensitive)
        const parsedOut = path.parse(outputPath);
        const finalOutputPath = (config.convertToWebP)
          ? path.join(parsedOut.dir, `${parsedOut.name}.webp`)
          : outputPath;
        const finalMime = (config.convertToWebP && ext) ? 'image/webp' : file.mimetype;
        
        if (success) {
          const stats = fs.statSync(finalOutputPath);
          await addFileRecord(jobId, 'output', path.basename(finalOutputPath), finalOutputPath, stats.size, finalMime);
            const originalKB = (file.size / 1024).toFixed(2);
            const compressedKB = (stats.size / 1024).toFixed(2);
            const ratio = (((file.size - stats.size) / file.size) * 100).toFixed(1);
            results.push({
              original: file.originalname,
              compressed: path.basename(finalOutputPath),
              success: true,
              originalUrl: `/uploads/${path.basename(file.path)}`,
              compressedUrl: `/api/download/${jobId}/${path.basename(finalOutputPath)}`,
              compressedViewUrl: `/outputs/${path.basename(finalOutputPath)}`,
              originalSizeKB: originalKB,
              compressedSizeKB: compressedKB,
              compressionRatio: ratio
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
        
        const partDetails = [];
        for (const outputFile of outputFiles) {
          const stats = fs.statSync(outputFile);
          await addFileRecord(jobId, 'output', path.basename(outputFile), outputFile, stats.size, file.mimetype);
          partDetails.push({
            name: path.basename(outputFile),
            sizeKB: (stats.size / 1024).toFixed(2),
            viewUrl: `/outputs/${jobId}/${path.basename(outputFile)}`,
            downloadUrl: `/api/download/${jobId}/${path.basename(outputFile)}`
          });
        }
        
        results.push({
          original: file.originalname,
          parts: outputFiles.map(f => path.basename(f)),
          partDetails,
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
        
        await convertPdfToImages(file.path, jobOutputDir, { format: config.format, scale: config.scale });
        
        // Record output files (use base from stored path to match poppler output)
        const baseName = path.basename(file.path, '.pdf');
        const outputFiles = fs.readdirSync(jobOutputDir)
          .filter(f => f.startsWith(baseName))
          .map(f => path.join(jobOutputDir, f));
        
        const pageDetails = [];
        for (const outputFile of outputFiles) {
          const stats = fs.statSync(outputFile);
          await addFileRecord(jobId, 'output', path.basename(outputFile), outputFile, stats.size, `image/${config.format}`);
          pageDetails.push({
            name: path.basename(outputFile),
            sizeKB: (stats.size / 1024).toFixed(2),
            viewUrl: `/outputs/${jobId}/${path.basename(outputFile)}`,
            downloadUrl: `/api/download/${jobId}/${path.basename(outputFile)}`
          });
        }
        
        results.push({
          original: file.originalname,
          pages: outputFiles.map(f => path.basename(f)),
          pageDetails,
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
    "SELECT path FROM files WHERE job_id = ? AND type = 'output' AND path LIKE ?",
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

// Execute tool chain (async with progress)
app.post('/api/chains/:id/execute-async', upload.array('files'), async (req, res) => {
  try {
    const chainId = req.params.id;
    db.get('SELECT * FROM tool_chains WHERE id = ?', [chainId], async (err, chain) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      if (!chain) { res.status(404).json({ error: 'Chain not found' }); return; }
      const steps = JSON.parse(chain.steps);
      const executionId = uuidv4();

      db.run(
        'INSERT INTO chain_executions (id, chain_id, input_files) VALUES (?, ?, ?)',
        [executionId, chainId, JSON.stringify(req.files.map(f => f.originalname))],
        async () => {
          // mark running
          db.run('UPDATE chain_executions SET status = ?, updated_at = ? WHERE id = ?', ['running', new Date().toISOString(), executionId]);
          // respond immediately with id + step count
          res.status(202).json({ executionId, stepCount: steps.length });

          // run in background
          let currentFiles = req.files;
          const results = [];
          try {
            console.log(`🔄 Starting chain execution ${executionId} with ${steps.length} steps`);
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              console.log(`📝 Executing step ${i + 1}/${steps.length}: ${step.tool}`);
              
              // Update current step with Promise wrapper
              await new Promise((resolve, reject) => {
                db.run('UPDATE chain_executions SET current_step = ?, updated_at = ? WHERE id = ?', [i, new Date().toISOString(), executionId], function(err) {
                  if (err) reject(err); else resolve(this);
                });
              });
              
              let stepResult;
              if (step.tool === 'compress') {
                stepResult = await executeCompressionStep(currentFiles, step.config || {}, executionId);
              } else if (step.tool === 'split') {
                stepResult = await executeSplitStep(currentFiles, step.config || {}, executionId);
              } else if (step.tool === 'pdf-split') {
                stepResult = await executePdfSplitStep(currentFiles, step.config || {}, executionId);
              }
              results.push(stepResult);
              if (stepResult && stepResult.outputFiles) currentFiles = stepResult.outputFiles;
              console.log(`✅ Step ${i + 1} completed with ${stepResult?.results?.length || 0} results`);
            }
            console.log(`🎉 Chain execution ${executionId} completed successfully`);
            
            // Update completion status with Promise wrapper
            await new Promise((resolve, reject) => {
              db.run(
                'UPDATE chain_executions SET status = "completed", output_files = ?, updated_at = ? WHERE id = ?',
                [JSON.stringify(results), new Date().toISOString(), executionId],
                function(err) {
                  if (err) reject(err); else resolve(this);
                }
              );
            });
            console.log(`💾 Database updated for execution ${executionId}`);
          } catch (error) {
            console.error(`❌ Chain execution ${executionId} failed:`, error);
            try {
              await new Promise((resolve, reject) => {
                db.run('UPDATE chain_executions SET status = "failed", updated_at = ? WHERE id = ?', [new Date().toISOString(), executionId], function(err) {
                  if (err) reject(err); else resolve(this);
                });
              });
            } catch (dbError) {
              console.error(`❌ Failed to update database for failed execution ${executionId}:`, dbError);
            }
          }
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chain execution status
app.get('/api/chain-executions/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM chain_executions WHERE id = ?', [id], (err, row) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    if (!row) { res.status(404).json({ error: 'Execution not found' }); return; }
    let output = null; try { output = row.output_files ? JSON.parse(row.output_files) : null; } catch {}
    res.json({
      id: row.id,
      chain_id: row.chain_id,
      status: row.status,
      current_step: row.current_step,
      created_at: row.created_at,
      updated_at: row.updated_at,
      results: output,
    });
  });
});

// List chain executions (latest first) with chain names when available
app.get('/api/chain-executions', (req, res) => {
  // Load chains to map names in both sqlite and JSON fallback
  db.all('SELECT * FROM tool_chains ORDER BY created_at DESC', (errChains, chains) => {
    if (errChains) { res.status(500).json({ error: errChains.message }); return; }
    const nameById = new Map((chains||[]).map(c=>[c.id, c.name]));
    db.all('SELECT * FROM chain_executions ORDER BY created_at DESC', (errExec, execs) => {
      if (errExec) { res.status(500).json({ error: errExec.message }); return; }
      const rows = (execs||[]).map(e=>({
        ...e,
        chain_name: nameById.get(e.chain_id) || e.chain_id
      }));
      res.json(rows);
    });
  });
});

// Secure download for chain execution artifacts
app.get('/api/chain-executions/:id/download/:filename', (req, res) => {
  const id = req.params.id;
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const tryPaths = [
    path.join(outputsDir, filename),
    path.join(outputsDir, `${id}_split`, filename),
    path.join(outputsDir, `${id}_pdf`, filename),
  ];
  const filePath = tryPaths.find(p=> fs.existsSync(p) && (path.basename(p)===filename));
  if (!filePath) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath, filename);
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
    // Determine actual output path (handles WebP conversion, case-insensitive)
    const parsedOut = path.parse(outputPath);
    const finalOutputPath = (config.convertToWebP)
      ? path.join(parsedOut.dir, `${parsedOut.name}.webp`)
      : outputPath;
    
    if (success && fs.existsSync(finalOutputPath)) {
      const stats = fs.statSync(finalOutputPath);
      outputFiles.push({
        originalname: path.basename(finalOutputPath),
        filename: path.basename(finalOutputPath),
        path: finalOutputPath,
        size: stats.size,
        mimetype: file.mimetype
      });
    }
    
    const originalSize = file.size || (fs.existsSync(file.path) ? fs.statSync(file.path).size : 0);
    const compressedSize = success && fs.existsSync(finalOutputPath) ? fs.statSync(finalOutputPath).size : 0;

    // Build web URLs for compare view
    let originalViewUrl = '';
    if (file.path.startsWith(uploadsDir)) {
      originalViewUrl = `/uploads/${path.basename(file.path)}`;
    } else if (file.path.startsWith(outputsDir)) {
      const rel = path.relative(outputsDir, file.path);
      originalViewUrl = `/outputs/${rel}`;
    }
    const fname = path.basename(finalOutputPath);
    const compressedViewUrl = success ? `/outputs/${fname}` : '';
    const compressedDownloadUrl = success ? `/api/chain-executions/${executionId}/download/${fname}` : '';

    const ratio = originalSize ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1) : '0';

    results.push({
      original: file.originalname,
      success,
      output: success ? path.basename(finalOutputPath) : null,
      originalViewUrl,
      compressedViewUrl,
      compressedDownloadUrl,
      originalSizeKB: (originalSize / 1024).toFixed(2),
      compressedSizeKB: (compressedSize / 1024).toFixed(2),
      compressionRatio: ratio
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
  const webFiles = [];
  
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
        const rel = path.relative(outputsDir, filePath);
        const viewUrl = `/outputs/${rel}`;
        const downloadUrl = `/api/chain-executions/${executionId}/download/${path.basename(filePath)}`;
        webFiles.push({ name: f, sizeKB: (stats.size / 1024).toFixed(2), viewUrl, downloadUrl });
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
    outputFiles,
    webFiles
  };
}

async function executePdfSplitStep(files, config, executionId) {
  const results = [];
  const outputFiles = [];
  const webFiles = [];
  
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
    
    await convertPdfToImages(file.path, stepOutputDir, { format: config.format || 'png', scale: config.scale || 150 });
    
    const baseName = path.basename(file.path, '.pdf');
    const pdfFiles = fs.readdirSync(stepOutputDir)
      .filter(f => f.startsWith(baseName))
      .map(f => {
        const filePath = path.join(stepOutputDir, f);
        const stats = fs.statSync(filePath);
        const rel = path.relative(outputsDir, filePath);
        const viewUrl = `/outputs/${rel}`;
        const downloadUrl = `/api/chain-executions/${executionId}/download/${path.basename(filePath)}`;
        webFiles.push({ name: f, sizeKB: (stats.size / 1024).toFixed(2), viewUrl, downloadUrl });
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
    outputFiles,
    webFiles
  };
}

// Serve static files from uploads and outputs
app.use('/uploads', express.static(uploadsDir));
app.use('/outputs', express.static(outputsDir));

// Serve the main HTML page and handle SPA routing
app.get('/', (req, res) => {
  const indexPath = uiDist && fs.existsSync(path.join(uiDist, 'index.html')) 
    ? path.join(uiDist, 'index.html')
    : path.join(publicFallback, 'index.html');
  
  res.sendFile(indexPath);
});

// Handle client-side routing - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/outputs/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  // Serve index.html for all other routes (SPA routing)
  const indexPath = uiDist && fs.existsSync(path.join(uiDist, 'index.html')) 
    ? path.join(uiDist, 'index.html')
    : path.join(publicFallback, 'index.html');
  
  res.sendFile(indexPath);
});

// Helper to start server (used by Electron or CLI)
export function startServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`\n🚀 Image Tools Web Server running on http://localhost:${actualPort}`);
        console.log(`📱 React UI: ${fs.existsSync(uiDist) ? 'Built ✅' : 'Not built ⚠️'}`);
        console.log(`💾 Database: ${path.resolve(BASE_DIR, 'data')}`);
        console.log(`📁 Uploads: ${uploadsDir}`);
        console.log(`📁 Outputs: ${outputsDir}\n`);
        resolve({ server, port: actualPort });
      });
      server.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// If executed directly, start the server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer(DEFAULT_PORT).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
