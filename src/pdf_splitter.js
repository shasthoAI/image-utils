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
// Use writable base directory for Electron packaged apps
const BASE_DIR = process.env.IMAGE_UTILS_DATA_DIR || process.cwd();
const projectRoot = BASE_DIR;
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
 * @param {string} outputDir Output directory (optional, defaults to same as input)
 */
export async function convertPdfToImages(pdfPath, outputDir = null, options = {}) {
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const poppler = POPPLER_PATH ? new Poppler(POPPLER_PATH) : new Poppler();
  const fmt = (options.format || FORMAT || 'png').toLowerCase();
  const scale = parseInt(options.scale || SCALE || 150, 10);
  const opts = {
    // map format to node-poppler flag
    ...(fmt === 'png' && { pngFile: true }),
    ...(fmt === 'jpeg' && { jpegFile: true }),
    ...(fmt === 'jpg' && { jpegFile: true }),
    ...(fmt === 'tiff' && { tiffFile: true }),



    resolutionXAxis: scale,
    resolutionYAxis: scale,
  };

  console.log(`Converting ${path.basename(pdfPath)} → ${fmt.toUpperCase()} (scale ${scale})`);
  
  const finalOutputDir = outputDir || path.dirname(pdfPath);
  
  // Ensure output directory exists
  if (!fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }
  
  try {
    // pdfToCairo converts pages; outputFile acts as prefix without extension
    const outputFile = path.join(finalOutputDir, `${baseName}.${fmt}`);
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
export async function processPdfs(sourceDir = null, outputDir = null) {
  const finalInputDir = sourceDir || inputDir;
  const finalOutputDir = outputDir || (sourceDir ? sourceDir : path.resolve(projectRoot, 'output', 'pdf'));
  
  if (!fs.existsSync(finalInputDir)) {
    console.error(`Input directory '${finalInputDir}' does not exist.`);
    console.log('Creating it now…');
    fs.mkdirSync(finalInputDir, { recursive: true });
    console.log('Add PDF files to split and run the command again.');
    return;
  }

  if (finalInputDir !== finalOutputDir && !fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }

  const files = fs.readdirSync(finalInputDir).filter((file) => path.extname(file).toLowerCase() === '.pdf');
  if (!files.length) {
    console.log('No PDF files found to split.');
    return;
  }

  for (const file of files) {
    const absolutePath = path.join(finalInputDir, file);
    await convertPdfToImages(absolutePath, finalOutputDir);
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
