/**
 * 应用配置路由
 */
import express, { Request, Response } from 'express';
import { AppSetting } from '../models/AppSetting.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();
const THEMES = ['light', 'dark', 'system'] as const;

// 所有路由都需要认证
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

/**
 * 获取用户的应用配置
 */
router.get('/', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const setting = await AppSetting.getOrCreateDefault(typedReq.user.id);
    res.json({ success: true, config: { theme: setting.theme || 'system' } });
  } catch (error) {
    console.error('获取应用配置错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface UpdateAppSettingRequest extends AuthenticatedRequest {
  body: { theme?: (typeof THEMES)[number] };
}

/**
 * 更新用户的应用配置
 */
router.put('/', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateAppSettingRequest;
  try {
    const { theme } = typedReq.body;
    if (!theme || !THEMES.includes(theme)) {
      res.status(400).json({ error: 'theme 必须是 light、dark 或 system' });
      return;
    }

    await AppSetting.upsert(typedReq.user.id, { theme });
    res.json({ success: true, message: '配置保存成功', config: { theme } });
  } catch (error) {
    console.error('更新应用配置错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

export default router;
