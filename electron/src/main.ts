import { app, BrowserWindow, nativeTheme, globalShortcut, ipcMain, screen } from 'electron';
import crypto from 'node:crypto';
import { captureScreenRegion, captureFullScreen } from './screenshot/capture.js';
import { screenshotHistoryStore } from './screenshot/history.js';
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
  candidates.push('http://localhost:5199');

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

  screenshotWindow.on('closed', () => {
    screenshotWindow = null;
    // 恢复主窗口
    // if (mainWindow && windowStateBeforeScreenshot) {
    //   if (windowStateBeforeScreenshot.isMaximized) {
    //     mainWindow.maximize();
    //   } else {
    //     mainWindow.setBounds({
    //       x: windowStateBeforeScreenshot.x,
    //       y: windowStateBeforeScreenshot.y,
    //       width: windowStateBeforeScreenshot.width,
    //       height: windowStateBeforeScreenshot.height,
    //     });
    //   }
    //   mainWindow.show();
    //   windowStateBeforeScreenshot = null;
    // }
  });
}

let currentScreenshotShortcut: string = 'Alt+S';

function registerScreenshotShortcuts(shortcut?: string) {
  // 如果提供了新的快捷键，先取消注册旧的
  if (currentScreenshotShortcut) {
    globalShortcut.unregister(currentScreenshotShortcut);
  }

  const newShortcut = shortcut || currentScreenshotShortcut;
  const registered = globalShortcut.register(newShortcut, () => {
    createScreenshotWindow();
  });

  if (registered) {
    currentScreenshotShortcut = newShortcut;
    logger.info(`Screenshot shortcut registered: ${newShortcut}`);
  } else {
    logger.warn(`Failed to register global shortcut ${newShortcut}`);
    // 如果注册失败且是更新操作，尝试恢复旧的快捷键
    if (shortcut && currentScreenshotShortcut) {
      const oldShortcut = currentScreenshotShortcut;
      const oldRegistered = globalShortcut.register(oldShortcut, () => {
        createScreenshotWindow();
      });
      if (oldRegistered) {
        logger.info(`Restored old shortcut: ${oldShortcut}`);
      }
    }
  }
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

  // 发送图片数据
  editorWindow.webContents.send('screenshot:edit-image', imageDataUrl);
  
  // 显示并聚焦窗口
  editorWindow.show();
  editorWindow.focus();

  logger.info('Editor window shown with image data');
}


