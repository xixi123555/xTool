/**
 * 记账模型
 */
import pool from '../config/database.js';

export interface BookkeepingRecord {
  id: number;
  user_id: number;
  purpose: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  record_date: string;
  /** 创建时间，ISO 时间戳，前端展示时精确到秒 */
  created_at: string;
  updated_at: Date;
  username?: string;
}

export class Bookkeeping {
  /** 将 Date 转为 ISO 字符串（时间戳，供前端按本地时间精确到秒展示） */
  static formatCreatedAt(v: Date | string | null): string {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    return d.toISOString();
  }

  /**
   * 获取所有记账记录（多人共享，按创建时间倒序）
   */
  static async getAllRecords(): Promise<BookkeepingRecord[]> {
    const [rows] = await pool.execute(
      `SELECT b.id, b.user_id, b.purpose, b.description, b.amount, b.type, b.record_date, b.created_at, b.updated_at, u.username
       FROM bookkeeping_records b
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`,
      []
    ) as [any[], any];

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      purpose: row.purpose,
      description: row.description || '',
      amount: Number(row.amount),
      type: row.type,
      record_date: row.record_date instanceof Date ? row.record_date.toISOString().slice(0, 10) : String(row.record_date).slice(0, 10),
      created_at: Bookkeeping.formatCreatedAt(row.created_at),
      updated_at: row.updated_at,
      username: row.username || '未知',
    }));
  }

  /**
   * 创建记账记录（使用服务器当前时间，record_date 为当日，created_at 为时间戳）
   */
  static async create(
    userId: number,
    record: { purpose: string; description?: string; amount: number; type: 'expense' | 'income' }
  ): Promise<number> {
    const [result] = await pool.execute(
      `INSERT INTO bookkeeping_records (user_id, purpose, description, amount, type, record_date)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [
        userId,
        record.purpose,
        record.description || '',
        record.amount,
        record.type,
      ]
    ) as [any, any];

    return result.insertId;
  }

  /**
   * 更新记账记录（不再支持修改 record_date，以服务器时间为准）
   */
  static async update(
    id: number,
    userId: number,
    updates: { purpose?: string; description?: string; amount?: number; type?: 'expense' | 'income' }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.purpose !== undefined) {
      fields.push('purpose = ?');
      values.push(updates.purpose);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (fields.length === 0) return;

    values.push(id, userId);

    await pool.execute(
      `UPDATE bookkeeping_records SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
  }

  /**
   * 删除记账记录（仅创建者可删除）
   */
  static async delete(id: number, userId: number): Promise<void> {
    await pool.execute(
      `DELETE FROM bookkeeping_records WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }

  /**
   * 根据 ID 获取单条记录
   */
  static async getById(id: number): Promise<BookkeepingRecord | null> {
    const [rows] = await pool.execute(
      `SELECT b.id, b.user_id, b.purpose, b.description, b.amount, b.type, b.record_date, b.created_at, b.updated_at, u.username
       FROM bookkeeping_records b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    ) as [any[], any];

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      purpose: row.purpose,
      description: row.description || '',
      amount: Number(row.amount),
      type: row.type,
      record_date: row.record_date instanceof Date ? row.record_date.toISOString().slice(0, 10) : String(row.record_date).slice(0, 10),
      created_at: Bookkeeping.formatCreatedAt(row.created_at),
      updated_at: row.updated_at,
      username: row.username || '未知',
    };
  }
}
