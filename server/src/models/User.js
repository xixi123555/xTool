/**
 * 用户模型
 */
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

export class User {
  /**
   * 创建用户
   */
  static async create(username, password, email = null, userType = 'normal') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email, user_type) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, userType]
    );
    return result.insertId;
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * 根据 ID 查找用户
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, username, email, user_type, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 创建路人用户
   */
  static async createGuest() {
    const guestUsername = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestPassword = Math.random().toString(36).substr(2, 20);
    const userId = await this.create(guestUsername, guestPassword, null, 'guest');
    return { id: userId, username: guestUsername, user_type: 'guest' };
  }
}

