#!/usr/bin/env node
/**
 * xTool MCP Server 入口 - stdio 传输
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { logger } from './logger.js';
import { config, hasAuth, hasWebReader } from './config.js';

async function main(): Promise<void> {
  logger.info('xTool MCP Server 启动中', {
    serverUrl: config.apiBaseUrl,
    hasAuth: hasAuth(),
    hasWebReader: hasWebReader(),
  });

  const server = new McpServer(
    {
      name: 'xtool',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerAllTools(server);
  logger.info('MCP 工具注册完成，连接 stdio 传输');

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('xTool MCP Server 已就绪，等待请求');
}

main().catch((err) => {
  logger.error('xTool MCP Server 启动失败:', err);
  process.exit(1);
});
