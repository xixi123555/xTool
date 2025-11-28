import { clipboardEventOn } from '../clipboard/event.js';
import { shortcutEventOn } from '../shortcuts/event.js';
import { BrowserWindow } from 'electron';

export const registerEvent = (mainWindow: BrowserWindow, createScreenshotWindow: () => void) => {
  clipboardEventOn();
  shortcutEventOn(mainWindow, createScreenshotWindow);
}