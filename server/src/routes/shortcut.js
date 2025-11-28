/**
 * 快捷键路由
 */
import express from 'express';
import { Shortcut } from '../models/Shortcut.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * 获取用户的所有自定义快捷键
 */
router.get('/all', async (req, res) => {
  try {
    const userId = req.user.id;
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

/**
 * 保存或更新快捷键
 */
router.post('/save', async (req, res) => {
  try {
    const { actionName, shortcut } = req.body;
    const userId = req.user.id;

    if (!actionName || !shortcut) {
      return res.status(400).json({ error: 'actionName 和 shortcut 不能为空' });
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
router.delete('/delete/:actionName', async (req, res) => {
  try {
    const { actionName } = req.params;
    const userId = req.user.id;

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

