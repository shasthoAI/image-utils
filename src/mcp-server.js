#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { compressImageFile, compressImages, setCompressionConfig } from './compressor.js';
import { splitImageHorizontally } from './splitter.js';
import { convertPdfToImages } from './pdf_splitter.js';

class ImageUtilsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'image-utils',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'compress_image',
            description: 'Compress a single image file with various quality levels and format options',
            inputSchema: {
              type: 'object',
              properties: {
                inputPath: {
                  type: 'string',
                  description: 'Path to the input image file',
                },
                outputPath: {
                  type: 'string',
                  description: 'Path for the output compressed image (optional)',
                },
                compressionLevel: {
                  type: 'string',
                  enum: ['medium', 'high', 'extreme', 'png-optimized'],
                  description: 'Compression quality level',
                  default: 'medium',
                },
                convertToWebP: {
                  type: 'boolean',
                  description: 'Convert image to WebP format',
                  default: false,
                },
                grayscale: {
                  type: 'boolean',
                  description: 'Apply grayscale filter',
                  default: false,
                },
              },
              required: ['inputPath'],
            },
          },
          {
            name: 'compress_images_batch',
            description: 'Compress all images in a directory recursively',
            inputSchema: {
              type: 'object',
              properties: {
                sourceDir: {
                  type: 'string',
                  description: 'Source directory containing images to compress',
                },
                outputDir: {
                  type: 'string',
                  description: 'Output directory for compressed images',
                },
                compressionLevel: {
                  type: 'string',
                  enum: ['medium', 'high', 'extreme', 'png-optimized'],
                  description: 'Compression quality level',
                  default: 'medium',
                },
                convertToWebP: {
                  type: 'boolean',
                  description: 'Convert images to WebP format',
                  default: false,
                },
                grayscale: {
                  type: 'boolean',
                  description: 'Apply grayscale filter',
                  default: false,
                },
              },
              required: ['sourceDir', 'outputDir'],
            },
          },
          {
            name: 'split_image',
            description: 'Split an image horizontally into multiple parts',
            inputSchema: {
              type: 'object',
              properties: {
                inputPath: {
                  type: 'string',
                  description: 'Path to the input image file',
                },
                outputDir: {
                  type: 'string',
                  description: 'Output directory for split image parts (optional)',
                },
                parts: {
                  type: 'integer',
                  description: 'Number of horizontal parts to split into',
                  default: 6,
                  minimum: 2,
                  maximum: 20,
                },
                topOffset: {
                  type: 'integer',
                  description: 'Pixel offset from top before cropping',
                  default: 0,
                  minimum: 0,
                },
                sliceHeight: {
                  type: 'integer',
                  description: 'Height of each slice in pixels (0 for auto)',
                  default: 0,
                  minimum: 0,
                },
              },
              required: ['inputPath'],
            },
          },
          {
            name: 'convert_pdf_to_images',
            description: 'Convert PDF pages to image files',
            inputSchema: {
              type: 'object',
              properties: {
                pdfPath: {
                  type: 'string',
                  description: 'Path to the PDF file',
                },
                outputDir: {
                  type: 'string',
                  description: 'Output directory for converted images (optional)',
                },
                format: {
                  type: 'string',
                  enum: ['png', 'jpeg', 'tiff'],
                  description: 'Output image format',
                  default: 'png',
                },
                scale: {
                  type: 'integer',
                  description: 'DPI scaling factor for output quality',
                  default: 150,
                  minimum: 50,
                  maximum: 600,
                },
              },
              required: ['pdfPath'],
            },
          },
          {
            name: 'get_image_info',
            description: 'Get metadata and information about an image file',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the image file',
                },
              },
              required: ['imagePath'],
            },
          },
          {
            name: 'list_supported_formats',
            description: 'List all supported image formats for compression and processing',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'compress_image':
            return await this.handleCompressImage(args);
          case 'compress_images_batch':
            return await this.handleCompressImagesBatch(args);
          case 'split_image':
            return await this.handleSplitImage(args);
          case 'convert_pdf_to_images':
            return await this.handleConvertPdfToImages(args);
          case 'get_image_info':
            return await this.handleGetImageInfo(args);
          case 'list_supported_formats':
            return await this.handleListSupportedFormats();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error.message}`
        );
      }
    });
  }

  async handleCompressImage(args) {
    const { inputPath, outputPath, compressionLevel = 'medium', convertToWebP = false, grayscale = false } = args;

    if (!fs.existsSync(inputPath)) {
      throw new McpError(ErrorCode.InvalidRequest, `Input file does not exist: ${inputPath}`);
    }

    const stats = fs.statSync(inputPath);
    if (!stats.isFile()) {
      throw new McpError(ErrorCode.InvalidRequest, `Input path is not a file: ${inputPath}`);
    }

    const ext = path.extname(inputPath).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'];
    if (!supportedFormats.includes(ext)) {
      throw new McpError(ErrorCode.InvalidRequest, `Unsupported image format: ${ext}`);
    }

    // Set compression configuration
    setCompressionConfig({
      compressionLevel,
      convertToWebP,
      grayscale,
      pngOptimized: compressionLevel === 'png-optimized'
    });

    // Generate output path if not provided
    let finalOutputPath = outputPath;
    if (!finalOutputPath) {
      const dir = path.dirname(inputPath);
      const baseName = path.basename(inputPath, ext);
      const suffix = convertToWebP ? '-compressed.webp' : `-compressed${ext}`;
      finalOutputPath = path.join(dir, `${baseName}${suffix}`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = stats.size;
    const success = await compressImageFile(inputPath, finalOutputPath, ext);
    
    if (success && fs.existsSync(finalOutputPath)) {
      const compressedSize = fs.statSync(finalOutputPath).size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully compressed image!\n\nInput: ${inputPath}\nOutput: ${finalOutputPath}\nOriginal size: ${(originalSize / 1024).toFixed(2)} KB\nCompressed size: ${(compressedSize / 1024).toFixed(2)} KB\nCompression ratio: ${compressionRatio}%\nSettings: ${compressionLevel}${convertToWebP ? ', WebP conversion' : ''}${grayscale ? ', grayscale' : ''}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Image compression was skipped (would have increased file size) or failed.\nInput: ${inputPath}`,
          },
        ],
      };
    }
  }

  async handleCompressImagesBatch(args) {
    const { sourceDir, outputDir, compressionLevel = 'medium', convertToWebP = false, grayscale = false } = args;

    if (!fs.existsSync(sourceDir)) {
      throw new McpError(ErrorCode.InvalidRequest, `Source directory does not exist: ${sourceDir}`);
    }

    const stats = fs.statSync(sourceDir);
    if (!stats.isDirectory()) {
      throw new McpError(ErrorCode.InvalidRequest, `Source path is not a directory: ${sourceDir}`);
    }

    // Set compression configuration
    setCompressionConfig({
      compressionLevel,
      convertToWebP,
      grayscale,
      pngOptimized: compressionLevel === 'png-optimized'
    });

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await compressImages(sourceDir, outputDir);

    // Count processed files
    const processedFiles = this.countImageFiles(outputDir);
    
    return {
      content: [
        {
          type: 'text',
          text: `Batch compression completed!\n\nSource: ${sourceDir}\nOutput: ${outputDir}\nProcessed files: ${processedFiles}\nSettings: ${compressionLevel}${convertToWebP ? ', WebP conversion' : ''}${grayscale ? ', grayscale' : ''}`,
        },
      ],
    };
  }

  async handleSplitImage(args) {
    const { inputPath, outputDir, parts = 6, topOffset = 0, sliceHeight = 0 } = args;

    if (!fs.existsSync(inputPath)) {
      throw new McpError(ErrorCode.InvalidRequest, `Input file does not exist: ${inputPath}`);
    }

    const stats = fs.statSync(inputPath);
    if (!stats.isFile()) {
      throw new McpError(ErrorCode.InvalidRequest, `Input path is not a file: ${inputPath}`);
    }

    const ext = path.extname(inputPath).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'];
    if (!supportedFormats.includes(ext)) {
      throw new McpError(ErrorCode.InvalidRequest, `Unsupported image format: ${ext}`);
    }

    const baseName = path.basename(inputPath, ext);
    const finalOutputDir = outputDir || path.dirname(inputPath);

    // Ensure output directory exists
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    await splitImageHorizontally(inputPath, baseName, finalOutputDir, parts, topOffset, sliceHeight);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully split image into ${parts} parts!\n\nInput: ${inputPath}\nOutput directory: ${finalOutputDir}\nParts: ${parts}\nTop offset: ${topOffset}px\nSlice height: ${sliceHeight || 'auto'}px`,
        },
      ],
    };
  }

  async handleConvertPdfToImages(args) {
    const { pdfPath, outputDir, format = 'png', scale = 150 } = args;

    if (!fs.existsSync(pdfPath)) {
      throw new McpError(ErrorCode.InvalidRequest, `PDF file does not exist: ${pdfPath}`);
    }

    const stats = fs.statSync(pdfPath);
    if (!stats.isFile()) {
      throw new McpError(ErrorCode.InvalidRequest, `PDF path is not a file: ${pdfPath}`);
    }

    const ext = path.extname(pdfPath).toLowerCase();
    if (ext !== '.pdf') {
      throw new McpError(ErrorCode.InvalidRequest, `File is not a PDF: ${pdfPath}`);
    }

    const finalOutputDir = outputDir || path.dirname(pdfPath);

    // Ensure output directory exists
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    // Set global PDF conversion options
    process.argv = ['node', 'pdf_splitter.js', `--format=${format}`, `--scale=${scale}`];

    await convertPdfToImages(pdfPath, finalOutputDir);

    // Count generated images
    const generatedFiles = this.countImageFiles(finalOutputDir);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully converted PDF to images!\n\nInput: ${pdfPath}\nOutput directory: ${finalOutputDir}\nFormat: ${format}\nScale: ${scale} DPI\nGenerated files: ${generatedFiles}`,
        },
      ],
    };
  }

  async handleGetImageInfo(args) {
    const { imagePath } = args;

    if (!fs.existsSync(imagePath)) {
      throw new McpError(ErrorCode.InvalidRequest, `Image file does not exist: ${imagePath}`);
    }

    const stats = fs.statSync(imagePath);
    if (!stats.isFile()) {
      throw new McpError(ErrorCode.InvalidRequest, `Image path is not a file: ${imagePath}`);
    }

    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(imagePath).metadata();
      
      const fileSize = stats.size;
      const fileSizeKB = (fileSize / 1024).toFixed(2);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

      return {
        content: [
          {
            type: 'text',
            text: `Image Information:\n\nFile: ${imagePath}\nFormat: ${metadata.format}\nWidth: ${metadata.width}px\nHeight: ${metadata.height}px\nChannels: ${metadata.channels}\nColor space: ${metadata.space}\nFile size: ${fileSizeKB} KB (${fileSizeMB} MB)\nDensity: ${metadata.density || 'unknown'} DPI\nHas alpha: ${metadata.hasAlpha || false}\nHas profile: ${metadata.hasProfile || false}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to read image metadata: ${error.message}`);
    }
  }

  async handleListSupportedFormats() {
    const formats = {
      input: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'],
      output: ['.jpg', '.jpeg', '.png', '.webp'],
      pdf: ['.pdf'],
    };

    return {
      content: [
        {
          type: 'text',
          text: `Supported Image Formats:\n\nInput formats: ${formats.input.join(', ')}\nOutput formats: ${formats.output.join(', ')}\nPDF support: ${formats.pdf.join(', ')}\n\nCompression levels: medium, high, extreme, png-optimized\nSpecial features: WebP conversion, grayscale filter, batch processing, image splitting, PDF to image conversion`,
        },
      ],
    };
  }

  countImageFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    const files = fs.readdirSync(dir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff'];
    return files.filter(file => imageExtensions.includes(path.extname(file).toLowerCase())).length;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Image Utils MCP server running on stdio');
  }
}

const server = new ImageUtilsMCPServer();
server.run().catch(console.error);
