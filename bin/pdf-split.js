#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
PDF Splitter CLI

Usage:
  pdf-split [options] <source> [target]
  pdf-split [options] <source> --output <target>

Arguments:
  source            Source PDF file or directory to process
  target            Target directory for output (optional)

Options:
  --format <format> Output format: png, jpeg, tiff (default: png)
  --scale <n>       DPI scaling factor (default: 150)
  --output <dir>    Output directory (overrides target argument)
  --help            Show this help message

Examples:
  pdf-split document.pdf                      # Creates document-1.png, document-2.png, etc. in same folder
  pdf-split document.pdf pages/              # Split to 'pages' directory
  pdf-split . output/                         # Process current folder to 'output' directory
  pdf-split ./documents ./results            # Process 'documents' folder to 'results' directory
  pdf-split document.pdf --format jpeg       # Split to JPEG format in same folder
  pdf-split document.pdf --output ./pages    # Split to specific output directory
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

  // Set the CLI arguments for the pdf_splitter module to use
  process.argv = ['node', 'pdf_splitter.js', ...args.filter(arg => arg.startsWith('--'))];

  if (!inputPath) {
    console.error('Error: Source PDF file or directory is required.');
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
    if (ext !== '.pdf') {
      console.error(`Error: '${inputPath}' is not a PDF file.`);
      process.exit(1);
    }

    const outputDir = outputPath ? path.resolve(process.cwd(), outputPath) : path.dirname(absoluteInputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Splitting PDF: ${absoluteInputPath}`);
    console.log(`Output directory: ${outputDir}`);
    
    const { convertPdfToImages } = await import('../src/pdf_splitter.js');
    await convertPdfToImages(absoluteInputPath, outputDir);
    
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

    console.log(`Splitting PDFs in: ${absoluteInputPath}`);
    console.log(`Output directory: ${outputDir}`);
    
    const { processPdfs } = await import('../src/pdf_splitter.js');
    await processPdfs(absoluteInputPath, outputDir);
  }
  
  console.log('PDF splitting complete!');
}

main().catch(console.error);
