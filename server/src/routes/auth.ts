/**
 * 认证路由
 */
import express, { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Shortcut } from '../models/Shortcut.js';
import { generateToken, verifyToken } from '../utils/jwt.js';

const router = express.Router();

interface RegisterRequest extends Request {
  body: {
    username: string;
    password: string;
    email?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    username: string;
    password: string;
  };
}

/**
 * 用户注册
 */
router.post('/register', async (req: RegisterRequest, res: Response): Promise<void> => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    // 检查用户是否已存在
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    // 创建用户
    const userId = await User.create(username, password, email || null, 'normal');
    const user = await User.findById(userId);

    if (!user) {
      res.status(500).json({ error: '用户创建失败' });
      return;
    }

    // 生成 token
    const token = generateToken(userId);

    // 获取用户的快捷键配置（只返回与默认值不同的）
    const shortcuts = await Shortcut.getUserShortcuts(userId);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
      },
      shortcuts,
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * 用户登录
 */
router.post('/login', async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 验证密码
    if (!user.password) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 生成 token
    const token = generateToken(user.id);

    // 获取用户的快捷键配置（只返回与默认值不同的）
    const shortcuts = await Shortcut.getUserShortcuts(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
      },
      shortcuts,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * 路人身份登录
 */
router.post('/guest', async (_req: Request, res: Response) => {
  try {
    // 创建路人用户
    const guestUser = await User.createGuest();
    const token = generateToken(guestUser.id);

    // 路人用户没有自定义快捷键，返回空对象
    res.json({
      success: true,
      token,
      user: {
        id: guestUser.id,
        username: guestUser.username,
        user_type: guestUser.user_type,
      },
      shortcuts: {},
    });
  } catch (error) {
    console.error('路人登录错误:', error);
    res.status(500).json({ error: '路人登录失败' });
  }
});

/**
 * 获取当前用户信息
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: '未提供认证令牌' });
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({ error: '无效的认证令牌' });
  }
});

export default router;

