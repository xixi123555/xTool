import { BrowserWindow, desktopCapturer, screen, nativeImage, ipcMain } from 'electron';

interface ScreenRegion {
  display: Electron.Display;
  source: Electron.DesktopCapturerSource;
  region: { x: number; y: number; width: number; height: number };
  localRegion: { x: number; y: number; width: number; height: number };
}

export async function captureScreenRegion(region: { x: number; y: number; width: number; height: number }) {
  // 获取所有屏幕
  const displays = screen.getAllDisplays();
  
  // 找出区域跨越的所有屏幕
  const regionEndX = region.x + region.width;
  const regionEndY = region.y + region.height;
  const intersectingDisplays: Array<{ display: Electron.Display; localRegion: { x: number; y: number; width: number; height: number } }> = [];
  
  for (const display of displays) {
    const bounds = display.bounds;
    const displayEndX = bounds.x + bounds.width;
    const displayEndY = bounds.y + bounds.height;
    
    // 计算区域与屏幕的交集
    const intersectX = Math.max(region.x, bounds.x);
    const intersectY = Math.max(region.y, bounds.y);
    const intersectEndX = Math.min(regionEndX, displayEndX);
    const intersectEndY = Math.min(regionEndY, displayEndY);
    
    if (intersectX < intersectEndX && intersectY < intersectEndY) {
      // 区域与此屏幕有交集
      const localX = intersectX - bounds.x;
      const localY = intersectY - bounds.y;
      const localWidth = intersectEndX - intersectX;
      const localHeight = intersectEndY - intersectY;
      
      intersectingDisplays.push({
        display,
        localRegion: { x: localX, y: localY, width: localWidth, height: localHeight }
      });
    }
  }
  
  if (intersectingDisplays.length === 0) {
    throw new Error('Selected region does not intersect with any screen.');
  }
  
  // 如果只跨越一个屏幕，使用简单路径
  if (intersectingDisplays.length === 1) {
    const { display, localRegion } = intersectingDisplays[0];
    const { width, height } = display.size;
    const scaleFactor = display.scaleFactor || 1;
    const fullWidth = width * scaleFactor;
    const fullHeight = height * scaleFactor;
    
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: fullWidth, height: fullHeight },
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen source available. Please grant screen recording permission in System Settings.');
      }

      let targetSource = sources.find((source) => {
        if (source.display_id !== undefined && display.id !== undefined) {
          return source.display_id === display.id.toString();
        }
        return false;
      });
      
      if (!targetSource) {
        const displayIndex = displays.indexOf(display);
        if (displayIndex >= 0 && displayIndex < sources.length) {
          targetSource = sources[displayIndex];
        }
      }
      
      if (!targetSource) {
        targetSource = sources[0];
      }
      
      if (!targetSource) {
        throw new Error('No screen source available. Please grant screen recording permission in System Settings.');
      }

      const thumbnailX = Math.max(localRegion.x * scaleFactor, 0);
      const thumbnailY = Math.max(localRegion.y * scaleFactor, 0);
      const thumbnailWidth = Math.max(localRegion.width * scaleFactor, 0);
      const thumbnailHeight = Math.max(localRegion.height * scaleFactor, 0);

      const thumbnail = targetSource.thumbnail.crop({
        x: thumbnailX,
        y: thumbnailY,
        width: thumbnailWidth,
        height: thumbnailHeight,
      });

      return thumbnail.toDataURL();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Failed to get sources') || errorMessage.includes('screen recording')) {
        throw new Error('Screen recording permission is required. Please grant permission in System Settings > Privacy & Security > Screen Recording.');
      }
      throw error;
    }
  }
  
  // 跨多个屏幕：需要合并多个屏幕的截图
  try {
    // 获取所有屏幕的 source
    const maxWidth = Math.max(...intersectingDisplays.map(d => d.display.size.width * (d.display.scaleFactor || 1)));
    const maxHeight = Math.max(...intersectingDisplays.map(d => d.display.size.height * (d.display.scaleFactor || 1)));
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxWidth, height: maxHeight },
    });

    if (!sources || sources.length === 0) {
      throw new Error('No screen source available. Please grant screen recording permission in System Settings.');
    }

    // 为每个相交的屏幕获取对应的 source 和截图
    const screenRegions: ScreenRegion[] = [];
    for (const { display, localRegion } of intersectingDisplays) {
      let source = sources.find((s) => {
        if (s.display_id !== undefined && display.id !== undefined) {
          return s.display_id === display.id.toString();
        }
        return false;
      });
      
      if (!source) {
        const displayIndex = displays.indexOf(display);
        if (displayIndex >= 0 && displayIndex < sources.length) {
          source = sources[displayIndex];
        }
      }
      
      if (!source) {
        source = sources[0];
      }
      
      if (source) {
        screenRegions.push({
          display,
          source,
          region: {
            x: localRegion.x + display.bounds.x,
            y: localRegion.y + display.bounds.y,
            width: localRegion.width,
            height: localRegion.height,
          },
          localRegion,
        });
      }
    }

    if (screenRegions.length === 0) {
      throw new Error('Failed to get screen sources for the selected region.');
    }

    // 创建最终图片的尺寸
    const finalWidth = region.width;
    const finalHeight = region.height;
    
    // 使用 Electron 的 BrowserWindow 在隐藏窗口中合并图片
    // 创建一个临时的隐藏窗口来执行 canvas 操作
    const mergeResultId = `merge-result-${Date.now()}`;
    
    const tempWindow = new BrowserWindow({
      width: finalWidth,
      height: finalHeight,
      show: false,
      webPreferences: {
        nodeIntegration: true, // 需要 nodeIntegration 来使用 require
        contextIsolation: false, // 禁用 contextIsolation 以简化实现
      },
    });

    // 为每个屏幕区域截图
    const imageDataUrls: Array<{ dataUrl: string; x: number; y: number; width: number; height: number }> = [];
    for (const screenRegion of screenRegions) {
      const { display, source, localRegion } = screenRegion;
      const scaleFactor = display.scaleFactor || 1;
      
      const thumbnailX = Math.max(localRegion.x * scaleFactor, 0);
      const thumbnailY = Math.max(localRegion.y * scaleFactor, 0);
      const thumbnailWidth = Math.max(localRegion.width * scaleFactor, 0);
      const thumbnailHeight = Math.max(localRegion.height * scaleFactor, 0);
      
      const thumbnail = source.thumbnail.crop({
        x: thumbnailX,
        y: thumbnailY,
        width: thumbnailWidth,
        height: thumbnailHeight,
      });
      
      const imageDataUrl = thumbnail.toDataURL();
      const destX = screenRegion.region.x - region.x;
      const destY = screenRegion.region.y - region.y;
      
      imageDataUrls.push({
        dataUrl: imageDataUrl,
        x: destX,
        y: destY,
        width: localRegion.width,
        height: localRegion.height,
      });
    }

    // 在隐藏窗口中合并图片
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="canvas" width="${finalWidth}" height="${finalHeight}"></canvas>
        <script>
          const { ipcRenderer } = require('electron');
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          const images = ${JSON.stringify(imageDataUrls)};
          
          let loadedCount = 0;
          const totalImages = images.length;
          
          images.forEach((imgData) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, imgData.x, imgData.y, imgData.width, imgData.height);
              loadedCount++;
              if (loadedCount === totalImages) {
                const result = canvas.toDataURL('image/png');
                ipcRenderer.send('${mergeResultId}', result);
              }
            };
            img.onerror = () => {
              loadedCount++;
              if (loadedCount === totalImages) {
                ipcRenderer.send('${mergeResultId}', null);
              }
            };
            img.src = imgData.dataUrl;
          });
        </script>
      </body>
      </html>
    `;

    return new Promise<string>((resolve, reject) => {
      // 监听合并结果
      const resultHandler = (_event: Electron.IpcMainEvent, result: string | null) => {
        ipcMain.removeListener(mergeResultId, resultHandler);
        tempWindow.close();
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to merge images'));
        }
      };
      
      ipcMain.once(mergeResultId, resultHandler);
      
      // 监听窗口加载完成
      tempWindow.webContents.once('did-finish-load', () => {
        // 超时处理
        setTimeout(() => {
          ipcMain.removeListener(mergeResultId, resultHandler);
          tempWindow.close();
          reject(new Error('Timeout waiting for image merge'));
        }, 5000);
      });

      tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    });
  } catch (error) {
    // 如果 canvas 模块不可用，回退到单屏幕截图
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      // 使用第一个相交的屏幕
      const { display, localRegion } = intersectingDisplays[0];
      const { width, height } = display.size;
      const scaleFactor = display.scaleFactor || 1;
      const fullWidth = width * scaleFactor;
      const fullHeight = height * scaleFactor;
      
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: fullWidth, height: fullHeight },
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen source available. Please grant screen recording permission in System Settings.');
      }

      let targetSource = sources[0];
      const thumbnailX = Math.max(localRegion.x * scaleFactor, 0);
      const thumbnailY = Math.max(localRegion.y * scaleFactor, 0);
      const thumbnailWidth = Math.max(localRegion.width * scaleFactor, 0);
      const thumbnailHeight = Math.max(localRegion.height * scaleFactor, 0);

      const thumbnail = targetSource.thumbnail.crop({
        x: thumbnailX,
        y: thumbnailY,
        width: thumbnailWidth,
        height: thumbnailHeight,
      });

      return thumbnail.toDataURL();
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Failed to get sources') || errorMessage.includes('screen recording')) {
      throw new Error('Screen recording permission is required. Please grant permission in System Settings > Privacy & Security > Screen Recording.');
    }
    throw error;
  }
}

export async function captureFullScreen() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scaleFactor = display.scaleFactor || 1;
  
  // 使用完整分辨率（考虑缩放因子）
  const fullWidth = width * scaleFactor;
  const fullHeight = height * scaleFactor;
  
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: fullWidth, height: fullHeight },
    });

    const primarySource = sources[0];
    if (!primarySource) {
      throw new Error('No screen source available. Please grant screen recording permission in System Settings.');
    }

    return primarySource.thumbnail.toDataURL();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Failed to get sources') || errorMessage.includes('screen recording')) {
      throw new Error('Screen recording permission is required. Please grant permission in System Settings > Privacy & Security > Screen Recording.');
    }
    throw error;
  }
}
