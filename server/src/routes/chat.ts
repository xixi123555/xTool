/**
 * 聊天 REST 路由 — 历史消息查询与 HTTP 发送（供 MCP 等外部调用）
 */
import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { ChatService } from '../service/chatService.js';

const router = express.Router();

router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

/**
 * GET /api/chat/messages?room_id=public&limit=50&before_id=100
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const beforeId = req.query.before_id
      ? Number(req.query.before_id)
      : undefined;
    const allRooms =
      req.query.all_rooms === '1' ||
      req.query.all_rooms === 'true' ||
      req.query.room_id === '__all__';

    const messages = allRooms
      ? await ChatService.getHistoryAllRooms(limit, beforeId)
      : await ChatService.getHistory(
          (req.query.room_id as string) || 'public',
          limit,
          beforeId
        );
    res.json({ success: true, messages });
  } catch (error) {
    console.error('获取聊天消息错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * POST /api/chat/send
 * body: { text?: string, parts?: ChatMessagePart[], room_id?: string }
 */
router.post('/send', async (req: Request, res: Response) => {
  const typedReq = req as unknown as AuthenticatedRequest;
  try {
    const { text, parts, room_id } = typedReq.body;
    const trimmedText = text?.trim();
    const normalizedParts = ChatService.normalizeParts(parts || []);
    if (!trimmedText && normalizedParts.length === 0) {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }

    const roomId = room_id || 'public';
    const msg =
      normalizedParts.length > 0
        ? await ChatService.sendRichMessage(typedReq.user.id, normalizedParts, roomId)
        : await ChatService.sendMessage(typedReq.user.id, trimmedText!, roomId);

    const io = req.app.locals.io;
    if (io) {
      io.emit('chat:new_message', msg);
    }

    res.json({ success: true, message: msg });
  } catch (error) {
    console.error('发送聊天消息错误:', error);
    res.status(500).json({ error: '发送失败' });
  }
});

export default router;
