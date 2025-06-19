Part of the **Image Utils** suite by Shastho Limited ([MIT License](https://opensource.org/licenses/MIT)) – [GitHub Repository](https://github.com/shasthoAI/image-utils)

# Splitter Service – Detailed Documentation

A flexible image **horizontal splitter** that divides large screenshots into equal-width slices. Supports per-run configuration via CLI flags or environment variables.

## 1. Directory Structure
```
project-root/
├── input/
│   └── split/        # PLACE images to be sliced here
├── output/
│   └── split/        # GENERATED slices are written here
└── src/
    └── splitter.js   # main script
```

## 2. Installation
All dependencies are shared with the compressor. Simply run:
```bash
npm install
```

## 3. Configuration & Usage

### CLI Flags
* `--parts=<n>`   – number of horizontal slices (default **6**)
* `--top=<px>`    – vertical offset from top before cropping (default **0**)
* `--height=<px>` – height of each slice (default: remaining height)

Example:
```bash
npm run split -- --parts=3 --top=100 --height=1200
```

### `.env` Variables (alternative)
Create a `.env` file and set any of:
```
PARTS=4
TOP=947
HEIGHT=3555
```
Then simply run:
```bash
npm run split
```
CLI values override `.env` values.

### NPM Script
```bash
npm run split          # uses .env or defaults
```

## 4. How It Works
1. Validates/creates `input/split` and `output/split`.
2. Reads each image (`jpg`, `png`, `webp`, etc.).
3. Calculates equal slice width: `width / parts`.
4. Crops each slice using Sharp’s `extract` with provided `top` & `height`.
5. Writes slices to `output/split` with names like `image_part1.png`.

## 5. Requirements
* Node.js ≥ 14
* Sharp native dependencies

## 6. License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

### Connect with Shastho Limited

[Website](https://shastho.ai) | [GitHub](https://github.com/shasthoAI) | [LinkedIn](https://www.linkedin.com/company/shastho) | [Twitter](https://twitter.com/shastho_ai) | [Facebook](https://www.facebook.com/shasthoAI/) | [Instagram](https://www.instagram.com/shastho_ai) | [YouTube](https://www.youtube.com/@shasthoai)

This project is maintained by **Shastho Limited** and licensed under the **MIT License**.


