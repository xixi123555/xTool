/**
 * 汇总注册所有 MCP Tools
 * HTTP-only 模式下始终注册全部工具，鉴权在 handler 内按请求级 Bearer 检查
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as bookkeeping from './bookkeeping.js';
import * as todo from './todo.js';
import * as webReader from './web-reader.js';
import * as chat from './chat.js';
import { logger } from '../logger.js';

function withLogging<T>(
  toolName: string,
  handler: (args: T) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
) {
  return async (args: T) => {
    logger.toolInvoke(toolName, args);
    try {
      const result = await handler(args);
      const text = result.content?.[0]?.text ?? '';
      logger.toolResult(toolName, text);
      return result;
    } catch (err) {
      logger.error(`[TOOL] ${toolName} 执行失败`, err);
      throw err;
    }
  };
}

const addRecordSchema = {
  purpose: z.string().describe('用途，如：餐饮、交通'),
  amount: z.number().describe('金额（元）'),
  description: z.string().optional().describe('可选备注'),
};

const readPageSchema = {
  url: z.string().url().describe('要读取的网页 URL'),
};

const createCardSchema = {
  name: z.string().describe('卡片名称'),
  id: z.string().optional().describe('可选，不填则自动生成'),
  starred: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
};

const createItemSchema = {
  card_id: z.string().describe('待办卡片 ID'),
  content: z.string().describe('待办项内容'),
  id: z.string().optional(),
  completed: z.boolean().optional(),
};

const updateItemSchema = {
  item_id: z.string().describe('待办项 ID'),
  card_id: z.string().describe('卡片 ID'),
  content: z.string().optional(),
  completed: z.boolean().optional(),
};

const sendMessageSchema = {
  text: z.string().describe('要发送的消息文本'),
  room_id: z.string().optional().describe('聊天室 ID，默认 public'),
};

const listMessagesSchema = {
  room_id: z.string().optional().describe('聊天室 ID，默认 public'),
  limit: z.number().optional().describe('返回条数，默认 50，最大 200'),
  before_id: z.number().optional().describe('分页游标：返回此 ID 之前的消息'),
};

export function registerAllTools(server: McpServer): void {
  server.registerTool('bookkeeping/add_expense', {
    title: '记一笔支出',
    description: '记录日常支出，用于记账',
    inputSchema: addRecordSchema,
  }, withLogging('bookkeeping/add_expense', async (args) => {
    const text = await bookkeeping.addExpense(args as { purpose: string; amount: number; description?: string });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('bookkeeping/add_income', {
    title: '记一笔收入',
    description: '记录收入，用于记账',
    inputSchema: addRecordSchema,
  }, withLogging('bookkeeping/add_income', async (args) => {
    const text = await bookkeeping.addIncome(args as { purpose: string; amount: number; description?: string });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('bookkeeping/list_records', {
    title: '列出记账记录',
    description: '获取所有记账记录',
    inputSchema: {},
  }, withLogging('bookkeeping/list_records', async () => {
    const text = await bookkeeping.listRecords();
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('bookkeeping/list_purposes', {
    title: '列出用途标签',
    description: '获取记账用途标签列表',
    inputSchema: {},
  }, withLogging('bookkeeping/list_purposes', async () => {
    const text = await bookkeeping.listPurposes();
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('todo/list_cards', {
    title: '列出待办卡片',
    description: '获取所有待办卡片',
    inputSchema: {},
  }, withLogging('todo/list_cards', async () => {
    const text = await todo.listCards();
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('todo/create_card', {
    title: '创建待办卡片',
    description: '创建一个新的待办卡片',
    inputSchema: createCardSchema,
  }, withLogging('todo/create_card', async (args) => {
    const text = await todo.createCard(args as { name: string; id?: string; starred?: boolean; tags?: string[] });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('todo/create_item', {
    title: '创建待办项',
    description: '在指定卡片下创建待办项',
    inputSchema: createItemSchema,
  }, withLogging('todo/create_item', async (args) => {
    const text = await todo.createItem(args as { card_id: string; content: string; id?: string; completed?: boolean });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('todo/update_item', {
    title: '更新待办项',
    description: '更新待办项内容或完成状态',
    inputSchema: updateItemSchema,
  }, withLogging('todo/update_item', async (args) => {
    const text = await todo.updateItem(args as { item_id: string; card_id: string; content?: string; completed?: boolean });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('web/read_page', {
    title: '读取网页内容',
    description: '使用网页阅读器获取网页正文内容',
    inputSchema: readPageSchema,
  }, withLogging('web/read_page', async (args) => {
    const text = await webReader.readPage(args as { url: string });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('chat/send_message', {
    title: '发送聊天消息',
    description: '在聊天室中发送一条文本消息，所有在线用户都能实时看到',
    inputSchema: sendMessageSchema,
  }, withLogging('chat/send_message', async (args) => {
    const text = await chat.sendMessage(args as { text: string; room_id?: string });
    return { content: [{ type: 'text' as const, text }] };
  }));

  server.registerTool('chat/list_messages', {
    title: '查看聊天记录',
    description: '获取聊天室的历史消息记录',
    inputSchema: listMessagesSchema,
  }, withLogging('chat/list_messages', async (args) => {
    const text = await chat.listMessages(args as { room_id?: string; limit?: number; before_id?: number });
    return { content: [{ type: 'text' as const, text }] };
  }));
}
