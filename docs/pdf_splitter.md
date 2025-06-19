Part of the **Image Utils** suite by Shastho Limited ([MIT License](https://opensource.org/licenses/MIT)) – [GitHub Repository](https://github.com/shasthoAI/image-utils)

# PDF Splitter Service – Detailed Documentation

Convert every page of a PDF into standalone images (PNG/JPEG/TIFF) using Poppler’s `pdftocairo` via the **node-poppler** wrapper.

---

## 1. Directory Structure
```
project-root/
├── input/
│   └── pdf/          # PLACE PDFs to convert here
├── output/
│   └── pdf/          # PAGE IMAGES are written here
└── src/
    └── pdf_splitter.js
```

## 2. Dependencies
* **Runtime:** Node.js ≥ 18 (node-poppler targets ≥ 18; ≥ 20 recommended).
* **Native:** Poppler binaries (provide `pdftocairo`).
  * **macOS:** `brew install poppler`
  * **Debian/Ubuntu:** `sudo apt-get install poppler-utils`
  * **Windows:** Download pre-built releases and add the `bin/` folder to `PATH`.

> The script will error with "Unable to find Poppler binaries" if the tools are not reachable.

## 3. Installation
```bash
npm install        # installs node-poppler and other JS deps
```

## 4. Usage
### NPM Script (recommended)
```bash
npm run split:pdf                # defaults: PNG @150 PPI
npm run split:pdf -- --format=jpeg --scale=300
```

### Direct CLI
```bash
node src/pdf_splitter.js [--format=<png|jpeg|tiff>] [--scale=<dpi>] [--poppler-path=<dir>]
```

| Flag / ENV                | Default | Description |
|---------------------------|---------|-------------|
| `--format`, `PDF_CONVERT_FORMAT` | `png` | Output image format. |
| `--scale`, `PDF_CONVERT_SCALE`   | `150` | Resolution (DPI); maps to Poppler `-r` option. |
| `--poppler-path`, `POPPLER_PATH` | *auto* | Explicit directory containing Poppler binaries if not on `PATH`. |

## 5. Output Naming
`pdftocairo` produces one file per page:  
`<basename>-1.png`, `<basename>-2.png`, … stored inside `output/pdf/`.
If `--format=jpeg`, extension becomes `.jpg` (handled internally).

## 6. Examples
```bash
# Convert all PDFs to high-res JPEG
npm run split:pdf -- --format=jpeg --scale=300

# Poppler binaries installed in a custom location
npm run split:pdf -- --poppler-path="/usr/local/opt/poppler/bin"
```

## 7. Troubleshooting
* **"Unable to find darwin Poppler binaries"** – Install Poppler or set `POPPLER_PATH`.
* **"Invalid option" errors** – Ensure you’re using node-poppler ≥ 8 (check `package.json`).
* **No images generated** – Verify `output/pdf` is writable and the input file is a valid PDF.

## 8. Integration Notes
* Works independently of the image `splitter.js`; you can combine both utilities in build pipelines.
* Generated images can be further compressed using `compressor.js` for storage or web delivery.

## 9. License
Licensed under the MIT License – see the [LICENSE](../../LICENSE) file.

---
### Connect with Shastho Limited
[Website](https://shastho.ai) • [GitHub](https://github.com/shasthoAI) • [LinkedIn](https://www.linkedin.com/company/shastho)
