/**
 * 记账用途模型（可编辑标签，支持默认用途）
 */
import pool from '../config/database.js';

export interface BookkeepingPurposeRow {
  id: number;
  name: string;
  is_default: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export class BookkeepingPurpose {
  /**
   * 获取所有用途（默认用途排最前，其余按 sort_order、id）
   */
  static async getAll(): Promise<BookkeepingPurposeRow[]> {
    const [rows] = await pool.execute(
      `SELECT id, name, is_default, sort_order, created_at, updated_at
       FROM bookkeeping_purposes
       ORDER BY is_default DESC, sort_order ASC, id ASC`,
      []
    ) as [any[], any];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      is_default: row.is_default,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 新增用途
   */
  static async create(name: string): Promise<number> {
    const [result] = await pool.execute(
      `INSERT INTO bookkeeping_purposes (name, is_default, sort_order) VALUES (?, 0, 999)`,
      [name.trim()]
    ) as [any, any];
    return result.insertId;
  }

  /**
   * 更新用途名称
   */
  static async update(id: number, name: string): Promise<void> {
    await pool.execute(
      `UPDATE bookkeeping_purposes SET name = ? WHERE id = ?`,
      [name.trim(), id]
    );
  }

  /**
   * 删除用途（不检查是否被记录引用，记录中保留原文本）
   */
  static async delete(id: number): Promise<void> {
    await pool.execute(`DELETE FROM bookkeeping_purposes WHERE id = ?`, [id]);
  }

  /**
   * 设为默认用途（将当前项 is_default=1，其余置为 0）
   */
  static async setDefault(id: number): Promise<void> {
    await pool.execute(
      `UPDATE bookkeeping_purposes SET is_default = 0 WHERE 1 = 1`
    );
    await pool.execute(
      `UPDATE bookkeeping_purposes SET is_default = 1 WHERE id = ?`,
      [id]
    );
  }
}
