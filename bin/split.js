#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Image Splitter CLI

Usage:
  image-split [options] <source> [target]
  image-split [options] <source> --output <target>

Arguments:
  source            Source file or directory to split
  target            Target directory for output (optional)

Options:
  --parts <n>       Number of parts to split into (default: 6)
  --height <n>      Height of each slice in pixels (0 for auto)
  --top <n>         Pixel offset from top before cropping (default: 0)
  --output <dir>    Output directory (overrides target argument)
  --help            Show this help message

Examples:
  image-split screenshot.png                  # Creates screenshot_part1.png, etc. in same folder
  image-split screenshot.png parts/          # Split to 'parts' directory
  image-split . output/                       # Split current folder to 'output' directory
  image-split ./screenshots ./results        # Split 'screenshots' folder to 'results' directory
  image-split image.png --parts 4            # Split into 4 parts in same folder
  image-split ./images --output ./parts      # Split to specific output directory
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

  // Get all non-flag arguments (positional arguments)
  const positionalArgs = args.filter(arg => !arg.startsWith('--'));
  
  // First positional argument is source, second is target (if provided)
  const inputPath = positionalArgs[0];
  const targetPath = positionalArgs[1];
  
  // Find output directory if specified with --output flag (overrides positional target)
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : targetPath;
  
  // Parse splitting options
  const parts = parseInt(getArg(args, '--parts') || '6', 10);
  const top = parseInt(getArg(args, '--top') || '0', 10);
  const height = parseInt(getArg(args, '--height') || '0', 10);

  // Set the CLI arguments for the splitter module to use
  process.argv = ['node', 'splitter.js', ...args.filter(arg => arg.startsWith('--'))];

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

    console.log(`Splitting images in: ${absoluteInputPath}`);
    console.log(`Output directory: ${outputDir}`);
    
    const { processImages } = await import('../src/splitter.js');
    await processImages(absoluteInputPath, outputDir);
  }
  
  console.log('Splitting complete!');
}

main().catch(console.error);
