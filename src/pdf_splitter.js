import popplerPkg from 'node-poppler';
const { Poppler } = popplerPkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// -----------------------------------------------------------------------------
// Directory configuration (relative to project root)
// -----------------------------------------------------------------------------
// Place PDFs to split in `input/pdf`.
// Generated page images will be written to `output/pdf`.
// -----------------------------------------------------------------------------
const projectRoot = process.cwd();
const inputDir = path.resolve(projectRoot, 'input', 'pdf');
const outputDir = path.resolve(projectRoot, 'output', 'pdf');

// -----------------------------------------------------------------------------
// CLI / ENV configuration
//   --format=<png|jpeg|tiff>  image format (default png)
//   --scale=<n>               dpi scaling factor (default 1024)
// -----------------------------------------------------------------------------
const cliArgs = process.argv.slice(2);

const getArg = (flag) => {
  // returns value after '=' or true boolean if flag exists without '='.

  const arg = cliArgs.find((a) => a.startsWith(flag));
  if (!arg) return undefined;
  const [, value] = arg.split('=');
  return value;
};

const FORMAT = (getArg('--format') || process.env.PDF_CONVERT_FORMAT || 'png').toLowerCase();
const SCALE = parseInt(getArg('--scale') || process.env.PDF_CONVERT_SCALE || '150', 10);
const POPPLER_PATH = getArg('--poppler-path') || process.env.POPPLER_PATH || null;

// -----------------------------------------------------------------------------
// Ensure output directory exists
// -----------------------------------------------------------------------------
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

/**
 * Convert a PDF into images – one per page.
 * @param {string} pdfPath Absolute path to the PDF file
 */
async function convertPdfToImages(pdfPath) {
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const poppler = POPPLER_PATH ? new Poppler(POPPLER_PATH) : new Poppler();
  const opts = {
    // map format to node-poppler flag
    ...(FORMAT === 'png' && { pngFile: true }),
    ...(FORMAT === 'jpeg' && { jpegFile: true }),
    ...(FORMAT === 'jpg' && { jpegFile: true }),
    ...(FORMAT === 'tiff' && { tiffFile: true }),



    resolutionXAxis: SCALE,
    resolutionYAxis: SCALE,
  };

  console.log(`Converting ${path.basename(pdfPath)} → ${FORMAT.toUpperCase()} (scale ${SCALE})`);
  try {
    // pdfToCairo converts pages; outputFile acts as prefix without extension
    const outputFile = path.join(outputDir, `${baseName}.${FORMAT}`);
    const res = await poppler.pdfToCairo(pdfPath, outputFile, opts);
    if (res) {
      // res is array of generated filenames
    }
    console.log(`✔ Converted ${baseName}`);
  } catch (err) {
    console.error(`✖ Failed converting ${baseName}:`, err.message);
  }
}

/**
 * Iterate over PDFs in inputDir and convert each.
 */
async function processPdfs() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory '${inputDir}' does not exist.`);
    console.log('Creating it now…');
    fs.mkdirSync(inputDir, { recursive: true });
    console.log('Add PDF files to split and run the command again.');
    return;
  }

  const files = fs.readdirSync(inputDir).filter((file) => path.extname(file).toLowerCase() === '.pdf');
  if (!files.length) {
    console.log('No PDF files found to split.');
    return;
  }

  for (const file of files) {
    const absolutePath = path.join(inputDir, file);
    await convertPdfToImages(absolutePath);
  }
  console.log('PDF splitting complete!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Reading PDFs from: ${inputDir}`);
  console.log(`Writing page images to: ${outputDir}\n`);
  if (POPPLER_PATH) {
    console.log(`Using Poppler binaries from: ${POPPLER_PATH}`);
  }
  console.log('Note: node-poppler requires Poppler binaries installed and reachable in PATH.');
  processPdfs();
}
