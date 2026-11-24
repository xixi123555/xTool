import { io, type Socket } from 'socket.io-client';

import type { ChatMessage } from './api';

const SOCKET_URL = import.meta.env.VITE_CHAT_SOCKET_URL ?? '/chatServer';

let socket: Socket | null = null;

type MessageHandler = (message: ChatMessage) => void;
type CountHandler = (data: { count: number }) => void;
type ErrorHandler = (data: { message: string }) => void;
type ConnectionHandler = (connected: boolean) => void;

const handlers = {
  message: new Set<MessageHandler>(),
  count: new Set<CountHandler>(),
  error: new Set<ErrorHandler>(),
  connection: new Set<ConnectionHandler>(),
};

function notifyConnection(connected: boolean): void {
  handlers.connection.forEach((handler) => handler(connected));
}

export function connectChat(token: string): Socket {
  if (socket?.connected) return socket;
  socket?.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10_000,
  });

  socket.on('connect', () => notifyConnection(true));
  socket.on('disconnect', () => notifyConnection(false));
  socket.on('connect_error', () => notifyConnection(false));
  socket.on('chat:new_message', (message: ChatMessage) => {
    handlers.message.forEach((handler) => handler(message));
  });
  socket.on('chat:online_count', (data: { count: number }) => {
    handlers.count.forEach((handler) => handler(data));
  });
  socket.on('chat:error', (data: { message: string }) => {
    handlers.error.forEach((handler) => handler(data));
  });

  return socket;
}

export function disconnectChat(): void {
  socket?.disconnect();
  socket = null;
}

export function onNewMessage(handler: MessageHandler): () => void {
  handlers.message.add(handler);
  return () => handlers.message.delete(handler);
}

export function onOnlineCount(handler: CountHandler): () => void {
  handlers.count.add(handler);
  return () => handlers.count.delete(handler);
}

export function onChatError(handler: ErrorHandler): () => void {
  handlers.error.add(handler);
  return () => handlers.error.delete(handler);
}

export function onConnectionChange(handler: ConnectionHandler): () => void {
  handlers.connection.add(handler);
  return () => handlers.connection.delete(handler);
}
