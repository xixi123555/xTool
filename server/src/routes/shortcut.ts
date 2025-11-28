/**
 * 快捷键路由
 */
import express, { Request, Response } from 'express';
import { Shortcut } from '../models/Shortcut.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

// 所有路由都需要认证
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

/**
 * 获取用户的所有自定义快捷键
 */
router.get('/all', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const userId = typedReq.user.id;
    const shortcuts = await Shortcut.getUserShortcuts(userId);

    res.json({
      success: true,
      shortcuts,
    });
  } catch (error) {
    console.error('获取快捷键错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface SaveShortcutRequest extends AuthenticatedRequest {
  body: {
    actionName: string;
    shortcut: string;
  };
}

/**
 * 保存或更新快捷键
 */
router.post('/save', async (req: Request, res: Response) => {
  const typedReq = req as unknown as SaveShortcutRequest;
  try {
    const { actionName, shortcut } = typedReq.body;
    const userId = typedReq.user.id;

    if (!actionName || !shortcut) {
      res.status(400).json({ error: 'actionName 和 shortcut 不能为空' });
      return;
    }

    await Shortcut.upsert(userId, actionName, shortcut);

    res.json({
      success: true,
      message: '快捷键保存成功',
    });
  } catch (error) {
    console.error('保存快捷键错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

/**
 * 删除快捷键（恢复为默认值）
 */
router.delete('/delete/:actionName', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { actionName } = typedReq.params;
    const userId = typedReq.user.id;

    await Shortcut.delete(userId, actionName);

    res.json({
      success: true,
      message: '快捷键已恢复为默认值',
    });
  } catch (error) {
    console.error('删除快捷键错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;

