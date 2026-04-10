/**
 * Claude (Anthropic) 代码助手 — 服务端代理，密钥仅来自环境变量
 */
import express, { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

router.post('/messages', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey?.trim()) {
      res.status(503).json({
        error: '服务端未配置 ANTHROPIC_API_KEY，请在 server 目录的 .env 中设置',
      });
      return;
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    const parsedMax = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '8192', 10);
    const maxTokens = Math.min(Math.max(Number.isFinite(parsedMax) ? parsedMax : 8192, 256), 8192);

    const { messages, stream = true } = req.body as {
      messages?: Array<{ role: string; content: string }>;
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages 不能为空' });
      return;
    }

    const norm = messages
      .slice(-40)
      .map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content || '').slice(0, 200_000),
      }))
      .filter((m) => m.content.length > 0);

    if (norm.length === 0) {
      res.status(400).json({ error: '无有效消息内容' });
      return;
    }

    const system =
      process.env.ANTHROPIC_SYSTEM ||
      'You are Claude, an AI coding assistant. Prefer answering in the same language as the user. Give clear explanations and use markdown code fences for program listings.';

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: Boolean(stream),
        system,
        messages: norm,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      let message = errText;
      try {
        const j = JSON.parse(errText) as { error?: { message?: string }; message?: string };
        message = j.error?.message || j.message || errText;
      } catch {
        /* keep errText */
      }
      const status =
        upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
      res.status(status).json({ error: message || 'Anthropic API 请求失败' });
      return;
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (!upstream.body) {
        res.end();
        return;
      }

      const webStream = upstream.body as import('stream/web').ReadableStream<Uint8Array>;
      const nodeReadable = Readable.fromWeb(webStream);
      await pipeline(nodeReadable, res);
    } else {
      const data = (await upstream.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        data.content
          ?.filter((c) => c.type === 'text')
          .map((c) => c.text || '')
          .join('') || '';
      res.json({ text });
    }
  } catch (e) {
    console.error('[claude-code]', e);
    if (!res.headersSent) {
      res.status(500).json({ error: '服务器处理请求时出错' });
    } else {
      res.end();
    }
  }
});

export default router;
