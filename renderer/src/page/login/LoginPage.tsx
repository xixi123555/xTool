import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../components/toast/Toast';
import { login, register, guestLogin, sendVerificationCode, loginByCode } from '../../api/auth';
import { defaultRoute } from '../../router';
import {
  getLatestLoginHistory,
  getHistoryByKeyword,
  saveLoginHistory,
  type LoginHistoryItem,
} from '../../utils/loginHistory';
import { AutoCompleteInput } from '../../components/login/AutoCompleteInput';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'code-login'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 自动联想相关状态
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  const { setUser, setToken, setShortcuts } = useAppStore();

  // 页面加载时自动填充上一次的登录信息
  useEffect(() => {
    (async () => {
      const latestHistory = await getLatestLoginHistory(mode === 'code-login' ? 'code' : mode === 'register' ? 'register' : 'password');
      if (latestHistory) {
        if (mode === 'code-login') {
          if (latestHistory.email) {
            setEmail(latestHistory.email);
          }
        } else if (mode === 'register') {
          if (latestHistory.username) {
            setUsername(latestHistory.username);
          }
          if (latestHistory.email) {
            setEmail(latestHistory.email);
          }
        } else {
          // 密码登录
          if (latestHistory.username) {
            setUsername(latestHistory.username);
          }
          if (latestHistory.password) {
            setPassword(latestHistory.password);
          }
        }
      }
    })();
  }, [mode]);

  // 用户名输入联想
  useEffect(() => {
    if (mode === 'login' || mode === 'register') {
      if (username.trim()) {
        (async () => {
          const history = await getHistoryByKeyword(username, mode === 'register' ? 'register' : 'password');
          const suggestions = history
            .map((h) => h.username)
            .filter((u): u is string => !!u && u !== username)
            .slice(0, 5);
          setUsernameSuggestions(suggestions);
        })();
      } else {
        setUsernameSuggestions([]);
      }
    }
  }, [username, mode]);

  // 邮箱输入联想
  useEffect(() => {
    if (mode === 'code-login' || mode === 'register') {
      if (email.trim()) {
        (async () => {
          const history = await getHistoryByKeyword(email, mode === 'code-login' ? 'code' : 'register');
          const suggestions = history
            .map((h) => h.email)
            .filter((e): e is string => !!e && e !== email)
            .slice(0, 5);
          setEmailSuggestions(suggestions);
        })();
      } else {
        setEmailSuggestions([]);
      }
    }
  }, [email, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await login({
        username,
        password,
      });

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setShortcuts(response.shortcuts || {});
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        localStorage.setItem('xtool_shortcuts', JSON.stringify(response.shortcuts || {}));
        showToast('登录成功');
        
        // 应用快捷键配置（包括默认快捷键）
        // 使用重试机制，确保 IPC 处理器已经注册
        try {
          await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
        } catch (error) {
          console.error('Failed to apply shortcuts, retrying...', error);
          // 延迟重试
          setTimeout(async () => {
            try {
              await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
            } catch (retryError) {
              console.error('Retry failed to apply shortcuts:', retryError);
            }
          }, 500);
        }
        // 导航到主页面
        navigate(defaultRoute);
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      showToast(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        username,
        password,
        email: email || undefined,
      });

      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        setShortcuts(response.shortcuts || {});
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        localStorage.setItem('xtool_shortcuts', JSON.stringify(response.shortcuts || {}));
        
        // 保存注册历史
        saveLoginHistory({
          username,
          email: email || undefined,
          loginType: 'register',
        });
        
        showToast('注册成功');
        
        // 应用快捷键配置（包括默认快捷键）
        // 使用重试机制，确保 IPC 处理器已经注册
        try {
          await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
        } catch (error) {
          console.error('Failed to apply shortcuts, retrying...', error);
          // 延迟重试
          setTimeout(async () => {
            try {
              await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
            } catch (retryError) {
              console.error('Retry failed to apply shortcuts:', retryError);
            }
          }, 500);
        }
        // 导航到主页面
        navigate(defaultRoute);
      }
    } catch (error: any) {
      console.error('注册错误:', error);
      showToast(error.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const response = await guestLogin();

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        setShortcuts(response.shortcuts || {});
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        localStorage.setItem('xtool_shortcuts', JSON.stringify(response.shortcuts || {}));
        showToast('路人身份登录成功');
        
        // 应用快捷键配置（包括默认快捷键）
        // 使用重试机制，确保 IPC 处理器已经注册
        try {
          await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
        } catch (error) {
          console.error('Failed to apply shortcuts, retrying...', error);
          // 延迟重试
          setTimeout(async () => {
            try {
              await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
            } catch (retryError) {
              console.error('Retry failed to apply shortcuts:', retryError);
            }
          }, 500);
        }
        // 导航到主页面
        navigate(defaultRoute);
      }
    } catch (error: any) {
      console.error('路人登录错误:', error);
      showToast(error.response?.data?.error || '路人登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      showToast('请输入邮箱');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('邮箱格式不正确');
      return;
    }

    setCodeLoading(true);
    try {
      const response = await sendVerificationCode(email);
      if (response.success) {
        setCodeSent(true);
        showToast('验证码已发送到您的邮箱');
        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: any) {
      console.error('发送验证码错误:', error);
      showToast(error.response?.data?.error || '发送验证码失败');
    } finally {
      setCodeLoading(false);
    }
  };

  // 验证码登录
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      showToast('请输入邮箱和验证码');
      return;
    }

    setLoading(true);
    try {
      const response = await loginByCode(email, code);

      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        setShortcuts(response.shortcuts || {});
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        localStorage.setItem('xtool_shortcuts', JSON.stringify(response.shortcuts || {}));
        
        // 保存验证码登录历史（不保存验证码）
        saveLoginHistory({
          email,
          loginType: 'code',
        });
        
        showToast('登录成功');
        
        // 应用快捷键配置（包括默认快捷键）
        // 使用重试机制，确保 IPC 处理器已经注册
        try {
          await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
        } catch (error) {
          console.error('Failed to apply shortcuts, retrying...', error);
          // 延迟重试
          setTimeout(async () => {
            try {
              await window.api.invoke('shortcut:apply-user-shortcuts', response.shortcuts || {});
            } catch (retryError) {
              console.error('Retry failed to apply shortcuts:', retryError);
            }
          }, 500);
        }
        // 导航到主页面
        navigate(defaultRoute);
      }
    } catch (error: any) {
      console.error('验证码登录错误:', error);
      showToast(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-soft backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">xTool</h1>
          <p className="mt-2 text-sm text-slate-500">多种实用工具</p>
        </div>

        {/* 登录/注册/验证码登录切换 */}
        <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setMode('login');
              setCodeSent(false);
              setCountdown(0);
            }}
          >
            密码登录
          </button>
          <button
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'code-login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setMode('code-login');
              setCodeSent(false);
              setCountdown(0);
            }}
          >
            验证码登录
          </button>
          <button
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        {/* 登录表单 */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                用户名
              </label>
              <AutoCompleteInput
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="请输入用户名"
                disabled={loading}
                suggestions={usernameSuggestions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                密码
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        ) : mode === 'code-login' ? (
          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                邮箱
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <AutoCompleteInput
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="请输入邮箱"
                    disabled={loading || codeLoading}
                    suggestions={emailSuggestions}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && codeSent) {
                        handleCodeLogin(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap px-4"
                  onClick={handleSendCode}
                  disabled={codeLoading || countdown > 0 || loading}
                >
                  {countdown > 0 ? `${countdown}秒` : codeSent ? '重新发送' : '发送验证码'}
                </button>
              </div>
            </div>
            {codeSent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  验证码
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCodeLogin(e);
                    }
                  }}
                />
              </div>
            )}
            {codeSent && (
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || !code}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                用户名
              </label>
              <AutoCompleteInput
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="请输入用户名"
                disabled={loading}
                suggestions={usernameSuggestions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister(e);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                密码
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister(e);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                邮箱（可选）
              </label>
              <AutoCompleteInput
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="请输入邮箱"
                disabled={loading}
                suggestions={emailSuggestions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        )}

        {/* 路人登录 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/80 px-2 text-slate-500">或</span>
            </div>
          </div>
          <button
            className="btn-secondary mt-4 w-full"
            onClick={handleGuestLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '以路人身份登录'}
          </button>
          <p className="mt-2 text-xs text-center text-slate-500">
            路人身份无法使用翻译和网页阅读器功能
          </p>
        </div>
      </div>
    </div>
  );
}

