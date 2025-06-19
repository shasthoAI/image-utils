import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// Directory configuration (relative to project root)
// -----------------------------------------------------------------------------
// Images to be compressed should be placed in `input/compress`.
// Compressed versions will be written to `output/compress`.
// -----------------------------------------------------------------------------
const srcDir = path.resolve(process.cwd(), 'input', 'compress');
const outDir = path.resolve(process.cwd(), 'output', 'compress');

// -----------------------------------------------------------------------------
// CLI argument parsing
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);
const compressionLevel = args.includes('--extreme')
  ? 'extreme'
  : args.includes('--high')
  ? 'high'
  : 'medium';
const convertToWebP = args.includes('--webp');
const grayscale = args.includes('--grayscale');
const pngOptimized = args.includes('--png-optimized');

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

// -----------------------------------------------------------------------------
// Helper – multi-pass compression for a single image
// -----------------------------------------------------------------------------
const compressImageFile = async (inputPath, outputPath, ext) => {
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
    const finalOutputPath = convertToWebP ? outputPath.replace(ext, '.webp') : outputPath;

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
const compressImages = async (sourceDir = srcDir, outputDir = outDir) => {
  const entries = fs.readdirSync(sourceDir);
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry);
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      const nestedOutputDir = path.join(outputDir, entry);
      if (!fs.existsSync(nestedOutputDir)) fs.mkdirSync(nestedOutputDir, { recursive: true });
      await compressImages(srcPath, nestedOutputDir);
    } else if (stats.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'].includes(ext)) continue;

      const baseName = path.basename(entry, ext);
      const outputPath = path.join(outputDir, convertToWebP ? `${baseName}.webp` : entry);
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

compressImages().then(() => console.log('Compression complete!'));
