# Image Utils

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of lightweight Node.js utilities for common image processing tasks, developed by Shastho Limited.

This repository provides tools for image compression and splitting, designed to be simple, efficient, and easy to integrate into your workflows.

## Services

Detailed documentation for each service can be found in the `docs/` directory.

| Service     | Description                                                                 | Documentation                                  |
|-------------|-----------------------------------------------------------------------------|------------------------------------------------|
| Compressor  | Optimizes images with multiple compression levels, WebP conversion, and more. | [docs/compressor.md](docs/compressor.md)       |
| Splitter    | Slices large images or screenshots into a specified number of equal parts.  | [docs/splitter.md](docs/splitter.md)          |
| PDF Splitter | Converts each page of a PDF into PNG/JPEG/TIFF images. | [docs/pdf_splitter.md](docs/pdf_splitter.md) |

## Getting Started

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/shasthoAI/image-utils.git
    cd image-utils
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Explore the services:**
    Refer to the documentation in the `docs/` folder for detailed usage instructions for each utility.

### Global Installation (Recommended)

To use the CLI tools from anywhere on your computer:

1.  **Install globally:**
    ```bash
    npm install -g .
    ```

2.  **Use from any directory:**
    ```bash
    # Split a PDF in your current directory
    pdf-split document.pdf
    
    # Compress images in current directory
    image-compress ./photos --high
    
    # Split an image into parts
    image-split screenshot.png --parts 4
    ```

## CLI Usage

Once installed globally, you can use these commands from any folder:

### Image Compression
```bash
image-compress [file/directory] [options]

# Examples:
image-compress photo.jpg --high              # Compress single file
image-compress ./photos --webp               # Convert folder to WebP
image-compress image.png --output ./out      # Compress to specific folder
```

### Image Splitting
```bash
image-split [file/directory] [options]

# Examples:
image-split screenshot.png                   # Split into 6 parts (default)
image-split image.png --parts 4              # Split into 4 parts
image-split ./screenshots --output ./parts   # Process folder
```

### PDF Splitting
```bash
pdf-split [file/directory] [options]

# Examples:
pdf-split document.pdf                       # Split PDF to PNG images
pdf-split report.pdf --format jpeg           # Split to JPEG format
pdf-split ./pdfs --output ./pages            # Process folder
```

## Traditional Input/Output Folder Usage

The tools also support the traditional input/output folder workflow. When run without arguments, they will:
- Look for files in `input/compress`, `input/split`, or `input/pdf` folders
- Output processed files to `output/compress`, `output/split`, or `output/pdf` folders

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs, feature requests, or improvements.

## Notes

- The compressor will skip files that already exist in the output directory
- If compression would increase file size, the original file is kept
- WebP format provides the smallest file sizes but may not be compatible with all platforms
- PNG-optimized mode is recommended for mobile app development

## Requirements

- Node.js 14.x or higher
- Sharp image processing library


---
---

### Connect with Shastho Limited

[Website](https://shastho.ai) | [GitHub](https://github.com/shasthoAI) | [LinkedIn](https://www.linkedin.com/company/shastho) | [Twitter](https://twitter.com/shastho_ai) | [Facebook](https://www.facebook.com/shasthoAI/) | [Instagram](https://www.instagram.com/shastho_ai) | [YouTube](https://www.youtube.com/@shasthoai)

This project is maintained by **Shastho Limited** and licensed under the **MIT License**.
