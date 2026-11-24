/**
 * McpServer 工厂 - 每个会话创建独立实例，避免状态串线
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';

export function createAppMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'xtool', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  registerAllTools(server);
  return server;
}
