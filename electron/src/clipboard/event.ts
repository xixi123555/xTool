import { clipboard, nativeImage, ipcMain } from 'electron';
import { clipboardHistoryStore } from './store';

export const clipboardEventOn = () => {
    ipcMain.handle('clipboard:get-history', () => clipboardHistoryStore.getAll());
    ipcMain.handle('clipboard:clear', () => clipboardHistoryStore.clear());
    
    ipcMain.handle('clipboard:write', (_event, item: { type?: 'text' | 'image'; content: string }) => {
      try {
        if (item?.type === 'image') {
          const image = nativeImage.createFromDataURL(item.content);
          clipboard.writeImage(image);
          return { ok: true };
        }
        clipboard.writeText(item.content ?? '');
        return { ok: true };
      } catch (error) {
        return { ok: false, error: (error as Error).message };
      }
    });
};