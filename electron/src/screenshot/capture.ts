import { BrowserWindow, desktopCapturer, screen } from 'electron';

export async function captureScreenRegion(region: { x: number; y: number; width: number; height: number }) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });

  const primarySource = sources[0];
  if (!primarySource) {
    throw new Error('No screen source available');
  }

  const thumbnail = primarySource.thumbnail.crop({
    x: Math.max(region.x, 0),
    y: Math.max(region.y, 0),
    width: Math.max(region.width, 0),
    height: Math.max(region.height, 0),
  });

  return thumbnail.toDataURL();
}
