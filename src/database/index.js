import { JSONAdapter, BrowserStorageAdapter } from './adapters.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

class DatabaseManager {
  constructor(options = {}) {
    this.options = {
      jsonPath: options.jsonPath || path.join(process.cwd(), 'data', 'image-tools.json'),
      storagePrefix: options.storagePrefix || 'imageUtils',
      ...options
    };
    
    this.adapter = null;
    this.adapterType = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.adapter;

    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.adapter = new BrowserStorageAdapter(this.options.storagePrefix);
      this.adapterType = 'browser';
      console.log('📱 Database: Browser storage (IndexedDB/LocalStorage)');
    } else {
      // Node.js environment - use reliable JSON storage
      this.adapter = new JSONAdapter(this.options.jsonPath);
      this.adapterType = 'json';
      console.log(`📄 Database: JSON storage at ${this.options.jsonPath}`);
    }

    this.initialized = true;
    return this.adapter;
  }

  async logProcessedFile(originalPath, outputPath, operation, options = {}) {
    await this.initialize();
    
    const data = {
      id: uuidv4(),
      originalPath,
      outputPath,
      operation,
      settings: JSON.stringify(options.settings || {}),
      originalSize: options.originalSize,
      finalSize: options.finalSize,
      processedAt: Date.now(),
      metadata: JSON.stringify(options.metadata || {})
    };

    return await this.adapter.insertProcessedFile(data);
  }

  async logOperationHistory(operation, stats = {}) {
    await this.initialize();
    
    const data = {
      id: uuidv4(),
      operation,
      filesProcessed: stats.filesProcessed || 0,
      totalSizeBefore: stats.totalSizeBefore || 0,
      totalSizeAfter: stats.totalSizeAfter || 0,
      compressionRatio: stats.compressionRatio || '0%',
      executedAt: Date.now(),
      settings: JSON.stringify(stats.settings || {})
    };

    return await this.adapter.insertOperationHistory(data);
  }

  async getProcessedFiles(limit = 100) {
    await this.initialize();
    return await this.adapter.getProcessedFiles(limit);
  }

  async getOperationHistory(limit = 50) {
    await this.initialize();
    return await this.adapter.getOperationHistory(limit);
  }

  async getStats() {
    await this.initialize();
    
    const files = await this.adapter.getProcessedFiles(1000);
    const operations = await this.adapter.getOperationHistory(100);
    
    const totalFiles = files.length;
    const totalSizeBefore = files.reduce((sum, file) => sum + (file.originalSize || 0), 0);
    const totalSizeAfter = files.reduce((sum, file) => sum + (file.finalSize || 0), 0);
    const spaceSaved = totalSizeBefore - totalSizeAfter;
    const compressionRatio = totalSizeBefore > 0 ? ((spaceSaved / totalSizeBefore) * 100).toFixed(1) : '0';
    
    const operationCounts = operations.reduce((counts, op) => {
      counts[op.operation] = (counts[op.operation] || 0) + (op.filesProcessed || 1);
      return counts;
    }, {});

    return {
      adapter: this.adapterType,
      totalFiles,
      totalSizeBefore,
      totalSizeAfter,
      spaceSaved,
      compressionRatio: `${compressionRatio}%`,
      operationCounts,
      recentFiles: files.slice(0, 10),
      recentOperations: operations.slice(0, 5)
    };
  }

  async close() {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
      this.initialized = false;
    }
  }
}

// Singleton instance
let dbManager = null;

export function getDatabase(options = {}) {
  if (!dbManager) {
    dbManager = new DatabaseManager(options);
  }
  return dbManager;
}

export { DatabaseManager };