#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Image Splitter CLI

Usage:
  image-split [options] [file/directory]

Options:
  --parts <n>       Number of horizontal parts (default: 6)
  --top <n>         Pixel offset from top (default: 0)
  --height <n>      Height of each slice (default: full height)
  --output <dir>    Output directory (default: same as input)
  --help            Show this help message

Examples:
  image-split                                 # Use input/split folder
  image-split image.png                       # Creates image_part1.png, image_part2.png, etc. in same folder
  image-split ./screenshots                   # Creates 'split' subfolder with processed images
  image-split image.png --parts 4            # Split into 4 parts
  image-split image.png --output ./parts     # Split to specific output directory
`);
}

function getArg(args, flag) {
  const arg = args.find((a) => a.startsWith(flag));
  if (!arg) return undefined;
  const [, value] = arg.split('=');
  return value;
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
  
  // Parse splitting options
  const parts = parseInt(getArg(args, '--parts') || '6', 10);
  const top = parseInt(getArg(args, '--top') || '0', 10);
  const height = parseInt(getArg(args, '--height') || '0', 10);

  // Set the CLI arguments for the splitter module to use
  process.argv = ['node', 'splitter.js', ...args.filter(arg => arg.startsWith('--'))];

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
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff'].includes(ext)) {
        console.error(`Error: '${inputPath}' is not a supported image format.`);
        process.exit(1);
      }

      const outputDir = outputPath ? path.resolve(process.cwd(), outputPath) : path.dirname(absoluteInputPath);
      const baseName = path.basename(absoluteInputPath, ext);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`Splitting: ${absoluteInputPath}`);
      console.log(`Output directory: ${outputDir}`);
      
      const { splitImageHorizontally } = await import('../src/splitter.js');
      await splitImageHorizontally(absoluteInputPath, baseName, outputDir, parts, top, height);
      
    } else if (stats.isDirectory()) {
      // Directory processing - create a subdirectory for split files
      const outputDir = outputPath ? path.resolve(process.cwd(), outputPath) : path.join(absoluteInputPath, 'split');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`Splitting images in: ${absoluteInputPath}`);
      console.log(`Output directory: ${outputDir}`);
      
      const { processImages } = await import('../src/splitter.js');
      await processImages(absoluteInputPath, outputDir);
    }
  } else {
    // Default mode - use existing input/output folders
    console.log('No input path specified, using default input/split folder...');
    const { processImages } = await import('../src/splitter.js');
    await processImages();
  }
  
  console.log('Splitting complete!');
}

main().catch(console.error);
