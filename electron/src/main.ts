import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import http from 'node:http';
import { createClipboardWatcher } from './clipboard/watcher';
import { clipboardHistoryStore } from './clipboard/store';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;

function resolveHtmlPath() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }
  return path.join(__dirname, '../../renderer/dist/index.html');
}

async function waitForRendererReady(url: string, timeoutMs = 30000) {
  const { hostname, port } = new URL(url);
  const numericPort = Number(port);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const isListening = await new Promise<boolean>((resolve) => {
      const request = http.request(
        {
          hostname,
          port: numericPort,
          method: 'HEAD',
          timeout: 2000,
        },
        (response) => {
          response.destroy();
          resolve(response.statusCode === 200);
        },
      );

      request.on('error', () => resolve(false));
      request.on('timeout', () => {
        request.destroy();
        resolve(false);
      });
      request.end();
    });

    if (isListening) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Renderer dev server not reachable within ${timeoutMs}ms`);
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Prefer dev server when available; probe multiple common ports if env not set
  const candidates: string[] = [];
  if (process.env.VITE_DEV_SERVER_URL) {
    candidates.push(process.env.VITE_DEV_SERVER_URL);
  }
  candidates.push('http://localhost:5180', 'http://localhost:5181', 'http://localhost:5173');

  let loaded = false;
  for (const url of candidates) {
    try {
      logger.info(`Probing renderer dev server at ${url}`);
      await waitForRendererReady(url, 8000);
      await mainWindow.loadURL(url);
      logger.info(`Loaded renderer from dev server ${url}`);
      loaded = true;
      break;
    } catch (error) {
      logger.info(`Dev server not reachable at ${url}: ${(error as Error).message}`);
    }
  }

  if (!loaded) {
    const htmlPath = resolveHtmlPath();
    logger.info(`Dev server unavailable. Loading renderer from ${htmlPath}`);
    await mainWindow.loadFile(htmlPath);
  }

  // Open DevTools for debugging renderer issues
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  createClipboardWatcher({
    onNewItem: async (item) => {
      await clipboardHistoryStore.add(item);
      mainWindow?.webContents.send('clipboard:new-item', item);
    },
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('clipboard:get-history', () => clipboardHistoryStore.getAll());
ipcMain.handle('clipboard:clear', () => clipboardHistoryStore.clear());
