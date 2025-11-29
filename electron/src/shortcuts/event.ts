import { globalShortcut, ipcMain, BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

// 快捷键状态
let currentScreenshotShortcut: string = 'Alt+S';
let currentOpenSettingsShortcut: string = 'Alt+Command+S';
let currentShowClipboardShortcut: string = 'Alt+Space';
let isWindowShownByClipboardShortcut: boolean = false;

// 主窗口引用（需要在注册时传入）
let mainWindowRef: BrowserWindow | null = null;

// 截图窗口创建函数（需要在注册时传入）
let createScreenshotWindowFn: (() => void) | null = null;

/**
 * 设置窗口可见性跟踪
 */
export function setupWindowVisibilityTracking(window: BrowserWindow) {
  window.on('hide', () => {
    isWindowShownByClipboardShortcut = false;
  });
  window.on('blur', () => {
    if (!window.isVisible()) {
      isWindowShownByClipboardShortcut = false;
    }
  });
}

/**
 * 注册截图快捷键
 */
function registerScreenshotShortcuts(shortcut?: string) {
  // 如果提供了新的快捷键，先取消注册旧的
  if (currentScreenshotShortcut) {
    globalShortcut.unregister(currentScreenshotShortcut);
  }

  const newShortcut = shortcut || currentScreenshotShortcut;
  const registered = globalShortcut.register(newShortcut, () => {
    if (createScreenshotWindowFn) {
      createScreenshotWindowFn();
    }
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
        if (createScreenshotWindowFn) {
          createScreenshotWindowFn();
        }
      });
      if (oldRegistered) {
        logger.info(`Restored old shortcut: ${oldShortcut}`);
      }
    }
  }
}

/**
 * 注册打开设置快捷键
 */
function registerOpenSettingsShortcuts(shortcut?: string) {
  // 如果提供了新的快捷键，先取消注册旧的
  if (currentOpenSettingsShortcut) {
    globalShortcut.unregister(currentOpenSettingsShortcut);
  }

  const newShortcut = shortcut || currentOpenSettingsShortcut;
  const registered = globalShortcut.register(newShortcut, () => {
    // 显示主窗口
    if (mainWindowRef) {
      mainWindowRef.show();
      mainWindowRef.focus();
      // 发送消息给渲染进程切换设置（打开/关闭）
      mainWindowRef.webContents.send('shortcut:toggle-settings');
    } else {
      logger.warn('Main window not available for open settings shortcut');
    }
  });

  if (registered) {
    currentOpenSettingsShortcut = newShortcut;
    logger.info(`Open settings shortcut registered: ${newShortcut}`);
  } else {
    logger.warn(`Failed to register global shortcut ${newShortcut}`);
    // 如果注册失败且是更新操作，尝试恢复旧的快捷键
    if (shortcut && currentOpenSettingsShortcut) {
      const oldShortcut = currentOpenSettingsShortcut;
      const oldRegistered = globalShortcut.register(oldShortcut, () => {
        if (mainWindowRef) {
          mainWindowRef.show();
          mainWindowRef.focus();
          mainWindowRef.webContents.send('shortcut:toggle-settings');
        }
      });
      if (oldRegistered) {
        logger.info(`Restored old shortcut: ${oldShortcut}`);
      }
    }
  }
}

/**
 * 注册显示剪贴板快捷键
 */
function registerShowClipboardShortcuts(shortcut?: string) {
  // 如果提供了新的快捷键，先取消注册旧的
  if (currentShowClipboardShortcut) {
    globalShortcut.unregister(currentShowClipboardShortcut);
  }

  const newShortcut = shortcut || currentShowClipboardShortcut;
  const registered = globalShortcut.register(newShortcut, () => {
    if (mainWindowRef) {
      const isVisible = mainWindowRef.isVisible();
      const isFocused = mainWindowRef.isFocused();
      
      // 如果窗口已经通过这个快捷键显示且当前有焦点，则隐藏
      if (isVisible && isFocused && isWindowShownByClipboardShortcut) {
        mainWindowRef.hide();
        isWindowShownByClipboardShortcut = false;
        logger.info('Window hidden by clipboard shortcut');
      } else {
        // 显示窗口并跳转到剪贴板历史
        mainWindowRef.show();
        mainWindowRef.focus();
        isWindowShownByClipboardShortcut = true;
        // 发送消息给渲染进程跳转到剪贴板历史
        mainWindowRef.webContents.send('shortcut:show-clipboard');
        logger.info('Window shown and navigated to clipboard by shortcut');
      }
    } else {
      logger.warn('Main window not available for show clipboard shortcut');
    }
  });

  if (registered) {
    currentShowClipboardShortcut = newShortcut;
    logger.info(`Show clipboard shortcut registered: ${newShortcut}`);
  } else {
    logger.warn(`Failed to register global shortcut ${newShortcut}`);
    // 如果注册失败且是更新操作，尝试恢复旧的快捷键
    if (shortcut && currentShowClipboardShortcut) {
      const oldShortcut = currentShowClipboardShortcut;
      const oldRegistered = globalShortcut.register(oldShortcut, () => {
        if (mainWindowRef) {
          const isVisible = mainWindowRef.isVisible();
          if (isVisible && isWindowShownByClipboardShortcut) {
            mainWindowRef.hide();
            isWindowShownByClipboardShortcut = false;
          } else {
            mainWindowRef.show();
            mainWindowRef.focus();
            isWindowShownByClipboardShortcut = true;
            mainWindowRef.webContents.send('shortcut:show-clipboard');
          }
        }
      });
      if (oldRegistered) {
        logger.info(`Restored old shortcut: ${oldShortcut}`);
      }
    }
  }
}

