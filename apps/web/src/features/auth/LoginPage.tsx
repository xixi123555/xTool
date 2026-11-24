import { ArrowRight, Loader2, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { errorMessage } from '../../shared/lib/http';
import { consumeLoginRedirect } from '../../shared/lib/redirect';
import {
  guestLogin,
  login,
  loginByCode,
  register,
  sendVerificationCode,
} from '../../shared/api/auth';
import { useAuthStore } from '../../shared/store/auth';
import { toast } from '../../shared/store/feedback';

type Mode = 'login' | 'register' | 'code';

const REMEMBER_KEY = 'xtool_remember_password';

interface RememberedCredential {
  username: string;
  password: string;
}

function readRemembered(): RememberedCredential | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedCredential>;
    return parsed.username && parsed.password
      ? { username: parsed.username, password: parsed.password }
      : null;
  } catch {
    return null;
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const remembered = readRemembered();
  const [username, setUsername] = useState(remembered?.username ?? '');
  const [password, setPassword] = useState(remembered?.password ?? '');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const goHome = () => {
    const target = consumeLoginRedirect('/bookkeeping');
    navigate(target, { replace: true });
  };

  const handleSuccess = (token: string, user: Parameters<typeof setSession>[1]) => {
    setSession(token, user);
    goHome();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login({ username: username.trim(), password });
        if (!result.success) throw new Error(result.error || '登录失败');
        if (remember) {
          localStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({ username: username.trim(), password }),
          );
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        handleSuccess(result.token, result.user);
      } else if (mode === 'register') {
        const result = await register({
          username: username.trim(),
          password,
          email: email.trim() || undefined,
        });
        if (!result.success) throw new Error(result.error || '注册失败');
        handleSuccess(result.token, result.user);
      } else {
        const result = await loginByCode(email.trim(), code.trim());
        if (!result.success) throw new Error(result.error || '登录失败');
        handleSuccess(result.token, result.user);
      }
    } catch (error) {
      toast(errorMessage(error, '操作失败'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (countdown > 0 || loading) return;
    if (!email.trim()) {
      toast('请先填写邮箱', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await sendVerificationCode(email.trim());
      if (!result.success) throw new Error(result.error || '发送失败');
      setCountdown(60);
      toast('验证码已发送，请查收邮箱', 'success');
    } catch (error) {
      toast(errorMessage(error, '发送验证码失败'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await guestLogin();
      if (!result.success) throw new Error(result.error || '进入失败');
      handleSuccess(result.token, result.user);
    } catch (error) {
      toast(errorMessage(error, '进入失败'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      <section className="hidden w-[46%] flex-col justify-between bg-surface p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg">
            x
          </span>
          <div>
            <p className="text-base font-semibold text-fg">xTool</p>
            <p className="text-xs text-subtle">个人效率工作台</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-sm font-medium text-accent">记账、待办与智能助手</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-fg">
            把每天要做的事，
            <br />
            收进一个干净的工作台。
          </h1>
          <p className="mt-4 text-sm leading-6 text-subtle">
            移动端与桌面端自动适配，数据保存在你自己的服务里。
          </p>
          <div className="mt-8 grid gap-3 text-sm text-subtle">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Wallet className="h-4 w-4" />
              </span>
              记账支持 PC 与手机两套视图
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              聊天室、知识库与智能体编排
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <ShieldCheck className="h-4 w-4" />
              </span>
              登录态 7 天有效，过期自动回到登录页
            </div>
          </div>
        </div>

        <p className="text-xs text-subtle">© {new Date().getFullYear()} xTool</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-fg">
              x
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">xTool</p>
              <p className="text-[11px] text-subtle">个人效率工作台</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">
              {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '邮箱验证码登录'}
            </h2>
            <p className="mt-1 text-sm text-subtle">
              {mode === 'login'
                ? '使用账号密码继续'
                : mode === 'register'
                  ? '注册后即可同步记账与待办'
                  : '验证码会发送到已注册邮箱'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-muted p-1">
            {[
              { value: 'login', label: '登录' },
              { value: 'register', label: '注册' },
              { value: 'code', label: '验证码' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value as Mode)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                  mode === item.value ? 'bg-surface text-fg shadow-sm' : 'text-subtle hover:text-fg'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'code' ? (
              <>
                <div>
                  <label className="label" htmlFor="username">
                    用户名
                  </label>
                  <input
                    id="username"
                    className="field"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    密码
                  </label>
                  <input
                    id="password"
                    className="field"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    required
                  />
                </div>
                {mode === 'register' && (
                  <div>
                    <label className="label" htmlFor="email">
                      邮箱 <span className="font-normal text-subtle">（可选）</span>
                    </label>
                    <input
                      id="email"
                      className="field"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="用于验证码登录"
                    />
                  </div>
                )}
                {mode === 'login' && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-subtle">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                    />
                    记住密码
                  </label>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="code-email">
                    邮箱
                  </label>
                  <input
                    id="code-email"
                    className="field"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="请输入注册邮箱"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="code">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="code"
                      className="field"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="6 位验证码"
                      required
                    />
                    <button
                      type="button"
                      className="btn-secondary flex-shrink-0 whitespace-nowrap"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || loading}
                    >
                      {countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {mode === 'login' ? '登录' : mode === 'register' ? '注册并登录' : '验证码登录'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />
            或
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={handleGuest}
            disabled={loading}
          >
            以路人身份进入
          </button>
          <p className="mt-3 text-center text-xs text-subtle">
            路人身份无法使用翻译、网页阅读与 AI 密钥管理
          </p>
        </div>
      </section>
    </div>
  );
}
