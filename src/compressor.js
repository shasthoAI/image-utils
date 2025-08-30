import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// Directory configuration (relative to project root)
// -----------------------------------------------------------------------------
// Images to be compressed should be placed in `input/compress`.
// Compressed versions will be written to `output/compress`.
// -----------------------------------------------------------------------------
const srcDir = path.resolve(process.cwd(), 'input', 'compress');
const outDir = path.resolve(process.cwd(), 'output', 'compress');

// -----------------------------------------------------------------------------
// CLI argument parsing (only when run directly)
// -----------------------------------------------------------------------------
let args, compressionLevel, convertToWebP, grayscale, pngOptimized;

// Configuration state
let currentConfig = {
  compressionLevel: 'medium',
  convertToWebP: false,
  grayscale: false,
  pngOptimized: false
};

// Function to set compression configuration
export const setCompressionConfig = (config) => {
  currentConfig = { ...currentConfig, ...config };
  compressionLevel = currentConfig.compressionLevel;
  convertToWebP = currentConfig.convertToWebP;
  grayscale = currentConfig.grayscale;
  pngOptimized = currentConfig.pngOptimized;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  args = process.argv.slice(2);
  compressionLevel = args.includes('--extreme')
    ? 'extreme'
    : args.includes('--high')
    ? 'high'
    : 'medium';
  convertToWebP = args.includes('--webp');
  grayscale = args.includes('--grayscale');
  pngOptimized = args.includes('--png-optimized');
  
  // Update current config
  setCompressionConfig({
    compressionLevel,
    convertToWebP,
    grayscale,
    pngOptimized
  });
} else {
  // Default values when imported
  args = process.argv.slice(2);
  compressionLevel = args.includes('--extreme')
    ? 'extreme'
    : args.includes('--high')
    ? 'high'
    : 'medium';
  convertToWebP = args.includes('--webp');
  grayscale = args.includes('--grayscale');
  pngOptimized = args.includes('--png-optimized');
  
  // Update current config
  setCompressionConfig({
    compressionLevel,
    convertToWebP,
    grayscale,
    pngOptimized
  });
}

// -----------------------------------------------------------------------------
// Compression settings
// -----------------------------------------------------------------------------
const compressionSettings = {
  medium: {
    jpegQuality: 60,
    pngCompressionLevel: 9,
    resize: 1024,
    webpQuality: 75,
    pngColors: 256,
    pngDithering: 0.8,
  },
  high: {
    jpegQuality: 40,
    pngCompressionLevel: 9,
    resize: 800,
    webpQuality: 50,
    pngColors: 128,
    pngDithering: 0.6,
  },
  extreme: {
    jpegQuality: 20,
    pngCompressionLevel: 9,
    resize: 600,
    webpQuality: 30,
    pngColors: 64,
    pngDithering: 0.4,
  },
  pngOptimized: {
    jpegQuality: 40,
    pngCompressionLevel: 9,
    resize: 800,
    webpQuality: 50,
    pngColors: 128,
    pngDithering: 0.6,
    pngQuality: 50,
  },
};

