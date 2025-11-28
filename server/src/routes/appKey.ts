/**
 * AppKey 路由
 */
import express, { Request, Response } from 'express';
import { AppKey } from '../models/AppKey.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

// 所有路由都需要认证
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

interface SaveAppKeyRequest extends AuthenticatedRequest {
  body: {
    keyName?: string;
    appKey: string;
    workflowType: string;
    description?: string;
  };
}

/**
 * 保存或更新 appKey
 */
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  const typedReq = req as unknown as SaveAppKeyRequest;
  try {
    const { keyName, appKey, workflowType, description } = typedReq.body;
    const userId = typedReq.user.id;

    if (!appKey || !workflowType) {
      res.status(400).json({ error: 'appKey 和 workflowType 不能为空' });
      return;
    }

    const id = await AppKey.upsert(
      userId,
      keyName || `${workflowType}_key`,
      appKey,
      workflowType,
      description || null
    );

    res.json({
      success: true,
      message: 'AppKey 保存成功',
      id,
    });
  } catch (error) {
    console.error('保存 AppKey 错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

/**
 * 根据 key_name 获取 appKey
 */
router.get('/get/:keyName', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { keyName } = typedReq.params;
    const userId = typedReq.user.id;

    if (!keyName) {
      res.status(400).json({ error: 'keyName 不能为空' });
      return;
    }

    const appKey = await AppKey.getByUserAndKeyName(userId, keyName);

    if (!appKey) {
      res.status(404).json({ error: '未找到 AppKey' });
      return;
    }

    res.json({
      success: true,
      appKey: {
        id: appKey.id,
        key_name: appKey.key_name,
        app_key: appKey.app_key,
        workflow_type: appKey.workflow_type,
        description: appKey.description || null,
      },
    });
  } catch (error) {
    console.error('获取 AppKey 错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * 获取所有 appKeys
 */
router.get('/all', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const userId = typedReq.user.id;
    const appKeys = await AppKey.getByUserId(userId);

    res.json({
      success: true,
      appKeys: appKeys.map((key) => ({
        id: key.id,
        key_name: key.key_name,
        app_key: key.app_key,
        workflow_type: key.workflow_type,
        description: key.description || null,
      })),
    });
  } catch (error) {
    console.error('获取所有 AppKey 错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface UpdateAppKeyRequest extends AuthenticatedRequest {
  body: {
    keyName?: string;
    appKey: string;
    workflowType?: string;
    description?: string;
  };
}

/**
 * 更新 appKey
 */
router.put('/update/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateAppKeyRequest;
  try {
    const { id } = typedReq.params;
    const { keyName, appKey, workflowType, description } = typedReq.body;
    const userId = typedReq.user.id;

    if (!appKey) {
      res.status(400).json({ error: 'appKey 不能为空' });
      return;
    }

    // 检查 appKey 是否属于当前用户
    const existing = await AppKey.getByUserId(userId);
    const keyExists = existing.find((k) => k.id === parseInt(id, 10));
    
    if (!keyExists) {
      res.status(404).json({ error: '未找到 AppKey' });
      return;
    }

    await AppKey.update(
      parseInt(id, 10),
      userId,
      keyName || keyExists.key_name,
      appKey,
      workflowType || keyExists.workflow_type,
      description || null
    );

    res.json({
      success: true,
      message: 'AppKey 更新成功',
    });
  } catch (error) {
    console.error('更新 AppKey 错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除 appKey
 */
router.delete('/delete/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { id } = typedReq.params;
    const userId = typedReq.user.id;

    // 检查 appKey 是否属于当前用户
    const existing = await AppKey.getByUserId(userId);
    const keyExists = existing.find((k) => k.id === parseInt(id, 10));
    
    if (!keyExists) {
      res.status(404).json({ error: '未找到 AppKey' });
      return;
    }

    await AppKey.deleteById(parseInt(id, 10), userId);

    res.json({
      success: true,
      message: 'AppKey 删除成功',
    });
  } catch (error) {
    console.error('删除 AppKey 错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;

