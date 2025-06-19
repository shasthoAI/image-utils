# Compressor Service – Detailed Documentation

A powerful multi-level image compression tool built with Node.js and Sharp. It dramatically reduces image file sizes while balancing quality and flexibility.

## 1. Directory Structure
```
project-root/
├── input/
│   └── compress/      # PLACE images to be compressed here
├── output/
│   └── compress/      # COMPRESSED images are written here
└── src/
    └── compressor.js  # main script
```

## 2. Installation
```bash
npm install    # installs sharp & other dependencies
```

## 3. Usage
### NPM Scripts
```bash
npm run compress             # default (medium) compression
npm run compress:medium      # explicit medium
npm run compress:high        # higher compression
npm run compress:extreme     # highest compression
npm run compress:png         # PNG-optimised mode (best for mobile apps)
npm run compress:png-extreme # PNG-optimised + extreme settings
npm run compress:webp        # convert every image to WebP
```

### CLI
```bash
node src/compressor.js [options]
```
Options:
* `--medium` *(default)*
* `--high`
* `--extreme`
* `--png-optimized` – specialised PNG pipeline
* `--webp` – convert output to WebP
* `--grayscale` – grayscale conversion

The script recursively traverses `input/compress`, preserves sub-folders, skips already-compressed files, and chooses the best of a two-pass compression.

## 4. Compression Levels
| Level | JPEG Quality | PNG Colours | Resize Width | WebP Quality |
|-------|--------------|-------------|--------------|--------------|
| medium | 60 | 256 | 1024px | 75 |
| high | 40 | 128 | 800px | 50 |
| extreme | 20 | 64 | 600px | 30 |
| png-optimised | (see code) | Mobile-focused palette & dithering |

## 5. Examples
```bash
# Maximum compression + WebP
node src/compressor.js --extreme --webp

# Special mobile-friendly PNG compression
npm run compress:png
```

## 6. Implementation Highlights
* **Two-pass pipeline** – runs an initial compression, then an additional optimisation selecting the smaller output.
* **Format-aware settings** – separate tuning for JPEG/PNG/WebP.
* **Recursive directory support** – keeps folder hierarchy intact.
* **Skip logic** – avoids recompressing existing outputs or enlarging files.

## 7. Requirements
* Node.js ≥ 14
* C/C++ build tools (for Sharp on some OSes)

## 8. License
ISC
