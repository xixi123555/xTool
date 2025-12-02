/**
 * 应用配置路由
 */
import express, { Request, Response } from 'express';
import { AppSetting } from '../models/AppSetting.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

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
    const userId = typedReq.user.id;
    const setting = await AppSetting.getOrCreateDefault(userId);

    res.json({
      success: true,
      config: {
        use_local_data: setting.use_local_data,
      },
    });
  } catch (error) {
    console.error('获取应用配置错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface UpdateAppSettingRequest extends AuthenticatedRequest {
  body: {
    use_local_data: boolean;
  };
}

/**
 * 更新用户的应用配置
 */
router.put('/', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateAppSettingRequest;
  try {
    const { use_local_data } = typedReq.body;
    const userId = typedReq.user.id;

    if (typeof use_local_data !== 'boolean') {
      res.status(400).json({ error: 'use_local_data 必须是布尔值' });
      return;
    }

    await AppSetting.upsert(userId, { use_local_data });

    res.json({
      success: true,
      message: '配置保存成功',
      config: {
        use_local_data,
      },
    });
  } catch (error) {
    console.error('更新应用配置错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

export default router;

