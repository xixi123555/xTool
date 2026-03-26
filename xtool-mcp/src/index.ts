#!/usr/bin/env node
/**
 * xTool MCP Server 入口 - Streamable HTTP 传输
 */
import { config, hasEnvToken, hasEnvDifyKey } from './config.js';
import { logger } from './logger.js';
import { createStreamableHttpApp, shutdownAllTransports } from './streamableHttpApp.js';

async function main(): Promise<void> {
  logger.info('xTool MCP Server (HTTP) 启动中', {
    serverUrl: config.apiBaseUrl,
    httpPort: config.httpPort,
    httpHost: config.httpHost,
    httpPath: config.httpPath,
    hasEnvToken: hasEnvToken(),
    hasEnvDifyKey: hasEnvDifyKey(),
  });
  logger.info('config', config);

  const app = createStreamableHttpApp();

  app.listen(config.httpPort, config.httpHost, () => {
    logger.info(
      `xTool MCP Server 已就绪 http://${config.httpHost}:${config.httpPort}${config.httpPath}`,
    );
  });
}

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT，正在关闭...');
  await shutdownAllTransports();
  logger.info('关闭完成');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM，正在关闭...');
  await shutdownAllTransports();
  logger.info('关闭完成');
  process.exit(0);
});

main().catch((err) => {
  logger.error('xTool MCP Server 启动失败:', err);
  process.exit(1);
});
