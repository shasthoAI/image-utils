# Image Utilities

Lightweight Node.js tools for common image tasks.


A collection of lightweight image-handling utilities written in Node.js.

* **Compressor** – Compresses and optimises images for web/mobile.
* **Splitter** – Cuts large screenshots into equal horizontal slices.

Detailed documentation for each service lives in the `docs/` directory.

## Services

| Service | Purpose | Detailed Docs |
|---------|---------|---------------|
| Compressor | Multi-level image compression | [docs/compressor.md](docs/compressor.md) |
| Splitter | Horizontal screenshot splitting | [docs/splitter.md](docs/splitter.md) |

---

For setup, usage, and examples, see the individual service docs above.


- **Multi-level compression** - Two-pass compression for maximum file size reduction
- **Format-specific optimizations** - Specialized settings for JPEG, PNG, and WebP formats
- **Multiple compression levels** - Choose from medium, high, or extreme compression
- **PNG optimization** - Special mode for PNG files optimized for mobile apps
- **WebP conversion** - Option to convert images to WebP for maximum compression
- **Grayscale option** - Convert images to grayscale for even smaller files
- **Metadata stripping** - All metadata is removed to reduce file size
- **Directory structure preservation** - Maintains your folder structure in the output

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/compressor.git
cd compressor
```

2. Install dependencies:
```bash
npm install
```

## Usage

 Directory Structure

Place images to compress inside `input/compress`. Compressed images will be written to `output/compress`, preserving your original folder structure.

 Command Line Options

Run the compressor with various options:

```bash
node src/compressor.js [options]
```

Options:
- `--medium` - Medium compression (default)
- `--high` - High compression
- `--extreme` - Extreme compression
- `--png-optimized` - Special optimization for PNG files (best for mobile apps)
- `--webp` - Convert all images to WebP format
- `--grayscale` - Convert images to grayscale

 NPM Scripts

For convenience, you can use the following npm scripts:

```bash
npm run compress           # Default compression
npm run compress:medium    # Medium compression
npm run compress:high      # High compression
npm run compress:extreme   # Extreme compression
npm run compress:png       # PNG-optimized mode
npm run compress:webp      # WebP conversion
npm run compress:png-extreme # PNG-optimized with extreme settings
```

## Compression Settings

 Medium Compression
- JPEG Quality: 60
- PNG Compression: Level 9, 256 colors
- Image Resize: 1024px max width
- WebP Quality: 75

 High Compression
- JPEG Quality: 40
- PNG Compression: Level 9, 128 colors
- Image Resize: 800px max width
- WebP Quality: 50

 Extreme Compression
- JPEG Quality: 20
- PNG Compression: Level 9, 64 colors
- Image Resize: 600px max width
- WebP Quality: 30

 PNG-Optimized Mode
- PNG Compression: Level 9
- Adaptive filtering
- Color palette optimization
- Dithering for better visual quality
- Specialized for mobile app compatibility

## Examples

 Basic Compression
```bash
npm run compress
```

 High Compression for Web
```bash
npm run compress:high
```

 Maximum Compression with WebP Conversion
```bash
npm run compress:extreme --webp
```

 Mobile App PNG Optimization
```bash
npm run compress:png
```

 Extreme PNG Optimization for Mobile
```bash
npm run compress:png-extreme
```

 Convert to Grayscale
```bash
node src/compressor.js --grayscale
```

## Compression Results

Example compression results:

| Image Type | Original Size | Compressed Size | Reduction |
|------------|---------------|-----------------|-----------|
| Large PNG  | 2MB           | 64KB            | 97%       |
| Screenshot | 2.1MB         | 131KB           | 94%       |
| JPEG Photo | 189KB         | 12KB            | 94%       |
| Logo PNG   | 50KB          | 7KB             | 86%       |

## Notes

- The compressor will skip files that already exist in the output directory
- If compression would increase file size, the original file is kept
- WebP format provides the smallest file sizes but may not be compatible with all platforms
- PNG-optimized mode is recommended for mobile app development

## Requirements

- Node.js 14.x or higher
- Sharp image processing library

## License

ISC
