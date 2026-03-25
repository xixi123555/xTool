/**
 * MCP Key 路由
 */
import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { McpKey } from '../models/McpKey.js';

const router = express.Router();

// 所有路由都需要认证（支持 JWT 与 MCP Key 鉴权）
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

function assertNotGuest(req: AuthenticatedRequest, res: Response): boolean {
  if (req.user.user_type === 'guest') {
    res.status(403).json({ error: '路人用户不允许使用 MCP Key 模块' });
    return false;
  }
  return true;
}

/**
 * 生成 MCP Key
 */
router.post('/generate', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    if (!assertNotGuest(typedReq, res)) return;

    const userId = typedReq.user.id;
    const created = await McpKey.createForUser(userId);

    res.json({
      success: true,
      mcpKey: {
        id: created.id,
        key: created.key, // 明文只返回一次
        mask: created.mask,
        created_at: created.created_at,
      },
    });
  } catch (error: any) {
    const message = error?.message || '生成失败';
    const status = message.includes('最多只能生成') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * 获取当前用户的 MCP Key 列表
 */
router.get('/all', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    if (!assertNotGuest(typedReq, res)) return;

    const userId = typedReq.user.id;
    const keys = await McpKey.listByUserId(userId);

    res.json({
      success: true,
      keys,
    });
  } catch (error) {
    console.error('获取 MCP Key 错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * 删除 MCP Key
 */
router.delete('/delete/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    if (!assertNotGuest(typedReq, res)) return;

    const { id } = req.params;
    const keyId = parseInt(id, 10);
    if (Number.isNaN(keyId)) {
      res.status(400).json({ error: '无效的 key id' });
      return;
    }

    await McpKey.deleteById(keyId, typedReq.user.id);
    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除 MCP Key 错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;

