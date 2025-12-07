import { clipboard, nativeImage, ipcMain, BrowserWindow } from 'electron';
import { todoStore } from './store';
import type { TodoCard } from './store';

export function registerTodoIpcHandlers(mainWindow: BrowserWindow) {
    ipcMain.handle('todo:get-all', async () => {
      return await todoStore.getAll();
    });
  
    ipcMain.handle('todo:add-card', async (_event, card: TodoCard) => {
      await todoStore.addCard(card);
      mainWindow?.webContents.send('todo:card-added', card);
      return card;
    });
  
    ipcMain.handle('todo:update-card', async (_event, cardId: string, updates: { name?: string; starred?: boolean; tags?: string[]; isOnlineData?: boolean }) => {
      await todoStore.updateCard(cardId, updates);
      mainWindow?.webContents.send('todo:card-updated', { cardId });
      return { ok: true };
    });
  
    ipcMain.handle('todo:delete-card', async (_event, cardId: string) => {
      await todoStore.deleteCard(cardId);
      mainWindow?.webContents.send('todo:card-deleted', { cardId });
      return { ok: true };
    });
  
    ipcMain.handle('todo:add-item', async (_event, cardId: string, item: { id: string; content: string; completed: boolean; createdAt: number; updatedAt: number }) => {
      await todoStore.addItemToCard(cardId, item);
      mainWindow?.webContents.send('todo:item-updated', { cardId });
      return { ok: true };
    });
  
    ipcMain.handle('todo:update-item', async (_event, cardId: string, itemId: string, updates: { content?: string; completed?: boolean }) => {
      await todoStore.updateItemInCard(cardId, itemId, updates);
      mainWindow?.webContents.send('todo:item-updated', { cardId });
      return { ok: true };
    });
  
    ipcMain.handle('todo:delete-item', async (_event, cardId: string, itemId: string) => {
      await todoStore.deleteItemFromCard(cardId, itemId);
      mainWindow?.webContents.send('todo:item-updated', { cardId });
      return { ok: true };
    });
  }