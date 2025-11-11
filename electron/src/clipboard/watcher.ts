import { clipboard, systemPreferences } from 'electron';
import crypto from 'node:crypto';
import { logger } from '../utils/logger';

type ClipboardWatcherOptions = {
  intervalMs?: number;
  onNewItem: (item: ClipboardItem) => void;
};

type ClipboardItem = {
  id: string;
  content: string;
  createdAt: number;
  type?: 'text' | 'image';
};

export function createClipboardWatcher(options: ClipboardWatcherOptions) {
  const { intervalMs = 500, onNewItem } = options;
  let lastText = clipboard.readText();
  let lastImg = clipboard.readImage().toDataURL();
  if (process.platform === 'darwin') {
    const trusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!trusted) {
      logger.info('App needs accessibility permission for clipboard monitoring on macOS.');
      systemPreferences.isTrustedAccessibilityClient(true);
    }
  }

  setInterval(() => {
    const current = clipboard.readText();
    const img = clipboard.readImage();
    const imgBase64 = img.toDataURL();
    // todataurl
    if (!img.isEmpty() && lastImg !== imgBase64) {
      lastImg = imgBase64;
      onNewItem({
        id: crypto.randomUUID(),
        content: imgBase64 as any,
        type: 'image',
        createdAt: Date.now(),
      });
    }
    if (current && current !== lastText) {
      lastText = current;
      onNewItem({
        id: crypto.randomUUID(),
        content: current,
        type: 'text',
        createdAt: Date.now(),
      });
    }
  }, intervalMs);
}
