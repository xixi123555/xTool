/**
 * 应用配置模型
 */
import pool from '../config/database.js';
import { AppSetting as AppSettingType } from '../types/index.js';

export class AppSetting {
  /**
   * 获取用户的应用配置
   */
  static async getByUserId(userId: number): Promise<AppSettingType | null> {
    const [rows] = (await pool.execute('SELECT * FROM appsetting WHERE user_id = ?', [userId])) as [
      AppSettingType[],
      any,
    ];
    return rows[0] || null;
  }

  /**
   * 创建或更新用户的应用配置
   */
  static async upsert(
    userId: number,
    config: { theme?: 'light' | 'dark' | 'system' },
  ): Promise<void> {
    const theme = config.theme || 'system';
    await pool.execute(
      `INSERT INTO appsetting (user_id, theme)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE theme = ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, theme, theme],
    );
  }

  /**
   * 获取用户的配置，如果不存在则返回默认配置
   */
  static async getOrCreateDefault(userId: number): Promise<AppSettingType> {
    let setting = await this.getByUserId(userId);

    if (!setting) {
      await this.upsert(userId, { theme: 'system' });
      setting = await this.getByUserId(userId);
    }

    return setting!;
  }
}
