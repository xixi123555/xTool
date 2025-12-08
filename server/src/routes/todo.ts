/**
 * 待办事项路由
 */
import express, { Request, Response } from 'express';
import { Todo } from '../models/Todo.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();

// 所有路由都需要认证
router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

/**
 * 获取用户的所有待办卡片
 */
router.get('/cards', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const userId = typedReq.user.id;
    const cards = await Todo.getCardsByUserId(userId);

    res.json({
      success: true,
      cards,
    });
  } catch (error) {
    console.error('获取待办卡片错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

interface CreateCardRequest extends AuthenticatedRequest {
  body: {
    id: string;
    name: string;
    starred?: boolean;
    tags?: string[];
  };
}

/**
 * 创建待办卡片
 */
router.post('/cards', async (req: Request, res: Response) => {
  const typedReq = req as unknown as CreateCardRequest;
  try {
    const { id, name, starred, tags: tagsArray } = typedReq.body;
    const tags = tagsArray ? tagsArray.join(',') : '';
    const userId = typedReq.user.id;

    if (!id || !name) {
      res.status(400).json({ error: 'id 和 name 不能为空' });
      return;
    }
    // 卡片id存在则更新，不存在则创建
    const card = await Todo.getCardById(id);
    console.log('card', card);
    if (card) {
      await Todo.updateCard(id, userId, { name, starred, tags });
    } else {
      await Todo.createCard(userId, { id, name, starred, tags });
    }

    res.json({
      success: true,
      message: '卡片创建成功',
    });
  } catch (error) {
    console.error('创建待办卡片错误:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

interface UpdateCardRequest extends AuthenticatedRequest {
  body: {
    name?: string;
    starred?: boolean;
    tags?: string[];
  };
  params: {
    cardId: string;
  };
}

/**
 * 更新待办卡片
 */
router.put('/cards/:cardId', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateCardRequest;
  try {
    const { cardId } = typedReq.params;
    const { name, starred, tags: tagsArray } = typedReq.body;
    const tags = tagsArray ? tagsArray.join(',') : '';
    const userId = typedReq.user.id;

    await Todo.updateCard(cardId, userId, { name, starred, tags });

    res.json({
      success: true,
      message: '卡片更新成功',
    });
  } catch (error) {
    console.error('更新待办卡片错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除待办卡片（逻辑删除）
 */
router.delete('/cards/:cardId', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { cardId } = typedReq.params;
    const userId = typedReq.user.id;

    await Todo.deleteCard(cardId, userId);

    res.json({
      success: true,
      message: '卡片删除成功',
    });
  } catch (error) {
    console.error('删除待办卡片错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

interface CreateItemRequest extends AuthenticatedRequest {
  body: {
    id: string;
    card_id: string;
    content: string;
    completed?: boolean;
  };
}

/**
 * 创建待办项
 */
router.post('/items', async (req: Request, res: Response) => {
  const typedReq = req as unknown as CreateItemRequest;
  try {
    const { id, card_id, content, completed } = typedReq.body;

    if (!id || !card_id || !content) {
      res.status(400).json({ error: 'id、card_id 和 content 不能为空' });
      return;
    }

    await Todo.createItem({ id, card_id, content, completed });

    res.json({
      success: true,
      message: '待办项创建成功',
    });
  } catch (error) {
    console.error('创建待办项错误:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

interface UpdateItemRequest extends AuthenticatedRequest {
  body: {
    content?: string;
    completed?: boolean;
  };
  params: {
    itemId: string;
    cardId: string;
  };
}

/**
 * 更新待办项
 */
router.put('/items/:itemId/cards/:cardId', async (req: Request, res: Response) => {
  const typedReq = req as unknown as UpdateItemRequest;
  try {
    const { itemId, cardId } = typedReq.params;
    const { content, completed } = typedReq.body;

    await Todo.updateItem(itemId, cardId, { content, completed });

    res.json({
      success: true,
      message: '待办项更新成功',
    });
  } catch (error) {
    console.error('更新待办项错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除待办项（逻辑删除）
 */
router.delete('/items/:itemId/cards/:cardId', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { itemId, cardId } = typedReq.params;

    await Todo.deleteItem(itemId, cardId);

    res.json({
      success: true,
      message: '待办项删除成功',
    });
  } catch (error) {
    console.error('删除待办项错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;

