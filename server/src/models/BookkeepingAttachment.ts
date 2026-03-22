/**
 * 记账附件模型
 */
import pool from '../config/database.js';

export interface AttachmentRecord {
  id: number;
  record_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export class BookkeepingAttachment {
  static formatDate(v: Date | string | null): string {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    return d.toISOString();
  }

  static async create(data: {
    record_id: number;
    filename: string;
    original_name: string;
    mime_type: string;
    file_size: number;
  }): Promise<number> {
    const [result] = await pool.execute(
      `INSERT INTO bookkeeping_attachments (record_id, filename, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [data.record_id, data.filename, data.original_name, data.mime_type, data.file_size]
    ) as [any, any];
    return result.insertId;
  }

  static async getByRecordId(recordId: number): Promise<AttachmentRecord[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM bookkeeping_attachments WHERE record_id = ? ORDER BY created_at ASC`,
      [recordId]
    ) as [any[], any];
    return rows.map((r) => ({ ...r, created_at: BookkeepingAttachment.formatDate(r.created_at) }));
  }

  static async getById(id: number): Promise<AttachmentRecord | null> {
    const [rows] = await pool.execute(
      `SELECT * FROM bookkeeping_attachments WHERE id = ?`,
      [id]
    ) as [any[], any];
    if (rows.length === 0) return null;
    const r = rows[0];
    return { ...r, created_at: BookkeepingAttachment.formatDate(r.created_at) };
  }

  /** 删除数据库记录，返回服务器存储的文件名（用于随后删除磁盘文件） */
  static async delete(id: number): Promise<string | null> {
    const att = await BookkeepingAttachment.getById(id);
    if (!att) return null;
    await pool.execute(`DELETE FROM bookkeeping_attachments WHERE id = ?`, [id]);
    return att.filename;
  }
}
