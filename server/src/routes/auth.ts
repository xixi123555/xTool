/**
 * 认证路由
 */
import express, { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Shortcut } from '../models/Shortcut.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sendVerificationCode } from '../utils/email.js';
import { generateCode, storeCode, verifyCode } from '../utils/verificationCode.js';

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
        avatar: (user as any).avatar,
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
        avatar: (user as any).avatar,
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
        avatar: (user as any).avatar,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({ error: '无效的认证令牌' });
  }
});

/**
 * 发送邮箱验证码
 */
interface SendCodeRequest extends Request {
  body: {
    email: string;
  };
}

router.post('/send-code', async (req: SendCodeRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: '邮箱不能为空' });
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' });
      return;
    }

    // 检查用户是否存在
    const user = await User.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: '该邮箱未注册' });
      return;
    }

    // 生成验证码
    const code = generateCode();

    // 存储验证码
    storeCode(email, code);

    // 发送邮件
    try {
      await sendVerificationCode(email, code);
      res.json({
        success: true,
        message: '验证码已发送到您的邮箱',
      });
    } catch (error) {
      console.error('发送验证码失败:', error);
      res.status(500).json({ error: '发送验证码失败，请稍后重试' });
    }
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

/**
 * 邮箱验证码登录
 */
interface CodeLoginRequest extends Request {
  body: {
    email: string;
    code: string;
  };
}

router.post('/login-by-code', async (req: CodeLoginRequest, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: '邮箱和验证码不能为空' });
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' });
      return;
    }

    // 验证验证码
    if (!verifyCode(email, code)) {
      res.status(401).json({ error: '验证码错误或已过期' });
      return;
    }

    // 查找用户
    const user = await User.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
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
        avatar: (user as any).avatar,
        user_type: user.user_type,
      },
      shortcuts,
    });
  } catch (error) {
    console.error('验证码登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * 更新用户信息（需要认证）
 */
interface UpdateProfileRequest extends Request {
  body: {
    username?: string;
    email?: string;
    avatar?: string;
  };
}

router.put('/profile', async (req: UpdateProfileRequest, res: Response): Promise<void> => {
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

    // 如果是路人用户，不允许更新
    if (user.user_type === 'guest') {
      res.status(403).json({ error: '路人用户无法更新个人信息' });
      return;
    }

    const { username, email, avatar } = req.body;

    // 如果更新用户名，检查是否已被占用
    if (username && username !== user.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        res.status(400).json({ error: '用户名已被占用' });
        return;
      }
    }

    // 更新用户信息
    await User.update(decoded.userId, {
      username,
      email: email !== undefined ? email : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
    });

    // 获取更新后的用户信息
    const updatedUser = await User.findById(decoded.userId);

    res.json({
      success: true,
      user: {
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        avatar: (updatedUser as any)?.avatar,
        user_type: updatedUser!.user_type,
      },
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

export default router;

