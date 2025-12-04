/**
 * 待办事项模型
 */
import pool from '../config/database.js';
import { TodoCard } from '../types/index.js';

export class Todo {
  /**
   * 获取用户的所有待办卡片（包含未删除的项）
   */
  static async getCardsByUserId(userId: number): Promise<TodoCard[]> {
    const [cards] = await pool.execute(
      `SELECT id, user_id, name, starred, tags, deleted, created_at, updated_at 
       FROM todo_cards 
       WHERE user_id = ? AND deleted = FALSE 
       ORDER BY starred DESC, created_at DESC`,
      [userId]
    ) as [any[], any];

    const cardsWithItems: TodoCard[] = [];
    for (const card of cards) {
      const [items] = await pool.execute(
        `SELECT id, card_id, content, completed, deleted, created_at, updated_at 
         FROM todo_items 
         WHERE card_id = ? AND deleted = FALSE 
         ORDER BY created_at ASC`,
        [card.id]
      ) as [any[], any];

      cardsWithItems.push({
        id: card.id,
        user_id: card.user_id,
        name: card.name,
        starred: Boolean(card.starred),
        tags: (card.tags || '').split(','),
        deleted: Boolean(card.deleted),
        created_at: card.created_at,
        updated_at: card.updated_at,
        items: items.map((item: any) => ({
          id: item.id,
          card_id: item.card_id,
          content: item.content,
          completed: Boolean(item.completed),
          deleted: Boolean(item.deleted),
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
      });
    }

    return cardsWithItems;
  }

  /**
   * 创建待办卡片
   */
  static async createCard(userId: number, card: { id: string; name: string; starred?: boolean; tags?: string }): Promise<void> {
    await pool.execute(
      `INSERT INTO todo_cards (id, user_id, name, starred, tags, deleted, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, FALSE, ?, ?)`,
      [
        card.id,
        userId,
        card.name,
        card.starred || false,
        card.tags,
        Date.now(),
        Date.now(),
      ]
    );
  }

  /**
   * 更新待办卡片
   */
  static async updateCard(cardId: string, userId: number, updates: { name?: string; starred?: boolean; tags?: string }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.starred !== undefined) {
      fields.push('starred = ?');
      values.push(updates.starred);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(cardId, userId);

    await pool.execute(
      `UPDATE todo_cards SET ${fields.join(', ')} WHERE id = ? AND user_id = ? AND deleted = FALSE`,
      values
    );
  }
  /**
   * 获取待办卡片
   */
  static async getCardById(cardId: string): Promise<TodoCard | null> {
    const [cards] = await pool.execute(
      `SELECT id, user_id, name, starred, tags, deleted, created_at, updated_at FROM todo_cards WHERE id = ? AND deleted = FALSE`,
      [cardId]
    ) as [any[], any];

    if (cards.length === 0) {
      return null;
    }

    const card = cards[0];
    console.log('card111', card);
    // 查询该卡片下的所有项
    const [items] = await pool.execute(
      `SELECT id, card_id, content, completed, deleted, created_at, updated_at 
       FROM todo_items 
       WHERE card_id = ? AND deleted = FALSE 
       ORDER BY created_at ASC`,
      [card.id]
    ) as [any[], any];

    return {
      id: card.id,
      user_id: card.user_id,
      name: card.name,
      starred: Boolean(card.starred),
      tags: card.tags ? card.tags.split(',') : [],
      deleted: Boolean(card.deleted),
      created_at: card.created_at,
      updated_at: card.updated_at,
      items: items.map((item: any) => ({
        id: item.id,
        card_id: item.card_id,
        content: item.content,
        completed: Boolean(item.completed),
        deleted: Boolean(item.deleted),
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    };
  }
  /**
   * 逻辑删除待办卡片
   */
  static async deleteCard(cardId: string, userId: number): Promise<void> {
    await pool.execute(
      `UPDATE todo_cards SET deleted = TRUE, updated_at = ? WHERE id = ? AND user_id = ?`,
      [Date.now(), cardId, userId]
    );
    // 同时逻辑删除该卡片下的所有项
    await pool.execute(
      `UPDATE todo_items SET deleted = TRUE, updated_at = ? WHERE card_id = ?`,
      [Date.now(), cardId]
    );
  }

  /**
 * 创建待办项（如果 ID 已存在则更新，支持恢复逻辑删除的记录）
 */
static async createItem(item: { id: string; card_id: string; content: string; completed?: boolean }): Promise<void> {
  await pool.execute(
    `INSERT INTO todo_items (id, card_id, content, completed, deleted, created_at, updated_at) 
     VALUES (?, ?, ?, ?, FALSE, ?, ?)
     ON DUPLICATE KEY UPDATE 
       card_id = VALUES(card_id),
       content = VALUES(content),
       completed = VALUES(completed),
       deleted = FALSE,
       updated_at = VALUES(updated_at)`,
    [
      item.id,
      item.card_id,
      item.content,
      item.completed || false,
      Date.now(),
      Date.now(),
    ]
  );
}

  /**
   * 更新待办项
   */
  static async updateItem(itemId: string, cardId: string, updates: { content?: string; completed?: boolean }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(itemId, cardId);

    await pool.execute(
      `UPDATE todo_items SET ${fields.join(', ')} WHERE id = ? AND card_id = ? AND deleted = FALSE`,
      values
    );
  }

  /**
   * 逻辑删除待办项
   */
  static async deleteItem(itemId: string, cardId: string): Promise<void> {
    await pool.execute(
      `UPDATE todo_items SET deleted = TRUE, updated_at = ? WHERE id = ? AND card_id = ?`,
      [Date.now(), itemId, cardId]
    );
  }
}

