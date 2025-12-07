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
    const [rows] = await pool.execute(
      'SELECT * FROM appsetting WHERE user_id = ?',
      [userId]
    ) as [AppSettingType[], any];
    return rows[0] || null;
  }

  /**
   * 创建或更新用户的应用配置
   */
  static async upsert(userId: number, config: { use_local_data: boolean; theme?: 'light' | 'dark' | 'colorful' }): Promise<void> {
    const theme = config.theme || 'light';
    await pool.execute(
      `INSERT INTO appsetting (user_id, use_local_data, theme) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE use_local_data = ?, theme = ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, config.use_local_data, theme, config.use_local_data, theme]
    );
  }

  /**
   * 获取用户的配置，如果不存在则返回默认配置
   */
  static async getOrCreateDefault(userId: number): Promise<AppSettingType> {
    let setting = await this.getByUserId(userId);
    
    if (!setting) {
      // 创建默认配置（使用本地数据，light主题）
      await this.upsert(userId, { use_local_data: true, theme: 'light' });
      setting = await this.getByUserId(userId);
    }
    
    return setting!;
  }
}

