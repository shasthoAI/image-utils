import fs from 'fs';
import path from 'path';

class JSONAdapter {
  constructor(jsonPath) {
    this.jsonPath = jsonPath;
    this.data = this.loadData();
    // Cache for performance
    this._lastSave = 0;
    this._saveInterval = 100; // Save at most every 100ms
  }

  loadData() {
    try {
      if (fs.existsSync(this.jsonPath)) {
        const content = fs.readFileSync(this.jsonPath, 'utf8');
        const parsed = JSON.parse(content);
        // Ensure we have the expected structure
        return {
          processedFiles: parsed.processedFiles || [],
          operationHistory: parsed.operationHistory || []
        };
      }
    } catch (error) {
      console.warn('⚠️  JSON database corrupted, starting fresh:', error.message);
    }
    return {
      processedFiles: [],
      operationHistory: []
    };
  }

  saveData() {
    const now = Date.now();
    // Throttle saves for performance
    if (now - this._lastSave < this._saveInterval) {
      return;
    }
    
    try {
      const dir = path.dirname(this.jsonPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Atomic write with backup
      const tempPath = this.jsonPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2));
      fs.renameSync(tempPath, this.jsonPath);
      this._lastSave = now;
    } catch (error) {
      console.error('⚠️  Failed to save JSON database:', error.message);
    }
  }

  async insertProcessedFile(data) {
    this.data.processedFiles.push(data);
    this.saveData();
    return data;
  }

  async insertOperationHistory(data) {
    this.data.operationHistory.push(data);
    this.saveData();
    return data;
  }

  async getProcessedFiles(limit = 100) {
    return this.data.processedFiles.slice(-limit).reverse();
  }

  async getOperationHistory(limit = 50) {
    return this.data.operationHistory.slice(-limit).reverse();
  }

  forceSave() {
    // Force save regardless of throttling
    this._lastSave = 0;
    this.saveData();
  }

  async close() {
    // Ensure data is saved on close
    this.forceSave();
  }
}

class BrowserStorageAdapter {
  constructor(storagePrefix = 'imageUtils') {
    this.storagePrefix = storagePrefix;
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
  }

  checkIndexedDBSupport() {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  async insertProcessedFile(data) {
    if (this.isIndexedDBSupported) {
      return this.insertToIndexedDB('processedFiles', data);
    } else {
      return this.insertToLocalStorage('processedFiles', data);
    }
  }

  async insertOperationHistory(data) {
    if (this.isIndexedDBSupported) {
      return this.insertToIndexedDB('operationHistory', data);
    } else {
      return this.insertToLocalStorage('operationHistory', data);
    }
  }

  async getProcessedFiles(limit = 100) {
    if (this.isIndexedDBSupported) {
      return this.getFromIndexedDB('processedFiles', limit);
    } else {
      return this.getFromLocalStorage('processedFiles', limit);
    }
  }

  async getOperationHistory(limit = 50) {
    if (this.isIndexedDBSupported) {
      return this.getFromIndexedDB('operationHistory', limit);
    } else {
      return this.getFromLocalStorage('operationHistory', limit);
    }
  }

  // IndexedDB methods
  async insertToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.storagePrefix}DB`, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const addRequest = store.add(data);
        
        addRequest.onsuccess = () => resolve(data);
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('processedFiles')) {
          db.createObjectStore('processedFiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('operationHistory')) {
          db.createObjectStore('operationHistory', { keyPath: 'id' });
        }
      };
    });
  }

  async getFromIndexedDB(storeName, limit) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.storagePrefix}DB`, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const results = getAllRequest.result.slice(-limit).reverse();
          resolve(results);
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  // LocalStorage methods
  insertToLocalStorage(storeName, data) {
    const key = `${this.storagePrefix}_${storeName}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(data);
    localStorage.setItem(key, JSON.stringify(existing));
    return data;
  }

  getFromLocalStorage(storeName, limit) {
    const key = `${this.storagePrefix}_${storeName}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    return existing.slice(-limit).reverse();
  }

  async close() {
    // No-op for browser storage
  }
}

export { JSONAdapter, BrowserStorageAdapter };