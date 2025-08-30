import { contextBridge, ipcRenderer } from 'electron';

// Expose limited window controls to renderer
try {
  contextBridge.exposeInMainWorld('appWindow', {
    minimize: () => ipcRenderer.send('app-window:minimize'),
    maximizeOrRestore: () => ipcRenderer.send('app-window:max-toggle'),
    close: () => ipcRenderer.send('app-window:close'),
  });
} catch {}

// Mark DOM for Electron-specific styling once DOM is ready
try {
  if (document.documentElement) {
    document.documentElement.classList.add('electron');
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('electron');
    });
  }
} catch {}
