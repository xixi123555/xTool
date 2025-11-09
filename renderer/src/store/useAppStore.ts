import { create } from 'zustand';
import { ClipboardItem } from 'devtools-suite-shared';

type AppState = {
  clipboardHistory: ClipboardItem[];
  addClipboardItem: (item: ClipboardItem) => void;
  setClipboardHistory: (items: ClipboardItem[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  clipboardHistory: [],
  addClipboardItem: (item) =>
    set((state) => ({
      clipboardHistory: [item, ...state.clipboardHistory.filter((existing) => existing.id !== item.id)].slice(0, 100),
    })),
  setClipboardHistory: (items) => set({ clipboardHistory: items }),
}));
