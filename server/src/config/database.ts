/**
 * 数据库配置和连接
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xtool_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

/**
 * 初始化数据库表
 */
export async function initDatabase(): Promise<void> {
  try {
    // 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        avatar TEXT,
        user_type ENUM('normal', 'guest') DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 如果表已存在，添加 avatar 字段（如果不存在）
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN avatar TEXT
      `);
    } catch (error: any) {
      // 如果字段已存在，忽略错误
      if (error.message?.includes('Duplicate column name') || error.code === 'ER_DUP_FIELDNAME') {
        console.log('avatar 字段已存在，跳过添加');
      } else {
        console.warn('添加 avatar 字段时出错:', error.message);
      }
    }

    // 创建 appKey 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS app_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        app_key VARCHAR(255) NOT NULL,
        workflow_type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_workflow_type (workflow_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 如果表已存在，添加 description 字段（如果不存在）
    try {
      await pool.execute(`
        ALTER TABLE app_keys 
        ADD COLUMN description TEXT
      `);
    } catch (error: any) {
      // 如果字段已存在，忽略错误
      if (error.message?.includes('Duplicate column name') || error.code === 'ER_DUP_FIELDNAME') {
        console.log('description 字段已存在，跳过添加');
      } else {
        console.warn('添加 description 字段时出错:', error.message);
      }
    }

    // 创建快捷键表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_name VARCHAR(50) NOT NULL,
        shortcut VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_action (user_id, action_name),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

export default pool;

