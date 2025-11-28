/**
 * AppKey 模型
 */
import pool from '../config/database.js';
import { AppKey as AppKeyType } from '../types/index.js';

export class AppKey {
  /**
   * 创建或更新 appKey
   */
  static async upsert(
    userId: number,
    keyName: string,
    appKey: string,
    workflowType: string,
    description: string | null = null
  ): Promise<number> {
    // 检查是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM app_keys WHERE user_id = ? AND workflow_type = ?',
      [userId, workflowType]
    ) as [AppKeyType[], any];

    if (existing.length > 0) {
      // 更新
      await pool.execute(
        'UPDATE app_keys SET key_name = ?, app_key = ?, description = ? WHERE user_id = ? AND workflow_type = ?',
        [keyName, appKey, description, userId, workflowType]
      );
      return existing[0].id;
    } else {
      // 插入
      const [result] = await pool.execute(
        'INSERT INTO app_keys (user_id, key_name, app_key, workflow_type, description) VALUES (?, ?, ?, ?, ?)',
        [userId, keyName, appKey, workflowType, description]
      ) as [any, any];
      return result.insertId;
    }
  }

  /**
   * 根据用户 ID 和 workflow 类型获取 appKey
   */
  static async getByUserAndWorkflow(userId: number, workflowType: string): Promise<AppKeyType | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM app_keys WHERE user_id = ? AND workflow_type = ?',
      [userId, workflowType]
    ) as [AppKeyType[], any];
    return rows[0] || null;
  }

  /**
   * 根据用户 ID 和 key_name 获取 appKey
   */
  static async getByUserAndKeyName(userId: number, keyName: string): Promise<AppKeyType | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM app_keys WHERE user_id = ? AND key_name = ?',
      [userId, keyName]
    ) as [AppKeyType[], any];
    return rows[0] || null;
  }

  /**
   * 获取用户的所有 appKeys
   */
  static async getByUserId(userId: number): Promise<AppKeyType[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM app_keys WHERE user_id = ?',
      [userId]
    ) as [AppKeyType[], any];
    return rows;
  }

  /**
   * 删除 appKey（根据 workflowType）
   */
  static async delete(userId: number, workflowType: string): Promise<void> {
    await pool.execute(
      'DELETE FROM app_keys WHERE user_id = ? AND workflow_type = ?',
      [userId, workflowType]
    );
  }

  /**
   * 根据 ID 删除 appKey
   */
  static async deleteById(id: number, userId: number): Promise<void> {
    await pool.execute(
      'DELETE FROM app_keys WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  /**
   * 更新 appKey
   */
  static async update(
    id: number,
    userId: number,
    keyName: string,
    appKey: string,
    workflowType: string,
    description: string | null = null
  ): Promise<void> {
    await pool.execute(
      'UPDATE app_keys SET key_name = ?, app_key = ?, workflow_type = ?, description = ? WHERE id = ? AND user_id = ?',
      [keyName, appKey, workflowType, description, id, userId]
    );
  }
}

