import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// -----------------------------------------------------------------------------
// Directory configuration (relative to project root)
// -----------------------------------------------------------------------------
// Images to be split should be placed in `input/split`.
// Generated parts will be written to `output/split`.
// -----------------------------------------------------------------------------
const projectRoot = process.cwd();
const inputDir = path.resolve(projectRoot, 'input', 'split');
const outputDir = path.resolve(projectRoot, 'output', 'split');

// -----------------------------------------------------------------------------
// Configuration via CLI flags or .env
//   --parts=<n>   number of horizontal slices (default 6)
//   --top=<n>     pixel offset from top before cropping (default 0)
//   --height=<n>  height of each slice (default full image height)
// -----------------------------------------------------------------------------
const cliArgs = process.argv.slice(2);
const getArg = (flag) => {
  const arg = cliArgs.find((a) => a.startsWith(flag));
  if (!arg) return undefined;
  const [, value] = arg.split('=');
  return value;
};

const PARTS = parseInt(getArg('--parts') || process.env.PARTS || '6', 10);
const TOP = parseInt(getArg('--top') || process.env.TOP || '0', 10);
const CROP_HEIGHT = parseInt(getArg('--height') || process.env.HEIGHT || '0', 10);

// -----------------------------------------------------------------------------
// Setup – ensure output directory exists
// -----------------------------------------------------------------------------
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

/**
 * Split an image horizontally into N equal parts.
 * @param {string} inputPath Absolute path to the input image
 * @param {string} outputBaseName Base name to use for output files
 * @param {string} outputDir Output directory (optional, defaults to same as input)
 * @param {number} parts Number of horizontal splits (default 6)
 */
export async function splitImageHorizontally(inputPath, outputBaseName, outputDir = null, parts = PARTS, topOffset = TOP, sliceHeight = CROP_HEIGHT) {
  const metadata = await sharp(inputPath).metadata();
  const { width, height, format } = metadata;
  const partWidth = Math.floor(width / parts);
  
  // Use provided output directory or default to same as input
  const finalOutputDir = outputDir || path.dirname(inputPath);

  console.log(`Splitting ${path.basename(inputPath)} → ${parts} parts`);
  console.log(`Crop: top=${topOffset}px height=${sliceHeight || height - topOffset}px`);

  for (let i = 0; i < parts; i++) {
    const left = i * partWidth;
    const outputPath = path.join(
      finalOutputDir,
      `${outputBaseName}_part${i + 1}.${format}`,
    );

    await sharp(inputPath)
      .extract({ left, top: topOffset, width: partWidth, height: sliceHeight || (height - topOffset) })
      .toFile(outputPath);
  }
}

/**
 * Iterate over images in `inputDir` and split each.
 */
export async function processImages(sourceDir = inputDir, outputDir = null) {
  const finalInputDir = sourceDir || inputDir;
  const finalOutputDir = outputDir || outputDir || path.resolve(projectRoot, 'output', 'split');
  
  if (!fs.existsSync(finalInputDir)) {
    console.error(`Input directory '${finalInputDir}' does not exist.`);
    console.log('Creating it now…');
    fs.mkdirSync(finalInputDir, { recursive: true });
    console.log('Add images to split and run the command again.');
    return;
  }

  if (!fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }

  const files = fs.readdirSync(finalInputDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff'].includes(ext);
  });
  if (!files.length) {
    console.log('No images found to split.');
    return;
  }

  for (const file of files) {
    const absolutePath = path.join(finalInputDir, file);
    const baseName = path.basename(file, path.extname(file));
    await splitImageHorizontally(absolutePath, baseName, finalOutputDir);
  }
  console.log('Splitting complete!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // If executed directly via `node src/splitter.js`
  console.log(`Reading images from: ${inputDir}`);
  console.log(`Writing split images to: ${outputDir}\n`);
  processImages();
}
