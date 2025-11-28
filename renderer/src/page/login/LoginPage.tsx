import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { post } from '../../utils/http';
import { showToast } from '../../components/toast/Toast';

const API_BASE_URL = 'http://localhost:5198/api';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser, setToken } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        showToast('登录成功');
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
      const response = await post(`${API_BASE_URL}/auth/register`, {
        username,
        password,
        email: email || undefined,
      });

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        showToast('注册成功');
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
      const response = await post(`${API_BASE_URL}/auth/guest`, {});

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('xtool_token', response.token);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        showToast('路人身份登录成功');
      }
    } catch (error: any) {
      console.error('路人登录错误:', error);
      showToast(error.response?.data?.error || '路人登录失败');
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

        {/* 登录/注册切换 */}
        <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setMode('login')}
          >
            登录
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
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
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
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                邮箱（可选）
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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

