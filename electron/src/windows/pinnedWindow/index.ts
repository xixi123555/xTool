import { BrowserWindow } from 'electron';
import path from 'node:path';

let pinnedWindows: Map<string, BrowserWindow> = new Map();
export function createPinnedWindow(imageDataUrl: string, id: string) {
    // 如果已存在，先关闭
    const existing = pinnedWindows.get(id);
    if (existing) {
      existing.close();
    }
  
    const pinnedWindow = new BrowserWindow({
      width: 300,
      height: 400,
      minWidth: 200,
      minHeight: 200,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '../../preload.js'),
        contextIsolation: true,
        sandbox: false,
      },
    });
  
    pinnedWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            -webkit-app-region: drag;
          }
          .image-container {
            position: relative;
            display: inline-block;
            max-width: 100%;
            max-height: 100%;
            border: 2px solid rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }
          img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            object-fit: contain;
            border-radius: 2px;
          }
          .close-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            border: none;
            color: white;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            transition: all 0.2s;
            -webkit-app-region: no-drag;
            z-index: 10;
          }
          .close-btn:hover {
            background: rgba(0, 0, 0, 0.8);
            transform: scale(1.1);
          }
          .close-btn:active {
            transform: scale(0.95);
          }
        </style>
      </head>
      <body>
        <div class="image-container">
          <img src="${imageDataUrl}" alt="pinned screenshot" />
          <button class="close-btn" onclick="window.close()" title="关闭">×</button>
        </div>
      </body>
      </html>
    `)}`);
  
    pinnedWindow.on('closed', () => {
      pinnedWindows.delete(id);
    });
  
    pinnedWindows.set(id, pinnedWindow);
  }