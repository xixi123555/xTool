/**
 * MCP Key 模型
 * - 明文 key 不落库，只存 sha256 hash
 * - 支持每个用户最多 10 个 key，可列表/删除
 */
import { createHash, randomBytes } from 'crypto';
import pool from '../config/database.js';
import { User as UserType } from '../types/index.js';

export class McpKey {
  private static sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private static buildHint(keyPlain: string): string {
    const head = keyPlain.slice(0, 6);
    const tail = keyPlain.slice(-4);
    return `${head}****${tail}`;
  }

  /**
   * 为用户生成一个 MCP Key（明文只返回一次）
   */
  static async createForUser(userId: number): Promise<{ id: number; key: string; mask: string; created_at: Date }> {
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM mcp_keys WHERE user_id = ?',
      [userId]
    ) as [Array<{ cnt: number }>, any];

    const count = Number(countRows[0]?.cnt ?? 0);
    if (count >= 10) {
      throw new Error('最多只能生成 10 个 MCP Key');
    }

    const keyPlain = randomBytes(32).toString('base64url');
    const keyHash = this.sha256Hex(keyPlain);
    const keyHint = this.buildHint(keyPlain);

    const [result] = await pool.execute(
      'INSERT INTO mcp_keys (user_id, key_hash, key_hint) VALUES (?, ?, ?)',
      [userId, keyHash, keyHint]
    ) as [any, any];

    const id = (result as any).insertId as number;

    // 读取一次 created_at，用于前端展示
    const [rows] = await pool.execute(
      'SELECT id, key_hint, created_at FROM mcp_keys WHERE id = ? AND user_id = ?',
      [id, userId]
    ) as [Array<{ id: number; key_hint: string; created_at: Date }>, any];

    const row = rows[0];
    if (!row) {
      throw new Error('MCP Key 生成成功但读取失败');
    }

    return { id: row.id, key: keyPlain, mask: row.key_hint, created_at: row.created_at };
  }

  /**
   * 列出用户所有 MCP Keys（掩码）
   */
  static async listByUserId(userId: number): Promise<Array<{ id: number; mask: string; created_at: Date }>> {
    const [rows] = await pool.execute(
      'SELECT id, key_hint, created_at FROM mcp_keys WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ) as [Array<{ id: number; key_hint: string; created_at: Date }>, any];

    return rows.map((r) => ({ id: r.id, mask: r.key_hint, created_at: r.created_at }));
  }

  /**
   * 删除用户指定 MCP Key
   */
  static async deleteById(id: number, userId: number): Promise<void> {
    await pool.execute(
      'DELETE FROM mcp_keys WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  /**
   * 通过明文 mcp_key 获取用户（鉴权使用）
   */
  static async getUserByMcpKey(keyPlain: string): Promise<UserType | null> {
    const keyHash = this.sha256Hex(keyPlain);

    const [rows] = await pool.execute(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.avatar,
          u.user_type,
          u.created_at,
          u.updated_at
        FROM mcp_keys k
        INNER JOIN users u ON u.id = k.user_id
        WHERE k.key_hash = ?
        LIMIT 1
      `,
      [keyHash]
    ) as [UserType[], any];

    return rows[0] || null;
  }
}