// Only run setup when this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Compression level: ${pngOptimized ? 'png-optimized' : compressionLevel}`);
  console.log(`Convert to WebP : ${convertToWebP}`);
  console.log(`Apply grayscale : ${grayscale}`);
  console.log(`PNG optimized    : ${pngOptimized}`);

  // Ensure the required directories exist
  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory '${srcDir}' does not exist. Creating it now …`);
    fs.mkdirSync(srcDir, { recursive: true });
    console.log('Please add images to compress and run the command again.');
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// Helper – multi-pass compression for a single image
// -----------------------------------------------------------------------------
export const compressImageFile = async (inputPath, outputPath, ext) => {
  const settings = pngOptimized ? compressionSettings.pngOptimized : compressionSettings[compressionLevel];
  const originalSize = fs.statSync(inputPath).size;
  const fileName = path.basename(inputPath);
  const tempPath1 = `${outputPath}.temp1`;
  const tempPath2 = `${outputPath}.temp2`;

  try {
    // First pass
    let pipeline = sharp(inputPath)
      .resize({ width: settings.resize, withoutEnlargement: true })
      .withMetadata(false)
      .grayscale(grayscale);

    if (['.jpg', '.jpeg'].includes(ext)) {
      await pipeline
        .jpeg({
          quality: settings.jpegQuality,
          mozjpeg: true,
          progressive: true,
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
        })
        .toFile(tempPath1);
    } else if (ext === '.png') {
      await pipeline
        .png({
          compressionLevel: settings.pngCompressionLevel,
          adaptiveFiltering: true,
          palette: true,
          quality: pngOptimized ? settings.pngQuality : 90,
          effort: 10,
          colors: settings.pngColors,
          dither: settings.pngDithering,
        })
        .toFile(tempPath1);
    } else if (ext === '.webp') {
      await pipeline
        .webp({ quality: settings.webpQuality, effort: 6, smartSubsample: true })
        .toFile(tempPath1);
    } else {
      await pipeline.toFile(tempPath1);
    }

    // Second pass for additional optimisation / format conversion
    const secondPipeline = sharp(tempPath1).withMetadata(false);
    const finalExt = convertToWebP ? '.webp' : ext;
    // Build final output path robustly regardless of original extension casing
    const parsedOut = path.parse(outputPath);
    const finalOutputPath = convertToWebP
      ? path.join(parsedOut.dir, `${parsedOut.name}.webp`)
      : outputPath;

    if (convertToWebP) {
      await secondPipeline
        .webp({
          quality: Math.max(settings.webpQuality - 10, 10),
          effort: 6,
          smartSubsample: true,
          reductionEffort: 6,
        })
        .toFile(tempPath2);
    } else if (['.jpg', '.jpeg'].includes(finalExt)) {
      await secondPipeline
        .jpeg({ quality: Math.max(settings.jpegQuality - 10, 10), mozjpeg: true, progressive: true })
        .toFile(tempPath2);
    } else if (finalExt === '.png') {
      await secondPipeline
        .png({
          compressionLevel: settings.pngCompressionLevel,
          adaptiveFiltering: true,
          palette: true,
          quality: pngOptimized ? Math.max(settings.pngQuality - 10, 10) : 80,
          colors: Math.max(settings.pngColors / 2, 32),
          dither: settings.pngDithering,
        })
        .toFile(tempPath2);
    } else {
      await secondPipeline.toFile(tempPath2);
    }

    const firstSize = fs.statSync(tempPath1).size;
    const secondSize = fs.statSync(tempPath2).size;

    if (secondSize < firstSize && secondSize < originalSize) {
      fs.renameSync(tempPath2, finalOutputPath);
      console.log(`Multi-pass compressed ${fileName}: ${(originalSize / 1024).toFixed(2)} KB → ${(secondSize / 1024).toFixed(2)} KB`);
      return true;
    }
    if (firstSize < originalSize) {
      fs.renameSync(tempPath1, finalOutputPath);
      console.log(`Single-pass compressed ${fileName}: ${(originalSize / 1024).toFixed(2)} KB → ${(firstSize / 1024).toFixed(2)} KB`);
      return true;
    }
    console.log(`Skipped ${fileName}: compression would increase size.`);
    return false;
  } catch (err) {
    console.error(`Error compressing ${fileName}:`, err);
    return false;
  } finally {
    if (fs.existsSync(tempPath1)) fs.unlinkSync(tempPath1);
    if (fs.existsSync(tempPath2)) fs.unlinkSync(tempPath2);
  }
};

// -----------------------------------------------------------------------------
// Recursive directory traversal
// -----------------------------------------------------------------------------
export const compressImages = async (sourceDir = srcDir, outputDir = outDir) => {
  // Skip common output directories to avoid infinite recursion
  const skipDirs = ['compressed', 'pdf-pages', 'split', 'output', 'node_modules', '.git'];
  
  // Prevent infinite recursion by checking if we're already processing a nested compressed directory
  const pathParts = sourceDir.split(path.sep);
  const hasCompressedInPath = pathParts.some(part => skipDirs.includes(part));
  if (hasCompressedInPath && sourceDir !== outputDir) {
    console.log(`Skipping nested output directory: ${sourceDir}`);
    return;
  }
  
  // Ensure output directory exists
  if (sourceDir !== outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const entries = fs.readdirSync(sourceDir);
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      // Skip output directories and hidden directories
      if (skipDirs.includes(entry) || entry.startsWith('.')) {
        console.log(`Skipping directory: ${entry}`);
        continue;
      }
      
      // For in-place processing (sourceDir === outputDir), process recursively without creating subdirs
      if (sourceDir === outputDir) {
        await compressImages(srcPath, srcPath);
      } else {
        // For separate output dir, maintain directory structure
        const nestedOutputDir = path.join(outputDir, entry);
        await compressImages(srcPath, nestedOutputDir);
      }
    } else if (stats.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'].includes(ext)) continue;

      const baseName = path.basename(entry, ext);
      let outputPath;
      
      // For in-place processing, add suffix to avoid overwriting original
      if (sourceDir === outputDir) {
        if (convertToWebP) {
          outputPath = path.join(outputDir, `${baseName}-compressed.webp`);
        } else {
          outputPath = path.join(outputDir, `${baseName}-compressed${ext}`);
        }
      } else {
        outputPath = path.join(outputDir, convertToWebP ? `${baseName}.webp` : entry);
      }
      
      if (fs.existsSync(outputPath)) {
        console.log(`Skipping ${entry}: already compressed.`);
        continue;
      }
      await compressImageFile(srcPath, outputPath, ext);
    }
  }
};

// -----------------------------------------------------------------------------
// CLI helper
// -----------------------------------------------------------------------------
console.log(`\nReading images from: ${srcDir}`);
console.log(`Writing compressed images to: ${outDir}\n`);
console.log(`Usage: node src/compressor.js [options]\n`);
console.log(`Options:\n  --medium (default)\n  --high\n  --extreme\n  --png-optimized\n  --webp\n  --grayscale\n`);

// Only run the CLI when this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  compressImages().then(() => console.log('Compression complete!'));
}
