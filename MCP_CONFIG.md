# Image Utils MCP Server Configuration

## Installation

First, install the MCP SDK dependency:

```bash
npm install @modelcontextprotocol/sdk
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file:

### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
### Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "image-utils": {
      "command": "node",
      "args": ["/absolute/path/to/compressor/src/mcp-server.js"],
      "cwd": "/absolute/path/to/compressor"
    }
  }
}
```

## Usage with VS Code MCP Extension

If you have an MCP extension for VS Code, add this to your settings:

```json
{
  "mcp.servers": {
    "image-utils": {
      "command": "node",
      "args": ["./src/mcp-server.js"],
      "cwd": "/absolute/path/to/compressor"
    }
  }
}
```

## Global Installation

For easier usage, you can install the package globally:

```bash
# Install globally
npm install -g .

# Then use the binary directly
image-utils-mcp
```

Then update your MCP client configuration to use the global binary:

```json
{
  "mcpServers": {
    "image-utils": {
      "command": "image-utils-mcp"
    }
  }
}
```

## Available Tools

The MCP server provides the following tools:

### 1. `compress_image`
Compress a single image file with various quality levels and format options.

**Parameters:**
- `inputPath` (required): Path to the input image file
- `outputPath` (optional): Path for the output compressed image
- `compressionLevel` (optional): "medium", "high", "extreme", or "png-optimized"
- `convertToWebP` (optional): Convert image to WebP format
- `grayscale` (optional): Apply grayscale filter

### 2. `compress_images_batch`
Compress all images in a directory recursively.

**Parameters:**
- `sourceDir` (required): Source directory containing images to compress
- `outputDir` (required): Output directory for compressed images
- `compressionLevel` (optional): "medium", "high", "extreme", or "png-optimized"
- `convertToWebP` (optional): Convert images to WebP format
- `grayscale` (optional): Apply grayscale filter

### 3. `split_image`
Split an image horizontally into multiple parts.

**Parameters:**
- `inputPath` (required): Path to the input image file
- `outputDir` (optional): Output directory for split image parts
- `parts` (optional): Number of horizontal parts to split into (default: 6)
- `topOffset` (optional): Pixel offset from top before cropping (default: 0)
- `sliceHeight` (optional): Height of each slice in pixels (0 for auto)

### 4. `convert_pdf_to_images`
Convert PDF pages to image files.

**Parameters:**
- `pdfPath` (required): Path to the PDF file
- `outputDir` (optional): Output directory for converted images
- `format` (optional): "png", "jpeg", or "tiff" (default: "png")
- `scale` (optional): DPI scaling factor for output quality (default: 150)

### 5. `get_image_info`
Get metadata and information about an image file.

**Parameters:**
- `imagePath` (required): Path to the image file

### 6. `list_supported_formats`
List all supported image formats for compression and processing.

## Example Usage in Claude

Once configured, you can ask Claude to use these tools:

"Compress the image at /path/to/my/photo.jpg with high compression and convert it to WebP format"

"Split this screenshot into 4 horizontal parts: /path/to/screenshot.png"

"Convert this PDF to PNG images with high quality: /path/to/document.pdf"

"Get detailed information about this image file: /path/to/image.jpg"

## Troubleshooting

1. **Permission Issues**: Make sure the MCP server script is executable:
   ```bash
   chmod +x src/mcp-server.js
   ```

2. **Module Not Found**: Ensure all dependencies are installed:
   ```bash
   npm install
   ```

3. **Path Issues**: Always use absolute paths in the MCP configuration

4. **Poppler Issues**: For PDF conversion, ensure Poppler is installed:
   - macOS: `brew install poppler`
   - Ubuntu: `sudo apt-get install poppler-utils`
   - Windows: Download from https://poppler.freedesktop.org/

## Development

To test the MCP server directly:

```bash
# Start the server
node src/mcp-server.js

# The server will wait for JSON-RPC messages on stdin
```

For debugging, you can add console.error() statements (they won't interfere with the JSON-RPC protocol).
