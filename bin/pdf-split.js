#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
PDF Splitter CLI

Usage:
  pdf-split [options] [file/directory]

Options:
  --format <format> Output format: png, jpeg, tiff (default: png)
  --scale <n>       DPI scaling factor (default: 150)
  --output <dir>    Output directory (default: same as input)
  --help            Show this help message

Examples:
  pdf-split                                   # Use input/pdf folder
  pdf-split document.pdf                      # Creates document-1.png, document-2.png, etc. in same folder
  pdf-split ./documents                       # Splits PDFs in-place
  pdf-split document.pdf --format jpeg       # Split to JPEG format
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

  // Find the input path (first non-flag argument)
  const inputPath = args.find(arg => !arg.startsWith('--'));
  
  // Find output directory if specified
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;

  // Set the CLI arguments for the pdf_splitter module to use
  process.argv = ['node', 'pdf_splitter.js', ...args.filter(arg => arg.startsWith('--'))];

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
  } else {
    // Default mode - use existing input/output folders
    console.log('No input path specified, using default input/pdf folder...');
    const { processPdfs } = await import('../src/pdf_splitter.js');
    await processPdfs();
  }
  
  console.log('PDF splitting complete!');
}

main().catch(console.error);
