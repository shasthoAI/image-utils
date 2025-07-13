#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Image Compressor CLI

Usage:
  image-compress [options] [file/directory]

Options:
  --medium          Medium compression (default)
  --high            High compression
  --extreme         Extreme compression
  --png-optimized   PNG optimized compression
  --webp            Convert to WebP format
  --grayscale       Apply grayscale filter
  --output <dir>    Output directory (default: same as input)
  --help            Show this help message

Examples:
  image-compress                              # Use input/compress folder
  image-compress image.jpg                    # Compress single file in-place
  image-compress ./photos                     # Compress all images in photos folder
  image-compress image.jpg --output ./out     # Compress to specific output directory
  image-compress --webp --high ./images      # High compression + WebP conversion
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Find the input path (first non-flag argument)
  const inputPath = args.find(arg => !arg.startsWith('--'));
  
  // Find output directory if specified
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;

  // Set the CLI arguments for the compressor module to use
  process.argv = ['node', 'compressor.js', ...args.filter(arg => arg.startsWith('--'))];

  if (inputPath) {
    // CLI mode - process specific file or directory
    const absoluteInputPath = path.resolve(process.cwd(), inputPath);
    
    if (!fs.existsSync(absoluteInputPath)) {
      console.error(`Error: '${inputPath}' does not exist.`);
      process.exit(1);
    }

    const stats = fs.statSync(absoluteInputPath);
    
    if (stats.isFile()) {
      // Single file processing
      const ext = path.extname(absoluteInputPath).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'].includes(ext)) {
        console.error(`Error: '${inputPath}' is not a supported image format.`);
        process.exit(1);
      }

      const outputDir = outputPath ? path.resolve(process.cwd(), outputPath) : path.dirname(absoluteInputPath);
      const baseName = path.basename(absoluteInputPath, ext);
      const convertToWebP = args.includes('--webp');
      const outputFile = path.join(outputDir, convertToWebP ? `${baseName}.webp` : path.basename(absoluteInputPath));
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`Compressing: ${absoluteInputPath}`);
      console.log(`Output: ${outputFile}`);
      
      const { compressImageFile } = await import('../src/compressor.js');
      await compressImageFile(absoluteInputPath, outputFile, ext);
      
    } else if (stats.isDirectory()) {
      // Directory processing
      const outputDir = outputPath ? path.resolve(process.cwd(), outputPath) : absoluteInputPath;
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`Compressing images in: ${absoluteInputPath}`);
      console.log(`Output directory: ${outputDir}`);
      
      const { compressImages } = await import('../src/compressor.js');
      await compressImages(absoluteInputPath, outputDir);
    }
  } else {
    // Default mode - use existing input/output folders
    console.log('No input path specified, using default input/compress folder...');
    const { compressImages } = await import('../src/compressor.js');
    await compressImages();
  }
  
  console.log('Compression complete!');
}

main().catch(console.error);
