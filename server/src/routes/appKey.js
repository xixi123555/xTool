/**
 * AppKey 路由
 */
import express from 'express';
import { AppKey } from '../models/AppKey.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * 保存或更新 appKey
 */
router.post('/save', async (req, res) => {
  try {
    const { keyName, appKey, workflowType, description } = req.body;
    const userId = req.user.id;

    if (!appKey || !workflowType) {
      return res.status(400).json({ error: 'appKey 和 workflowType 不能为空' });
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
router.get('/get/:keyName', async (req, res) => {
  try {
    const { keyName } = req.params;
    const userId = req.user.id;

    if (!keyName) {
      return res.status(400).json({ error: 'keyName 不能为空' });
    }

    const appKey = await AppKey.getByUserAndKeyName(userId, keyName);

    if (!appKey) {
      return res.status(404).json({ error: '未找到 AppKey' });
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
router.get('/all', async (req, res) => {
  try {
    const userId = req.user.id;
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

/**
 * 更新 appKey
 */
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keyName, appKey, workflowType, description } = req.body;
    const userId = req.user.id;

    if (!appKey) {
      return res.status(400).json({ error: 'appKey 不能为空' });
    }

    // 检查 appKey 是否属于当前用户
    const existing = await AppKey.getByUserId(userId);
    const keyExists = existing.find((k) => k.id === parseInt(id));
    
    if (!keyExists) {
      return res.status(404).json({ error: '未找到 AppKey' });
    }

    await AppKey.update(parseInt(id), userId, keyName, appKey, workflowType, description || null);

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
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查 appKey 是否属于当前用户
    const existing = await AppKey.getByUserId(userId);
    const keyExists = existing.find((k) => k.id === parseInt(id));
    
    if (!keyExists) {
      return res.status(404).json({ error: '未找到 AppKey' });
    }

    await AppKey.deleteById(parseInt(id), userId);

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

