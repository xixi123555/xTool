import { app, BrowserWindow, nativeTheme, globalShortcut, screen } from 'electron';
import { registerTodoIpcHandlers } from './todo/event.js';

import path from 'node:path';
import http from 'node:http';
import { createClipboardWatcher } from './clipboard/watcher';
import { clipboardHistoryStore } from './clipboard/store';
import { logger } from './utils/logger';
import { registerEvent } from './event/index.js';
import { createPinnedWindow } from './windows/pinnedWindow/index.js';
import { log } from 'node:console';
let mainWindow: BrowserWindow | null = null;
let screenshotWindow: BrowserWindow | null = null;
let editorWindow: BrowserWindow | null = null;
let windowStateBeforeScreenshot: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null = null;

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
  candidates.push('http://39.105.137.213/');

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

async function createScreenshotWindow() {
  if (screenshotWindow) {
    screenshotWindow.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;

  // 隐藏主窗口
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    windowStateBeforeScreenshot = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized(),
    };
    mainWindow.hide();
  }

  // 创建全屏透明窗口用于截图选择
  screenshotWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  // 加载截图选择器页面
  const htmlPath = resolveHtmlPath();
  if (process.env.VITE_DEV_SERVER_URL) {
    await screenshotWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?screenshot=true`);
  } else {
    await screenshotWindow.loadFile(htmlPath, { query: { screenshot: 'true' } });
  }

  // 等待页面加载完成后发送截图触发事件
  screenshotWindow.webContents.once('did-finish-load', () => {
    screenshotWindow?.webContents.send('screenshot:trigger');
  });

  screenshotWindow.on('closed', async () => {
    screenshotWindow = null;
    // 更新截图事件处理器中的窗口引用
    const { updateScreenshotWindowRefs } = await import('./screenshot/event.js');
    updateScreenshotWindowRefs(mainWindow, screenshotWindow, editorWindow, windowStateBeforeScreenshot);
  });
  
  // 创建窗口后更新截图事件处理器中的窗口引用
  const { updateScreenshotWindowRefs } = await import('./screenshot/event.js');
  updateScreenshotWindowRefs(mainWindow, screenshotWindow, editorWindow, windowStateBeforeScreenshot);
}


// 创建编辑窗口（在应用启动时调用，隐藏状态）
async function createEditorWindow() {
  if (editorWindow) {
    return;
  }

  if (!mainWindow) {
    logger.warn('Cannot create editor window: main window not created yet');
    return;
  }

  // 获取主窗口的大小和位置
  const mainBounds = mainWindow.getBounds();
  const isMaximized = mainWindow.isMaximized();

  editorWindow = new BrowserWindow({
    width: mainBounds.width,
    height: mainBounds.height,
    x: mainBounds.x,
    y: mainBounds.y,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e293b',
    autoHideMenuBar: true,
    show: false, // 创建时隐藏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  // 如果主窗口是最大化的，编辑窗口也最大化
  if (isMaximized) {
    editorWindow.maximize();
  }

  // 加载编辑页面
  const htmlPath = resolveHtmlPath();
  if (process.env.VITE_DEV_SERVER_URL) {
    await editorWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?editor=true`);
  } else {
    await editorWindow.loadFile(htmlPath, { query: { editor: 'true' } });
  }

  // 监听关闭事件，隐藏而不是真正关闭
  editorWindow.on('close', (event) => {
    event.preventDefault();
    if (editorWindow) {
      editorWindow.hide();
    }
  });

  // 监听窗口加载完成事件，确保可以接收 IPC 消息
  editorWindow.webContents.once('did-finish-load', () => {
    logger.info('Editor window loaded and ready to receive messages');
  });

  logger.info('Editor window created and hidden');
}

// 显示编辑窗口并发送图片数据
function showEditorWindow(imageDataUrl: string) {
  if (!editorWindow) {
    logger.warn('Cannot show editor window: window not created');
    return;
  }

  // 同步编辑窗口的位置和大小到主窗口
  if (mainWindow) {
    const mainBounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();

    if (isMaximized) {
      editorWindow.maximize();
    } else {
      editorWindow.setBounds({
        x: mainBounds.x,
        y: mainBounds.y,
        width: mainBounds.width,
        height: mainBounds.height,
      });
    }
  }

  // 先显示窗口，确保窗口已经加载
  editorWindow.show();
  editorWindow.focus();

  // 等待窗口加载完成后再发送图片数据
  // 如果窗口已经加载，直接发送；否则等待加载完成
  if (editorWindow.webContents.isLoading()) {
    editorWindow.webContents.once('did-finish-load', () => {
      editorWindow?.webContents.send('screenshot:edit-image', imageDataUrl);
    });
  } else {
    // 窗口已经加载，直接发送
    editorWindow.webContents.send('screenshot:edit-image', imageDataUrl);
  }

  logger.info('Editor window shown with image data');
}






app.whenReady().then(async () => {
  // 注册剪贴板和登录历史的 IPC 处理器（不依赖窗口）
  const { clipboardEventOn } = await import('./clipboard/event.js');
  const { loginHistoryEventOn } = await import('./loginHistory/event.js');
  clipboardEventOn();
  loginHistoryEventOn();
  
  // 创建主窗口
  await createMainWindow();
  // 创建编辑窗口（隐藏状态）
  await createEditorWindow();
  
  registerTodoIpcHandlers(mainWindow as BrowserWindow);
  
  // 注册依赖窗口的事件处理器（快捷键）
  // 必须在窗口创建后立即注册，确保渲染进程在调用 IPC 时处理器已经存在
  if (mainWindow) {
    registerEvent(mainWindow, createScreenshotWindow);
    
    // 注册截图相关的 IPC 事件处理器（依赖窗口）
    const { screenshotEventOn } = await import('./screenshot/event.js');
    screenshotEventOn(mainWindow, screenshotWindow, editorWindow, windowStateBeforeScreenshot, showEditorWindow);
    
    logger.info('IPC handlers registered: shortcuts and screenshot');
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 重新注册不依赖窗口的 IPC 处理器
      const { clipboardEventOn } = await import('./clipboard/event.js');
      const { loginHistoryEventOn } = await import('./loginHistory/event.js');
      clipboardEventOn();
      loginHistoryEventOn();
      
      await createMainWindow();
      await createEditorWindow();
      // 重新注册依赖窗口的事件处理器
      if (mainWindow) {
        registerEvent(mainWindow, createScreenshotWindow);
        
        // 重新注册截图相关的 IPC 事件处理器
        const { screenshotEventOn } = await import('./screenshot/event.js');
        screenshotEventOn(mainWindow, screenshotWindow, editorWindow, windowStateBeforeScreenshot, showEditorWindow);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
