/**
 * 快捷键模型
 */
import pool from '../config/database.js';
import { Shortcut as ShortcutType } from '../types/index.js';

// 默认快捷键配置
const DEFAULT_SHORTCUTS: Record<string, string> = {
  screenshot: 'Alt+S',
  openSettings: 'Alt+Command+S',
  showClipboard: 'Alt+Space',
};

export class Shortcut {
  /**
   * 获取用户的快捷键配置（只返回与默认值不同的）
   */
  static async getUserShortcuts(userId: number): Promise<Record<string, string>> {
    const [rows] = await pool.execute(
      'SELECT action_name, shortcut FROM shortcuts WHERE user_id = ?',
      [userId]
    ) as [Array<{ action_name: string; shortcut: string }>, any];

    const customShortcuts: Record<string, string> = {};
    rows.forEach((row) => {
      // 只返回与默认值不同的快捷键
      if (DEFAULT_SHORTCUTS[row.action_name] !== row.shortcut) {
        customShortcuts[row.action_name] = row.shortcut;
      }
    });

    return customShortcuts;
  }

  /**
   * 保存或更新用户的快捷键
   */
  static async upsert(userId: number, actionName: string, shortcut: string): Promise<void> {
    await pool.execute(
      `INSERT INTO shortcuts (user_id, action_name, shortcut) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE shortcut = ?`,
      [userId, actionName, shortcut, shortcut]
    );
  }

  /**
   * 获取用户的特定快捷键
   */
  static async getByUserAndAction(userId: number, actionName: string): Promise<ShortcutType | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM shortcuts WHERE user_id = ? AND action_name = ?',
      [userId, actionName]
    ) as [ShortcutType[], any];
    return rows[0] || null;
  }

  /**
   * 删除用户的快捷键（恢复为默认值）
   */
  static async delete(userId: number, actionName: string): Promise<void> {
    await pool.execute(
      'DELETE FROM shortcuts WHERE user_id = ? AND action_name = ?',
      [userId, actionName]
    );
  }

  /**
   * 获取默认快捷键
   */
  static getDefaultShortcut(actionName: string): string | null {
    return DEFAULT_SHORTCUTS[actionName] || null;
  }
}

