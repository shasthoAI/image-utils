#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Image Compressor CLI

Usage:
  image-compress [options] <source> [target]
  image-compress [options] <source> --output <target>

Arguments:
  source            Source file or directory to compress
  target            Target directory for output (optional)

Options:
  --medium          Medium compression (default)
  --high            High compression
  --extreme         Extreme compression
  --png-optimized   PNG optimized compression
  --webp            Convert to WebP format
  --grayscale       Apply grayscale filter
  --output <dir>    Output directory (overrides target argument)
  --help            Show this help message

Examples:
  image-compress image.jpg                    # Creates image-compressed.jpg in same folder
  image-compress image.jpg compressed/        # Compress to 'compressed' directory
  image-compress . output/                    # Compress current folder to 'output' directory
  image-compress ./photos ./results          # Compress 'photos' folder to 'results' directory
  image-compress image.jpg --output ./out    # Compress to specific output directory
  image-compress --webp --high ./images      # High compression + WebP conversion in-place
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Get all non-flag arguments (positional arguments)
  const positionalArgs = args.filter(arg => !arg.startsWith('--'));
  
  // First positional argument is source, second is target (if provided)
  const inputPath = positionalArgs[0];
  const targetPath = positionalArgs[1];
  
  // Find output directory if specified with --output flag (overrides positional target)
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : targetPath;

  // Set the CLI arguments for the compressor module to use
  process.argv = ['node', 'compressor.js', ...args.filter(arg => arg.startsWith('--'))];

  if (!inputPath) {
    console.error('Error: Source file or directory is required.');
    console.log('Use --help for usage information.');
    process.exit(1);
  }

  // Process the specified file or directory
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
    
    // Generate output filename
    let outputFileName;
    if (outputPath && outputPath !== path.dirname(absoluteInputPath)) {
      // If we have a separate output directory, don't add suffix
      outputFileName = convertToWebP ? `${baseName}.webp` : path.basename(absoluteInputPath);
    } else {
      // If processing in-place, add suffix to avoid overwriting
      outputFileName = convertToWebP ? `${baseName}-compressed.webp` : `${baseName}-compressed${ext}`;
    }
    const outputFile = path.join(outputDir, outputFileName);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Compressing: ${absoluteInputPath}`);
    console.log(`Output: ${outputFile}`);
    
    const { compressImageFile } = await import('../src/compressor.js');
    await compressImageFile(absoluteInputPath, outputFile, ext);
    
  } else if (stats.isDirectory()) {
    // Directory processing
    let outputDir;
    
    if (outputPath) {
      // Use specified output directory
      outputDir = path.resolve(process.cwd(), outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    } else {
      // Process in place (same directory)
      outputDir = absoluteInputPath;
    }

    console.log(`Compressing images in: ${absoluteInputPath}`);
    console.log(`Output directory: ${outputDir}`);
    
    const { compressImages } = await import('../src/compressor.js');
    await compressImages(absoluteInputPath, outputDir);
  }
  
  console.log('Compression complete!');
}

main().catch(console.error);