function registerScreenshotIpcHandlers() {
  ipcMain.handle('screenshot:capture', async (_event, region: { x: number; y: number; width: number; height: number }) => {
    const dataUrl = await captureScreenRegion(region);
    const item = {
      id: crypto.randomUUID(),
      hash: crypto.createHash('sha256').update(dataUrl).digest('hex'),
      dataUrl,
      createdAt: Date.now(),
    };
    await screenshotHistoryStore.add(item);
    // 通知渲染进程有新的截图
    mainWindow?.webContents.send('screenshot:new-item', item);
    
    // 关闭截图窗口
    if (screenshotWindow) {
      screenshotWindow.close();
      screenshotWindow = null;
    }
    
    // 隐藏主窗口
    if (mainWindow) {
      mainWindow.hide();
    }
    
    // 显示编辑窗口
    showEditorWindow(dataUrl);
    
    return item;
  });

  ipcMain.handle('screenshot:get-history', () => screenshotHistoryStore.getAll());
  
  // 处理截图取消事件
  ipcMain.handle('screenshot:cancel', () => {
    // 关闭截图窗口并恢复主窗口
    if (screenshotWindow) {
      screenshotWindow.close();
      screenshotWindow = null;
    }
    if (mainWindow && windowStateBeforeScreenshot) {
      if (windowStateBeforeScreenshot.isMaximized) {
        mainWindow.maximize();
      } else {
        mainWindow.setBounds({
          x: windowStateBeforeScreenshot.x,
          y: windowStateBeforeScreenshot.y,
          width: windowStateBeforeScreenshot.width,
          height: windowStateBeforeScreenshot.height,
        });
      }
      mainWindow.show();
      windowStateBeforeScreenshot = null;
    }
  });

  // 处理编辑器关闭（隐藏窗口）
  ipcMain.handle('screenshot:editor-close', () => {
    if (editorWindow) {
      editorWindow.hide();
    }
    // 恢复主窗口
    if (mainWindow && windowStateBeforeScreenshot) {
      if (windowStateBeforeScreenshot.isMaximized) {
        mainWindow.maximize();
      } else {
        mainWindow.setBounds({
          x: windowStateBeforeScreenshot.x,
          y: windowStateBeforeScreenshot.y,
          width: windowStateBeforeScreenshot.width,
          height: windowStateBeforeScreenshot.height,
        });
      }
      mainWindow.show();
      windowStateBeforeScreenshot = null;
    } else if (mainWindow) {
      mainWindow.show();
    }
  });

  // 处理固定截图
  ipcMain.handle('screenshot:pin', (_event, imageDataUrl: string) => {
    const id = crypto.randomUUID();
    createPinnedWindow(imageDataUrl, id);
    return id;
  });

  // 处理确认（保存编辑后的截图）
  ipcMain.handle('screenshot:confirm', async (_event, editedImageDataUrl: string) => {
    const item = {
      id: crypto.randomUUID(),
      dataUrl: editedImageDataUrl,
      createdAt: Date.now(),
    };
    // await screenshotHistoryStore.add(item);
    // 通知渲染进程有新的截图
    // mainWindow?.webContents.send('screenshot:new-item', item);
    
    // 隐藏编辑窗口
    if (editorWindow) {
      editorWindow.hide();
    }
    
    // 恢复主窗口
    if (mainWindow && windowStateBeforeScreenshot) {
      if (windowStateBeforeScreenshot.isMaximized) {
        mainWindow.maximize();
      } else {
        mainWindow.setBounds({
          x: windowStateBeforeScreenshot.x,
          y: windowStateBeforeScreenshot.y,
          width: windowStateBeforeScreenshot.width,
          height: windowStateBeforeScreenshot.height,
        });
      }
      mainWindow.show();
      windowStateBeforeScreenshot = null;
    } else if (mainWindow) {
      mainWindow.show();
    }
    
    return item;
  });
}

function registerShortcutIpcHandlers() {
  // 获取截图快捷键
  ipcMain.handle('shortcut:get-screenshot', () => {
    return currentScreenshotShortcut;
  });

  // 更新截图快捷键
  ipcMain.handle('shortcut:update-screenshot', (_event, shortcut: string) => {
    try {
      // 验证快捷键格式
      if (!shortcut || shortcut.trim() === '') {
        return { success: false, error: '快捷键不能为空' };
      }

      // 尝试注册新快捷键
      const oldShortcut = currentScreenshotShortcut;
      registerScreenshotShortcuts(shortcut);

      // 如果注册失败，恢复旧的快捷键
      if (currentScreenshotShortcut !== shortcut) {
        registerScreenshotShortcuts(oldShortcut);
        return { success: false, error: '快捷键注册失败，可能已被其他应用占用' };
      }

      return { success: true, shortcut: currentScreenshotShortcut };
    } catch (error) {
      logger.error('更新快捷键失败:', error);
      return { success: false, error: '更新快捷键失败' };
    }
  });

  // 应用用户的快捷键配置
  ipcMain.handle('shortcut:apply-user-shortcuts', (_event, shortcuts: Record<string, string>) => {
    try {
      if (shortcuts && shortcuts.screenshot) {
        registerScreenshotShortcuts(shortcuts.screenshot);
        logger.info(`Applied user shortcut for screenshot: ${shortcuts.screenshot}`);
      }
      return { success: true };
    } catch (error) {
      logger.error('应用用户快捷键失败:', error);
      return { success: false, error: '应用快捷键失败' };
    }
  });
}



app.whenReady().then(async () => {
  await createMainWindow();
  // 创建编辑窗口（隐藏状态）
  await createEditorWindow();
  
  registerScreenshotShortcuts();
  registerScreenshotIpcHandlers();
  registerShortcutIpcHandlers();
  registerTodoIpcHandlers(mainWindow as BrowserWindow);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
      await createEditorWindow();
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

registerEvent();