/**
 * 注册所有快捷键 IPC 处理器
 */
export function shortcutEventOn(mainWindow: BrowserWindow, createScreenshotWindow: () => void) {
  mainWindowRef = mainWindow;
  createScreenshotWindowFn = createScreenshotWindow;

  // 设置窗口可见性跟踪
  setupWindowVisibilityTracking(mainWindow);

  // 注册所有默认快捷键
  registerScreenshotShortcuts();
  registerOpenSettingsShortcuts();
  registerShowClipboardShortcuts();

  logger.info('Registering shortcut IPC handlers...');

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
      return { success: false, error: '更新快捷键失败', errorContent: error };
    }
  });

  // 获取打开设置快捷键
  ipcMain.handle('shortcut:get-open-settings', () => {
    return currentOpenSettingsShortcut;
  });

  // 更新打开设置快捷键
  ipcMain.handle('shortcut:update-open-settings', (_event, shortcut: string) => {
    try {
      // 验证快捷键格式
      if (!shortcut || shortcut.trim() === '') {
        return { success: false, error: '快捷键不能为空' };
      }

      // 尝试注册新快捷键
      const oldShortcut = currentOpenSettingsShortcut;
      registerOpenSettingsShortcuts(shortcut);

      // 如果注册失败，恢复旧的快捷键
      if (currentOpenSettingsShortcut !== shortcut) {
        registerOpenSettingsShortcuts(oldShortcut);
        return { success: false, error: '快捷键注册失败，可能已被其他应用占用' };
      }

      return { success: true, shortcut: currentOpenSettingsShortcut };
    } catch (error) {
      logger.error('更新快捷键失败:', error);
      return { success: false, error: '更新快捷键失败', errorContent: error };
    }
  });

  // 获取显示剪贴板快捷键
  ipcMain.handle('shortcut:get-show-clipboard', () => {
    return currentShowClipboardShortcut;
  });

  // 更新显示剪贴板快捷键
  ipcMain.handle('shortcut:update-show-clipboard', (_event, shortcut: string) => {
    try {
      // 验证快捷键格式
      if (!shortcut || shortcut.trim() === '') {
        return { success: false, error: '快捷键不能为空' };
      }

      // 尝试注册新快捷键
      const oldShortcut = currentShowClipboardShortcut;
      registerShowClipboardShortcuts(shortcut);

      // 如果注册失败，恢复旧的快捷键
      if (currentShowClipboardShortcut !== shortcut) {
        registerShowClipboardShortcuts(oldShortcut);
        return { success: false, error: '快捷键注册失败，可能已被其他应用占用' };
      }

      return { success: true, shortcut: currentShowClipboardShortcut };
    } catch (error) {
      logger.error('更新快捷键失败:', error);
      return { success: false, error: '更新快捷键失败', errorContent: error };
    }
  });

  // 应用用户的快捷键配置
  ipcMain.handle('shortcut:apply-user-shortcuts', (_event, shortcuts: Record<string, string>) => {
    logger.info('shortcut:apply-user-shortcuts handler called with shortcuts:', shortcuts);
    try {
      // 应用截图快捷键（如果有自定义的，否则使用默认值）
      if (shortcuts && shortcuts.screenshot) {
        registerScreenshotShortcuts(shortcuts.screenshot);
        logger.info(`Applied user shortcut for screenshot: ${shortcuts.screenshot}`);
      } else {
        registerScreenshotShortcuts(); // 使用默认值
      }
      
      // 应用打开设置快捷键（如果有自定义的，否则使用默认值）
      if (shortcuts && shortcuts.openSettings) {
        registerOpenSettingsShortcuts(shortcuts.openSettings);
        logger.info(`Applied user shortcut for openSettings: ${shortcuts.openSettings}`);
      } else {
        registerOpenSettingsShortcuts(); // 使用默认值
      }
      
      // 应用显示剪贴板快捷键（如果有自定义的，否则使用默认值）
      if (shortcuts && shortcuts.showClipboard) {
        registerShowClipboardShortcuts(shortcuts.showClipboard);
        logger.info(`Applied user shortcut for showClipboard: ${shortcuts.showClipboard}`);
      } else {
        registerShowClipboardShortcuts(); // 使用默认值
      }
      
      return { success: true };
    } catch (error) {
      logger.error('应用用户快捷键失败:', error);
      return { success: false, error: '应用快捷键失败' };
    }
  });
}

