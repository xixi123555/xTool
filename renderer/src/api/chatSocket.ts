/**
 * 聊天室 Socket.IO 客户端 — 管理连接、事件与重连
 */
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, ChatMessagePart } from './chatApi';

const SOCKET_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_CHAT_SOCKET_URL || 'https://39.105.137.213:5298')
  : (import.meta.env.VITE_CHAT_SOCKET_URL || 'http://localhost:5298');

let socket: Socket | null = null;

type MessageHandler = (msg: ChatMessage) => void;
type OnlineCountHandler = (data: { count: number }) => void;
type ErrorHandler = (data: { message: string }) => void;
type ConnectionHandler = (connected: boolean) => void;

const handlers = {
  message: new Set<MessageHandler>(),
  onlineCount: new Set<OnlineCountHandler>(),
  error: new Set<ErrorHandler>(),
  connection: new Set<ConnectionHandler>(),
};

function notifyConnection(connected: boolean) {
  handlers.connection.forEach((h) => h(connected));
}

export function connectChat(token: string): Socket {
  if (socket?.connected) return socket;

  socket?.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('[chat-socket] connected', socket?.id);
    notifyConnection(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('[chat-socket] disconnected', reason);
    notifyConnection(false);
  });

  socket.on('connect_error', (err) => {
    console.warn('[chat-socket] connect_error', err.message);
    notifyConnection(false);
  });

  socket.on('chat:new_message', (msg: ChatMessage) => {
    handlers.message.forEach((h) => h(msg));
  });

  socket.on('chat:online_count', (data: { count: number }) => {
    handlers.onlineCount.forEach((h) => h(data));
  });

  socket.on('chat:error', (data: { message: string }) => {
    handlers.error.forEach((h) => h(data));
  });

  return socket;
}

export function disconnectChat(): void {
  socket?.disconnect();
  socket = null;
}

export interface SendChatPayload {
  text?: string;
  roomId?: string;
  parts?: ChatMessagePart[];
}

export function sendChatMessage(payload: string | SendChatPayload, roomId?: string): void {
  if (typeof payload === 'string') {
    socket?.emit('chat:send', { text: payload, roomId });
    return;
  }
  socket?.emit('chat:send', payload);
}

export function onNewMessage(handler: MessageHandler): () => void {
  handlers.message.add(handler);
  return () => { handlers.message.delete(handler); };
}

export function onOnlineCount(handler: OnlineCountHandler): () => void {
  handlers.onlineCount.add(handler);
  return () => { handlers.onlineCount.delete(handler); };
}

export function onChatError(handler: ErrorHandler): () => void {
  handlers.error.add(handler);
  return () => { handlers.error.delete(handler); };
}

export function onConnectionChange(handler: ConnectionHandler): () => void {
  handlers.connection.add(handler);
  return () => { handlers.connection.delete(handler); };
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
