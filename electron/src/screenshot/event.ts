import { ipcMain, BrowserWindow } from 'electron';
import crypto from 'node:crypto';
import { captureScreenRegion } from './capture.js';
import { screenshotHistoryStore } from './history.js';
import { createPinnedWindow } from '../windows/pinnedWindow/index.js';
import { logger } from '../utils/logger';

// 窗口引用（需要在注册时传入）
let mainWindowRef: BrowserWindow | null = null;
let screenshotWindowRef: BrowserWindow | null = null;
let editorWindowRef: BrowserWindow | null = null;
let windowStateBeforeScreenshotRef: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null = null;

// 窗口操作函数（需要在注册时传入）
let showEditorWindowFn: ((imageDataUrl: string) => void) | null = null;

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

  // 截图捕获
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
    mainWindowRef?.webContents.send('screenshot:new-item', item);
    
    // 关闭截图窗口
    if (screenshotWindowRef) {
      screenshotWindowRef.close();
      screenshotWindowRef = null;
    }
    
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
    // 关闭截图窗口并恢复主窗口
    if (screenshotWindowRef) {
      screenshotWindowRef.close();
      screenshotWindowRef = null;
    }
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

