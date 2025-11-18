import { BrowserWindow, desktopCapturer, screen } from 'electron';

export async function captureScreenRegion(region: { x: number; y: number; width: number; height: number }) {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scaleFactor = display.scaleFactor || 1;
  
  // 使用完整分辨率（考虑缩放因子）
  const fullWidth = width * scaleFactor;
  const fullHeight = height * scaleFactor;
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: fullWidth, height: fullHeight },
  });

  const primarySource = sources[0];
  if (!primarySource) {
    throw new Error('No screen source available');
  }

  // 将屏幕坐标转换为缩略图坐标（考虑缩放因子）
  const thumbnailX = Math.max(region.x * scaleFactor, 0);
  const thumbnailY = Math.max(region.y * scaleFactor, 0);
  const thumbnailWidth = Math.max(region.width * scaleFactor, 0);
  const thumbnailHeight = Math.max(region.height * scaleFactor, 0);

  const thumbnail = primarySource.thumbnail.crop({
    x: thumbnailX,
    y: thumbnailY,
    width: thumbnailWidth,
    height: thumbnailHeight,
  });

  return thumbnail.toDataURL();
}

export async function captureFullScreen() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scaleFactor = display.scaleFactor || 1;
  
  // 使用完整分辨率（考虑缩放因子）
  const fullWidth = width * scaleFactor;
  const fullHeight = height * scaleFactor;
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: fullWidth, height: fullHeight },
  });

  const primarySource = sources[0];
  if (!primarySource) {
    throw new Error('No screen source available');
  }

  return primarySource.thumbnail.toDataURL();
}
