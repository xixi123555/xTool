/**
 * 聊天室 Socket.IO 网关 — 管理实时连接与消息广播
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { McpKey } from '../models/McpKey.js';
import { ChatService } from '../service/chatService.js';
import { User as UserType, ChatMessagePart } from '../types/index.js';

const DEFAULT_ROOM = 'public';

interface AuthenticatedSocket extends Socket {
  data: { user: UserType };
}

function chatLog(event: string, detail: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  console.log(`[chat][${ts}] ${event}`, JSON.stringify(detail));
}

async function authenticateSocket(token: string): Promise<UserType | null> {
  if (!token) return null;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key'
    ) as { userId: number };
    const user = await User.findById(decoded.userId);
    if (user) return user;
  } catch {
    /* fall through to MCP key */
  }
  const mcpUser = await McpKey.getUserByMcpKey(token);
  if (mcpUser) return mcpUser;
  return null;
}

export function setupChatGateway(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      '';
    const user = await authenticateSocket(token);
    if (!user) {
      chatLog('auth_fail', { socketId: socket.id });
      return next(new Error('认证失败'));
    }
    (socket as AuthenticatedSocket).data.user = user;
    next();
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    chatLog('connected', {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
    });

    socket.join(DEFAULT_ROOM);
    chatLog('join_room', {
      socketId: socket.id,
      userId: user.id,
      roomId: DEFAULT_ROOM,
    });

    const broadcastOnlineCount = () => {
      const room = io.sockets.adapter.rooms.get(DEFAULT_ROOM);
      const count = room ? room.size : 0;
      io.to(DEFAULT_ROOM).emit('chat:online_count', { count });
    };
    broadcastOnlineCount();

    socket.on(
      'chat:send',
      async (payload: { text?: string; roomId?: string; parts?: ChatMessagePart[] }) => {
        const text = payload.text?.trim();
        const parts = ChatService.normalizeParts(payload.parts || []);
        if (!text && parts.length === 0) return;

        const roomId = payload.roomId || DEFAULT_ROOM;
        try {
          const msg =
            parts.length > 0
              ? await ChatService.sendRichMessage(user.id, parts, roomId)
              : await ChatService.sendMessage(user.id, text!, roomId);
          chatLog('message_sent', {
            messageId: msg.id,
            userId: user.id,
            roomId,
          });
          // 广播到所有在线客户端，便于客户端聚合展示各 room 消息
          io.emit('chat:new_message', msg);
        } catch (err) {
          chatLog('message_error', { userId: user.id, error: String(err) });
          socket.emit('chat:error', { message: '发送失败' });
        }
      }
    );

    socket.on('disconnect', (reason) => {
      chatLog('disconnected', {
        socketId: socket.id,
        userId: user.id,
        reason,
      });
      setTimeout(broadcastOnlineCount, 500);
    });
  });

  chatLog('gateway_ready', { path: '/socket.io' });
  return io;
}
