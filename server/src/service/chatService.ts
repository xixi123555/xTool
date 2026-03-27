/**
 * 聊天业务逻辑层 — 解耦路由/Socket 与数据模型
 */
import { ChatMessageModel } from '../models/ChatMessage.js';
import { ChatMessagePart, ChatMessage } from '../types/index.js';

const DEFAULT_ROOM = 'public';

export class ChatService {
  static async sendMessage(
    userId: number,
    text: string,
    roomId: string = DEFAULT_ROOM
  ): Promise<ChatMessage> {
    const parts: ChatMessagePart[] = [{ type: 'text', text }];
    return ChatMessageModel.create(roomId, userId, parts);
  }

  static async sendRichMessage(
    userId: number,
    parts: ChatMessagePart[],
    roomId: string = DEFAULT_ROOM
  ): Promise<ChatMessage> {
    return ChatMessageModel.create(roomId, userId, parts);
  }

  static async getHistory(
    roomId: string = DEFAULT_ROOM,
    limit: number = 50,
    beforeId?: number
  ): Promise<ChatMessage[]> {
    return ChatMessageModel.getMessages(roomId, limit, beforeId);
  }

  /** 全部聊天室合并时间线（同页游标 beforeId 为全局消息 id） */
  static async getHistoryAllRooms(
    limit: number = 50,
    beforeId?: number
  ): Promise<ChatMessage[]> {
    return ChatMessageModel.getMessagesAllRooms(limit, beforeId);
  }
}
