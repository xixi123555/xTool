import type Store from 'electron-store';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TodoCard = {
  id: string;
  name: string;
  items: TodoItem[];
  starred: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isOnlineData?: boolean; // 是否已同步到在线数据库
};

type TodoStoreSchema = {
  cards: TodoCard[];
};

let storeConstructorPromise: Promise<typeof Store> | undefined;

async function resolveStoreConstructor() {
  if (!storeConstructorPromise) {
    storeConstructorPromise = import('electron-store').then((module) => module.default);
  }
  return storeConstructorPromise;
}

class TodoStore {
  private storePromise: Promise<Store<TodoStoreSchema>>;

  constructor() {
    this.storePromise = this.createStore();
  }

  private async createStore() {
    const Store = await resolveStoreConstructor();
    return new Store<TodoStoreSchema>({
      name: 'todo-list',
      defaults: {
        cards: [],
      },
      migrations: {
        '1.0.0': (store: any) => {
          // 迁移旧数据：为没有 starred 和 tags 字段的卡片添加默认值
          const cards = store.get('cards');
          if (Array.isArray(cards)) {
            const migratedCards = cards.map((card: any) => ({
              ...card,
              starred: card.starred ?? false,
              tags: card.tags ?? [],
            }));
            store.set('cards', migratedCards);
          }
        },
      },
    });
  }

  async addCard(card: TodoCard) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = [card, ...cards];
    store.set('cards', updated);
  }

  async getAll() {
    const store = await this.storePromise;
    return store.get('cards');
  }

  async updateCard(id: string, updates: Partial<Omit<TodoCard, 'id'>>) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = cards.map((card) =>
      card.id === id ? { ...card, ...updates, updatedAt: Date.now() } : card
    );
    store.set('cards', updated);
  }

  async deleteCard(id: string) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = cards.filter((card) => card.id !== id);
    store.set('cards', updated);
  }

  async addItemToCard(cardId: string, item: TodoItem) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = cards.map((card) => {
      if (card.id === cardId) {
        return {
          ...card,
          items: [item, ...card.items],
          updatedAt: Date.now(),
        };
      }
      return card;
    });
    store.set('cards', updated);
  }

  async updateItemInCard(cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = cards.map((card) => {
      if (card.id === cardId) {
        return {
          ...card,
          items: card.items.map((item) =>
            item.id === itemId ? { ...item, ...updates, updatedAt: Date.now() } : item
          ),
          updatedAt: Date.now(),
        };
      }
      return card;
    });
    store.set('cards', updated);
  }

  async deleteItemFromCard(cardId: string, itemId: string) {
    const store = await this.storePromise;
    const cards = await this.getAll();
    const updated = cards.map((card) => {
      if (card.id === cardId) {
        return {
          ...card,
          items: card.items.filter((item) => item.id !== itemId),
          updatedAt: Date.now(),
        };
      }
      return card;
    });
    store.set('cards', updated);
  }
}

export const todoStore = new TodoStore();
export type { TodoItem };

