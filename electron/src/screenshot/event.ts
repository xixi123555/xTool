import { ipcMain, BrowserWindow, screen } from 'electron';
import crypto from 'node:crypto';
import { captureScreenRegion } from './capture.js';
import { screenshotHistoryStore } from './history.js';
import { createPinnedWindow } from '../windows/pinnedWindow/index.js';
import { logger } from '../utils/logger';
import { closeAllScreenshotWindows, getScreenshotWindows } from '../main.js';

// 窗口引用（需要在注册时传入）
let mainWindowRef: BrowserWindow | null = null;
let screenshotWindowRef: BrowserWindow | null = null;
let editorWindowRef: BrowserWindow | null = null;
let windowStateBeforeScreenshotRef: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null = null;

// 窗口操作函数（需要在注册时传入）
let showEditorWindowFn: ((imageDataUrl: string) => void) | null = null;

// 全局鼠标位置监听
let mouseTrackingInterval: NodeJS.Timeout | null = null;
let mouseTrackingWindow: BrowserWindow | null = null;

// 全局选择框状态
let globalSelectionRect: { x: number; y: number; width: number; height: number } | null = null;
let isDragging = false;

/**
 * 注册截图相关的 IPC 事件处理器
 */
export const screenshotEventOn = (
  mainWindow: BrowserWindow | null,
  screenshotWindow: BrowserWindow | null,
  editorWindow: BrowserWindow | null,
  windowStateBeforeScreenshot: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null,
  showEditorWindow: (imageDataUrl: string) => void
) => {
  mainWindowRef = mainWindow;
  screenshotWindowRef = screenshotWindow;
  editorWindowRef = editorWindow;
  windowStateBeforeScreenshotRef = windowStateBeforeScreenshot;
  showEditorWindowFn = showEditorWindow;

  // 开始全局鼠标位置跟踪
  ipcMain.handle('screenshot:start-mouse-tracking', (_event) => {
    if (mouseTrackingInterval) {
      return; // 已经在跟踪
    }
    
    const windows = getScreenshotWindows();
    if (windows.length === 0) {
      return;
    }

    // 重置状态
    globalSelectionRect = null;
    isDragging = false;

    // 每 16ms (约 60fps) 获取一次鼠标位置并发送到所有渲染进程
    mouseTrackingInterval = setInterval(() => {
      const activeWindows = getScreenshotWindows();
      
      if (activeWindows.length === 0) {
        if (mouseTrackingInterval) {
          clearInterval(mouseTrackingInterval);
          mouseTrackingInterval = null;
        }
        return;
      }

      try {
        const point = screen.getCursorScreenPoint();
        // 向所有截图窗口发送鼠标位置
        activeWindows.forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('screenshot:mouse-position', point);
          }
        });
        
        // 如果有全局选择框，也发送给所有窗口
        if (globalSelectionRect) {
          activeWindows.forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('screenshot:selection-rect', globalSelectionRect);
            }
          });
        }
      } catch (error) {
        logger.error('Failed to get cursor position:', error);
      }
    }, 16);
  });
  
  // 更新全局选择框（由任意窗口调用）
  ipcMain.handle('screenshot:update-selection', (_event, rect: { x: number; y: number; width: number; height: number } | null) => {
    globalSelectionRect = rect;
    isDragging = rect !== null;
    
    // 广播给所有窗口
    const windows = getScreenshotWindows();
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('screenshot:selection-rect', rect);
      }
    });
  });

  // 停止全局鼠标位置跟踪
  ipcMain.handle('screenshot:stop-mouse-tracking', () => {
    if (mouseTrackingInterval) {
      clearInterval(mouseTrackingInterval);
      mouseTrackingInterval = null;
    }
    mouseTrackingWindow = null;
    globalSelectionRect = null;
    isDragging = false;
  });

  // 获取截图窗口位置和大小（返回调用窗口的完整边界）
  ipcMain.handle('screenshot:get-window-bounds', (event) => {
    // 找到发送请求的窗口
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    
    if (senderWindow && !senderWindow.isDestroyed()) {
      const bounds = senderWindow.getBounds();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }
    
    // 如果找不到，返回第一个窗口的位置
    if (screenshotWindowRef && !screenshotWindowRef.isDestroyed()) {
      const bounds = screenshotWindowRef.getBounds();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }
    
    return { x: 0, y: 0, width: 0, height: 0 };
  });

  // 截图捕获
  ipcMain.handle('screenshot:capture', async (_event, region: { x: number; y: number; width: number; height: number }) => {
    // 停止鼠标跟踪
    if (mouseTrackingInterval) {
      clearInterval(mouseTrackingInterval);
      mouseTrackingInterval = null;
    }
    mouseTrackingWindow = null;
    const dataUrl = await captureScreenRegion(region);
    const item = {
      id: crypto.randomUUID(),
      hash: crypto.createHash('sha256').update(dataUrl).digest('hex'),
      dataUrl,
      createdAt: Date.now(),
    };
    await screenshotHistoryStore.add(item);
    // 通知渲染进程有新的截图
    mainWindowRef?.webContents.send('screenshot:new-item', item);
    
    // 关闭所有截图窗口
    closeAllScreenshotWindows();
    
    // 先显示编辑窗口，再隐藏主窗口
    // 这样可以确保编辑窗口正确显示，避免主窗口隐藏后导致的状态问题
    if (showEditorWindowFn) {
      showEditorWindowFn(dataUrl);
      // 等待一小段时间确保编辑窗口已经显示
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 隐藏主窗口（在编辑窗口显示之后）
    if (mainWindowRef) {
      mainWindowRef.hide();
    }
    
    return item;
  });

  // 获取截图历史
  ipcMain.handle('screenshot:get-history', () => screenshotHistoryStore.getAll());
  
  // 处理截图取消事件
  ipcMain.handle('screenshot:cancel', () => {
    // 停止鼠标跟踪
    if (mouseTrackingInterval) {
      clearInterval(mouseTrackingInterval);
      mouseTrackingInterval = null;
    }
    mouseTrackingWindow = null;
    
    // 关闭所有截图窗口并恢复主窗口
    closeAllScreenshotWindows();
    if (mainWindowRef && windowStateBeforeScreenshotRef) {
      if (windowStateBeforeScreenshotRef.isMaximized) {
        mainWindowRef.maximize();
      } else {
        mainWindowRef.setBounds({
          x: windowStateBeforeScreenshotRef.x,
          y: windowStateBeforeScreenshotRef.y,
          width: windowStateBeforeScreenshotRef.width,
          height: windowStateBeforeScreenshotRef.height,
        });
      }
      mainWindowRef.show();
      windowStateBeforeScreenshotRef = null;
    }
  });

  // 处理编辑器关闭（隐藏窗口）
  ipcMain.handle('screenshot:editor-close', () => {
    if (editorWindowRef) {
      editorWindowRef.hide();
    }
    // 恢复主窗口
    if (mainWindowRef && windowStateBeforeScreenshotRef) {
      if (windowStateBeforeScreenshotRef.isMaximized) {
        mainWindowRef.maximize();
      } else {
        mainWindowRef.setBounds({
          x: windowStateBeforeScreenshotRef.x,
          y: windowStateBeforeScreenshotRef.y,
          width: windowStateBeforeScreenshotRef.width,
          height: windowStateBeforeScreenshotRef.height,
        });
      }
      mainWindowRef.show();
      windowStateBeforeScreenshotRef = null;
    } else if (mainWindowRef) {
      mainWindowRef.show();
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
    
    // 隐藏编辑窗口
    if (editorWindowRef) {
      editorWindowRef.hide();
    }
    
    // 恢复主窗口
    if (mainWindowRef && windowStateBeforeScreenshotRef) {
      if (windowStateBeforeScreenshotRef.isMaximized) {
        mainWindowRef.maximize();
      } else {
        mainWindowRef.setBounds({
          x: windowStateBeforeScreenshotRef.x,
          y: windowStateBeforeScreenshotRef.y,
          width: windowStateBeforeScreenshotRef.width,
          height: windowStateBeforeScreenshotRef.height,
        });
      }
      mainWindowRef.show();
      windowStateBeforeScreenshotRef = null;
    } else if (mainWindowRef) {
      mainWindowRef.show();
    }
    
    return item;
  });
};

/**
 * 更新窗口引用（当窗口重新创建时调用）
 */
export const updateScreenshotWindowRefs = (
  mainWindow: BrowserWindow | null,
  screenshotWindow: BrowserWindow | null,
  editorWindow: BrowserWindow | null,
  windowStateBeforeScreenshot: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null
) => {
  mainWindowRef = mainWindow;
  screenshotWindowRef = screenshotWindow;
  editorWindowRef = editorWindow;
  windowStateBeforeScreenshotRef = windowStateBeforeScreenshot;
};

