import type Store from 'electron-store';

type ScreenshotHistoryItem = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

type ScreenshotHistorySchema = {
  screenshots: ScreenshotHistoryItem[];
};

let storeConstructorPromise: Promise<typeof Store> | undefined;

async function resolveStoreConstructor() {
  if (!storeConstructorPromise) {
    storeConstructorPromise = import('electron-store').then((module) => module.default);
  }
  return storeConstructorPromise;
}

class ScreenshotHistoryStore {
  private storePromise: Promise<Store<ScreenshotHistorySchema>>;

  constructor() {
    this.storePromise = this.createStore();
  }

  private async createStore() {
    const Store = await resolveStoreConstructor();
    return new Store<ScreenshotHistorySchema>({
      name: 'screenshot-history',
      defaults: {
        screenshots: [],
      },
    });
  }

  async add(item: ScreenshotHistoryItem) {
    const store = await this.storePromise;
    const screenshots = await this.getAll();
    const updated = [item, ...screenshots].slice(0, 10);
    store.set('screenshots', updated);
  }

  async getAll() {
    const store = await this.storePromise;
    return store.get('screenshots');
  }
}

export const screenshotHistoryStore = new ScreenshotHistoryStore();
export type { ScreenshotHistoryItem };
