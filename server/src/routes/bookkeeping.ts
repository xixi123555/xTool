/**
 * 记账路由
 */
import express, { Request, Response } from 'express';
import { Bookkeeping } from '../models/Bookkeeping.js';
import { BookkeepingPurpose } from '../models/BookkeepingPurpose.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

// 所有路由需要认证（多人共同维护需知道当前用户）
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

// ---------- 用途 ----------
/**
 * 获取所有用途（默认用途排最前）
 */
router.get('/purposes', async (_req: Request, res: Response) => {
  try {
    const purposes = await BookkeepingPurpose.getAll();
    res.json({ success: true, purposes });
  } catch (error) {
    console.error('获取用途列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface CreatePurposeRequest extends AuthenticatedRequest {
  body: { name: string };
}

/**
 * 新增用途
 */
router.post('/purposes', async (req: Request, res: Response) => {
  const typedReq = req as unknown as CreatePurposeRequest;
  try {
    const name = typedReq.body?.name?.trim();
    if (!name) {
      res.status(400).json({ error: '用途名称不能为空' });
      return;
    }
    const id = await BookkeepingPurpose.create(name);
    res.json({ success: true, id, message: '添加成功' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: '该用途已存在' });
      return;
    }
    console.error('新增用途错误:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

/**
 * 设为默认用途（须在 PUT /purposes/:id 之前注册）
 */
router.put('/purposes/:id/default', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的 ID' });
      return;
    }
    await BookkeepingPurpose.setDefault(id);
    res.json({ success: true, message: '已设为默认' });
  } catch (error) {
    console.error('设为默认用途错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

interface UpdatePurposeRequest extends AuthenticatedRequest {
  body: { name: string };
  params: { id: string };
}

/**
 * 更新用途名称
 */
router.put('/purposes/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdatePurposeRequest;
  try {
    const id = parseInt(typedReq.params.id, 10);
    const name = typedReq.body?.name?.trim();
    if (isNaN(id) || !name) {
      res.status(400).json({ error: 'ID 或名称无效' });
      return;
    }
    await BookkeepingPurpose.update(id, name);
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: '该用途已存在' });
      return;
    }
    console.error('更新用途错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除用途
 */
router.delete('/purposes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的 ID' });
      return;
    }
    await BookkeepingPurpose.delete(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除用途错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ---------- 记录 ----------
/**
 * 获取所有记账记录
 */
router.get('/records', async (_req: Request, res: Response) => {
  try {
    const records = await Bookkeeping.getAllRecords();
    res.json({ success: true, records });
  } catch (error) {
    console.error('获取记账记录错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface CreateRecordRequest extends AuthenticatedRequest {
  body: {
    purpose: string;
    description?: string;
    amount: number;
    type: 'expense' | 'income';
  };
}

/**
 * 创建记账记录（使用服务器当前时间）
 */
router.post('/records', async (req: Request, res: Response) => {
  const typedReq = req as unknown as CreateRecordRequest;
  try {
    const { purpose, description, amount, type } = typedReq.body;
    const userId = typedReq.user.id;

    if (!purpose || amount === undefined || amount === null) {
      res.status(400).json({ error: '用途和金额不能为空' });
      return;
    }

    const recordType = type === 'income' ? 'income' : 'expense';

    const id = await Bookkeeping.create(userId, {
      purpose,
      description: description || '',
      amount: Number(amount),
      type: recordType,
    });

    res.json({ success: true, id, message: '添加成功' });
  } catch (error) {
    console.error('创建记账记录错误:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

interface UpdateRecordRequest extends AuthenticatedRequest {
  body: {
    purpose?: string;
    description?: string;
    amount?: number;
    type?: 'expense' | 'income';
  };
  params: { id: string };
}

/**
 * 更新记账记录（仅创建者可更新）
 */
router.put('/records/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateRecordRequest;
  try {
    const id = parseInt(typedReq.params.id, 10);
    const userId = typedReq.user.id;
    const { purpose, description, amount, type } = typedReq.body;

    if (isNaN(id)) {
      res.status(400).json({ error: '无效的 ID' });
      return;
    }

    await Bookkeeping.update(id, userId, {
      purpose,
      description,
      amount: amount !== undefined ? Number(amount) : undefined,
      type,
    });

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新记账记录错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除记账记录（仅创建者可删除）
 */
router.delete('/records/:id', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const id = parseInt(typedReq.params.id, 10);
    const userId = typedReq.user.id;

    if (isNaN(id)) {
      res.status(400).json({ error: '无效的 ID' });
      return;
    }

    await Bookkeeping.delete(id, userId);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除记账记录错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
