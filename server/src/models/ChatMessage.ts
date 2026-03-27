/**
 * 聊天消息模型
 */
import pool from '../config/database.js';
import { ChatMessage, ChatMessagePart } from '../types/index.js';

/** LIMIT 不能安全用作部分 MySQL/mysqld 下的 stmt 占位符，需内联整数 */
function clampLimit(limit: number): number {
  const n = Math.floor(Number(limit));
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 500);
}

export class ChatMessageModel {
  static async create(
    roomId: string,
    userId: number,
    parts: ChatMessagePart[]
  ): Promise<ChatMessage> {
    const [result] = (await pool.execute(
      'INSERT INTO chat_messages (room_id, user_id, content_json) VALUES (?, ?, ?)',
      [roomId, userId, JSON.stringify(parts)]
    )) as [any, any];

    const id = result.insertId;
    const msg = await this.getById(id);
    if (!msg) throw new Error('消息创建后查询失败');
    return msg;
  }

  static async getById(id: number): Promise<ChatMessage | null> {
    const [rows] = (await pool.execute(
      `SELECT m.id, m.room_id, m.user_id, m.content_json, m.created_at,
              u.username, u.avatar
       FROM chat_messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [id]
    )) as [any[], any];

    if (rows.length === 0) return null;
    return this.formatRow(rows[0]);
  }

  static async getMessages(
    roomId: string,
    limit: number = 50,
    beforeId?: number
  ): Promise<ChatMessage[]> {
    let sql = `SELECT m.id, m.room_id, m.user_id, m.content_json, m.created_at,
                      u.username, u.avatar
               FROM chat_messages m
               LEFT JOIN users u ON m.user_id = u.id
               WHERE m.room_id = ?`;
    const params: any[] = [roomId];

    if (beforeId != null && beforeId !== undefined) {
      sql += ' AND m.id < ?';
      params.push(Number(beforeId));
    }

    const lim = clampLimit(limit);
    sql += ` ORDER BY m.id DESC LIMIT ${lim}`;

    const [rows] = (await pool.execute(sql, params)) as [any[], any];
    return rows.map((r: any) => this.formatRow(r)).reverse();
  }

  /** 不限房间，按全局消息 id 分页（用于聊天室查看全部历史含其他 room_id） */
  static async getMessagesAllRooms(
    limit: number = 50,
    beforeId?: number
  ): Promise<ChatMessage[]> {
    let sql = `SELECT m.id, m.room_id, m.user_id, m.content_json, m.created_at,
                      u.username, u.avatar
               FROM chat_messages m
               LEFT JOIN users u ON m.user_id = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (beforeId != null && beforeId !== undefined) {
      sql += ' AND m.id < ?';
      params.push(Number(beforeId));
    }

    const lim = clampLimit(limit);
    sql += ` ORDER BY m.id DESC LIMIT ${lim}`;

    const [rows] = (await pool.execute(sql, params)) as [any[], any];
    return rows.map((r: any) => this.formatRow(r)).reverse();
  }

  private static formatRow(row: any): ChatMessage {
    let parts: ChatMessagePart[];
    try {
      parts =
        typeof row.content_json === 'string'
          ? JSON.parse(row.content_json)
          : row.content_json;
    } catch {
      parts = [{ type: 'text', text: String(row.content_json) }];
    }

    return {
      id: row.id,
      room_id: row.room_id,
      user_id: row.user_id,
      content_json: parts,
      created_at: row.created_at,
      username: row.username || '未知',
      avatar: row.avatar || null,
    };
  }
}
