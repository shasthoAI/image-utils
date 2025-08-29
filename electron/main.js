// Electron main process entry (ESM)
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function waitForServer(url, { retries = 50, delayMs = 200 } = {}) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          res.resume();
          resolve(true);
        } else {
          res.resume();
          retry();
        }
      });
      req.on('error', retry);
      function retry() {
        attempts += 1;
        if (attempts >= retries) return reject(new Error('Server not responding'));
        setTimeout(tryOnce, delayMs);
      }
    };
    tryOnce();
  });
}

// Start the existing Express server and load it in a BrowserWindow
async function createWindow() {
  // Set writable base directory for server/database
  process.env.IMAGE_UTILS_DATA_DIR = app.getPath('userData');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  const showMessage = async (html) => {
    win.once('ready-to-show', () => win.show());
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  };

  // Show initial placeholder immediately
  await showMessage('<!doctype html><html><body style="font-family:sans-serif;padding:20px">Starting server…</body></html>');

  // Resolve and import the web server module
  let startServer;
  try {
    const webServerPath = path.resolve(__dirname, '..', 'src', 'web-server.js');
    const webServerModule = await import(pathToFileURL(webServerPath).href);
    startServer = webServerModule.startServer;
  } catch (err) {
    await showMessage(`<!doctype html><html><body style="font-family:sans-serif;padding:20px;color:#b00020">Failed loading server module.<br><pre style="white-space:pre-wrap">${String(err)}</pre></body></html>`);
    return;
  }

  // Use port 0 to pick an available port
  let appUrl = '';
  try {
    const { port } = await startServer(0);
    appUrl = `http://localhost:${port}`;
  } catch (err) {
    await showMessage(`<!doctype html><html><body style="font-family:sans-serif;padding:20px;color:#b00020">Server failed to start.<br><pre style="white-space:pre-wrap">${String(err)}</pre></body></html>`);
    return;
  }

  // Wait for server to respond, then load app URL
  try {
    await waitForServer(appUrl, { retries: 100, delayMs: 100 });
    await win.loadURL(appUrl);
  } catch (err) {
    await showMessage(`<!doctype html><html><body style=\"font-family:sans-serif;padding:20px;color:#b00020\">Server not responding.<br><pre style=\"white-space:pre-wrap\">${String(err)}</pre></body></html>`);
  }

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Log failed loads for visibility during packaging
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const all = BrowserWindow.getAllWindows();
    if (all.length) {
      const win = all[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
