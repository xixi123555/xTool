/**
 * 快捷键模型
 */
import pool from '../config/database.js';

// 默认快捷键配置
const DEFAULT_SHORTCUTS = {
  screenshot: 'Alt+S',
};

export class Shortcut {
  /**
   * 获取用户的快捷键配置（只返回与默认值不同的）
   */
  static async getUserShortcuts(userId) {
    const [rows] = await pool.execute(
      'SELECT action_name, shortcut FROM shortcuts WHERE user_id = ?',
      [userId]
    );

    const customShortcuts = {};
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
  static async upsert(userId, actionName, shortcut) {
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
  static async getByUserAndAction(userId, actionName) {
    const [rows] = await pool.execute(
      'SELECT * FROM shortcuts WHERE user_id = ? AND action_name = ?',
      [userId, actionName]
    );
    return rows[0] || null;
  }

  /**
   * 删除用户的快捷键（恢复为默认值）
   */
  static async delete(userId, actionName) {
    await pool.execute(
      'DELETE FROM shortcuts WHERE user_id = ? AND action_name = ?',
      [userId, actionName]
    );
  }

  /**
   * 获取默认快捷键
   */
  static getDefaultShortcut(actionName) {
    return DEFAULT_SHORTCUTS[actionName] || null;
  }
}

