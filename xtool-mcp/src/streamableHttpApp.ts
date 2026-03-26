/**
 * Streamable HTTP MCP Express 应用
 * POST / GET / DELETE 三端点，按 session 维护 transport，支持 Bearer 鉴权
 */
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { createAppMcpServer } from './mcpServerFactory.js';
import { runWithBearer } from './requestContext.js';

const transports: Record<string, StreamableHTTPServerTransport> = {};

function extractBearer(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return undefined;
}

/** Bearer 认证中间件：必须提供有效 token（或 env 后备） */
function requireBearerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearer(req) || config.jwtToken;
  if (!token) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized: Bearer token required' },
      id: null,
    });
    return;
  }
  next();
}

async function handlePost(req: Request, res: Response): Promise<void> {
  const bearerToken = extractBearer(req) || config.jwtToken;
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sid: string) => {
          logger.info(`会话已建立: ${sid}`);
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          logger.info(`会话关闭: ${sid}`);
          delete transports[sid];
        }
      };

      const server = createAppMcpServer();
      await server.connect(transport);

      await runWithBearer(bearerToken || '', () =>
        transport.handleRequest(req, res, req.body),
      );
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await runWithBearer(bearerToken || '', () =>
      transport.handleRequest(req, res, req.body),
    );
  } catch (error) {
    logger.error('处理 MCP POST 请求失败', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

async function handleGet(req: Request, res: Response): Promise<void> {
  const bearerToken = extractBearer(req) || config.jwtToken;
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  const transport = transports[sessionId];
  await runWithBearer(bearerToken || '', () =>
    transport.handleRequest(req, res),
  );
}

async function handleDelete(req: Request, res: Response): Promise<void> {
  const bearerToken = extractBearer(req) || config.jwtToken;
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  try {
    const transport = transports[sessionId];
    await runWithBearer(bearerToken || '', () =>
      transport.handleRequest(req, res),
    );
  } catch (error) {
    logger.error('处理会话终止请求失败', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
}

export function createStreamableHttpApp() {
  const host = config.httpHost;
  const app = createMcpExpressApp({
    host,
    allowedHosts: config.allowedHosts,
  });

  const path = config.httpPath;
  app.post(path, requireBearerMiddleware, handlePost);
  app.get(path, requireBearerMiddleware, handleGet);
  app.delete(path, requireBearerMiddleware, handleDelete);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', sessions: Object.keys(transports).length });
  });

  return app;
}

/** 优雅关闭所有活跃 transport */
export async function shutdownAllTransports(): Promise<void> {
  for (const sessionId of Object.keys(transports)) {
    try {
      logger.info(`关闭会话 transport: ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      logger.error(`关闭 transport 失败 (${sessionId})`, error);
    }
  }
}
