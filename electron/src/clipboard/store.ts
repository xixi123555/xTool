import type Store from 'electron-store';

let storeConstructorPromise: Promise<typeof Store> | undefined;

async function resolveStoreConstructor() {
  if (!storeConstructorPromise) {
    storeConstructorPromise = import('electron-store').then((module) => module.default);
  }
  return storeConstructorPromise;
}

type ClipboardItem = {
  id: string;
  content: string;
  createdAt: number;
};

type ClipboardStoreSchema = {
  history: ClipboardItem[];
  preferences: {
    maxItems: number;
  };
};

class ClipboardHistoryStore {
  private storePromise: Promise<Store<ClipboardStoreSchema>>;

  constructor() {
    this.storePromise = this.createStore();
  }

  private async createStore() {
    const Store = await resolveStoreConstructor();
    return new Store<ClipboardStoreSchema>({
      name: 'clipboard-history',
      defaults: {
        history: [],
        preferences: {
          maxItems: 100,
        },
      },
    });
  }

  async add(item: ClipboardItem) {
    const store = await this.storePromise;
    const maxItems = await this.getMaxItems();
    const history = await this.getAll();
    const deduplicated = history.filter((existing) => existing.content !== item.content);
    const updated = [item, ...deduplicated].slice(0, maxItems);
    store.set('history', updated);
  }

  async getAll() {
    const store = await this.storePromise;
    return store.get('history');
  }

  async clear() {
    const store = await this.storePromise;
    store.set('history', []);
  }

  async setMaxItems(maxItems: number) {
    const store = await this.storePromise;
    store.set('preferences.maxItems', maxItems);
  }

  async getMaxItems() {
    const store = await this.storePromise;
    return store.get('preferences.maxItems');
  }
}

export const clipboardHistoryStore = new ClipboardHistoryStore();
