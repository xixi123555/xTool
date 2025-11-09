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
};

export function createClipboardWatcher(options: ClipboardWatcherOptions) {
  const { intervalMs = 500, onNewItem } = options;
  let lastText = clipboard.readText();

  if (process.platform === 'darwin') {
    const trusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!trusted) {
      logger.info('App needs accessibility permission for clipboard monitoring on macOS.');
      systemPreferences.isTrustedAccessibilityClient(true);
    }
  }

  setInterval(() => {
    const current = clipboard.readText();
    if (current && current !== lastText) {
      lastText = current;
      onNewItem({
        id: crypto.randomUUID(),
        content: current,
        createdAt: Date.now(),
      });
    }
  }, intervalMs);
}
