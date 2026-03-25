/**
 * 认证中间件
 */
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { McpKey } from '../models/McpKey.js';
import { AuthenticatedRequest } from '../types/index.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    // 1) 优先按 JWT 校验
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { userId: number };
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      req.user = user;
      next();
      return;
    } catch {
      // 2) JWT 失败后尝试当作 MCP Key：Authorization: Bearer <mcp_key>
      const mcpUser = await McpKey.getUserByMcpKey(token);
      if (mcpUser) {
        req.user = mcpUser;
        next();
        return;
      }
    }

    return res.status(401).json({ error: '无效的认证令牌' });
  } catch (_error) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

