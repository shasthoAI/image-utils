# Quick Usage Guide

## Installation

```bash
npm install -g .
```

## Commands Available Globally

### 🖼️ Image Compression: `image-compress`

Compress images with various quality settings:

```bash
# Basic usage - compress in current directory
image-compress photo.jpg

# Compress with high compression
image-compress ./photos --high

# Convert to WebP format
image-compress image.png --webp

# Compress to specific output directory
image-compress ./images --output ./compressed --extreme
```

**Options:**
- `--medium` (default) - Balanced compression
- `--high` - Higher compression, smaller files
- `--extreme` - Maximum compression
- `--png-optimized` - Special PNG optimization for mobile apps
- `--webp` - Convert to WebP format
- `--grayscale` - Convert to grayscale
- `--output <dir>` - Specify output directory

### ✂️ Image Splitting: `image-split`

Split images horizontally into equal parts:

```bash
# Split image into 6 parts (default)
image-split screenshot.png

# Split into 4 parts
image-split image.png --parts 4

# Split with custom crop settings
image-split screenshot.png --top 100 --height 1200

# Process entire folder
image-split ./screenshots --output ./parts
```

**Options:**
- `--parts <n>` - Number of horizontal parts (default: 6)
- `--top <n>` - Pixel offset from top (default: 0)
- `--height <n>` - Height of each slice (default: full height)
- `--output <dir>` - Specify output directory

### 📄 PDF Splitting: `pdf-split`

Convert PDF pages to images:

```bash
# Split PDF to PNG images
pdf-split document.pdf

# Split to JPEG format
pdf-split report.pdf --format jpeg

# High resolution output
pdf-split document.pdf --scale 300

# Process all PDFs in folder
pdf-split ./documents --output ./pages
```

**Options:**
- `--format <format>` - Output format: png, jpeg, tiff (default: png)
- `--scale <n>` - DPI scaling factor (default: 150)
- `--output <dir>` - Specify output directory

## Real-World Examples

### Scenario 1: You have a PDF in `/Users/john/Documents/report.pdf`

```bash
cd /Users/john/Documents
pdf-split report.pdf
```
This will create PNG images like `report-1.png`, `report-2.png`, etc. in the same folder.

### Scenario 2: You have photos in `/Users/jane/Photos` that need compression

```bash
cd /Users/jane/Photos
image-compress . --high --output ./compressed
```
This will compress all images in the Photos folder and save them to a new `compressed` subfolder.

### Scenario 3: You have a long screenshot that needs to be split

```bash
cd /Users/bob/Screenshots
image-split long-screenshot.png --parts 3
```
This will create `long-screenshot_part1.png`, `long-screenshot_part2.png`, and `long-screenshot_part3.png`.

## Managing the Global Installation

```bash
# Update to latest version
npm run global:update

# Uninstall global package
npm run global:uninstall

# Reinstall global package
npm run global:install
```

## Fallback: Traditional Input/Output Folders

If you don't specify a file/directory, the tools will use the traditional workflow:
- Place files in `input/compress`, `input/split`, or `input/pdf`
- Processed files will appear in `output/compress`, `output/split`, or `output/pdf`

```bash
# This works from the project directory
image-compress    # Uses input/compress → output/compress
image-split       # Uses input/split → output/split
pdf-split         # Uses input/pdf → output/pdf
```
