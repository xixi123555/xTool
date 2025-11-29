/**
 * 用户模型
 */
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { User as UserType, UserType as UserTypeEnum } from '../types/index.js';

export class User {
  /**
   * 创建用户
   */
  static async create(
    username: string,
    password: string,
    email: string | null = null,
    userType: UserTypeEnum = 'normal'
  ): Promise<number> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email, user_type) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, userType]
    ) as [any, any];
    return result.insertId;
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username: string): Promise<UserType | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    ) as [UserType[], any];
    return rows[0] || null;
  }

  /**
   * 根据 ID 查找用户
   */
  static async findById(id: number): Promise<UserType | null> {
    const [rows] = await pool.execute(
      'SELECT id, username, email, user_type, created_at FROM users WHERE id = ?',
      [id]
    ) as [UserType[], any];
    return rows[0] || null;
  }

  /**
   * 根据邮箱查找用户
   */
  static async findByEmail(email: string): Promise<UserType | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as [UserType[], any];
    return rows[0] || null;
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 创建路人用户
   */
  static async createGuest(): Promise<{ id: number; username: string; user_type: UserTypeEnum }> {
    const guestUsername = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const guestPassword = Math.random().toString(36).substring(2, 22);
    const userId = await this.create(guestUsername, guestPassword, null, 'guest');
    return { id: userId, username: guestUsername, user_type: 'guest' };
  }

  /**
   * 更新用户信息
   */
  static async update(id: number, updates: { username?: string; email?: string | null; avatar?: string | null }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}

