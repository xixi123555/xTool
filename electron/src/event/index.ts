import { shortcutEventOn } from '../shortcuts/event.js';
import { BrowserWindow } from 'electron';

/**
 * 注册依赖窗口的事件处理器
 * 注意：clipboardEventOn 和 loginHistoryEventOn 已经在 main.ts 中提前注册
 */
export const registerEvent = (mainWindow: BrowserWindow, createScreenshotWindow: () => void) => {
  shortcutEventOn(mainWindow, createScreenshotWindow);
}