/**
 * 登录回跳工具
 *
 * 背景：像 /video-to-gif 这样的深链接在未登录（或 token 失效）时会被重定向到登录页，
 * 而登录成功后固定跳 defaultRoute，用户原本想访问的页面就被丢掉了。
 * 这里用 sessionStorage 暂存目标路径，登录成功后消费一次并回跳。
 *
 * 为什么不用 location.state：token 失效时 http 拦截器走的是
 * window.location.pathname = '/login'（整页跳转），拿不到 router 的 state。
 */

const LOGIN_REDIRECT_KEY = 'xtool_login_redirect';

/**
 * 判断是否为可安全回跳的应用内路径
 * 必须以单个 "/" 开头，避免 //evil.com 这类协议相对地址被当成站内路径
 */
function isSafeAppPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

/** 判断目标是否就是登录页本身，是的话没必要回跳 */
function isLoginPath(path: string): boolean {
  return path === '/login' || path.startsWith('/login?') || path.startsWith('/login#');
}

/**
 * 记录本次想访问的路径，登录成功后回跳
 * @param path 应用内路径，可带 query 与 hash
 */
export function saveLoginRedirect(path: string): void {
  if (!isSafeAppPath(path) || isLoginPath(path)) return;
  try {
    sessionStorage.setItem(LOGIN_REDIRECT_KEY, path);
  } catch {
    // 隐私模式等场景下 sessionStorage 可能不可用，忽略即可，登录后回默认页
  }
}

/** 记录当前地址栏路径（整页跳转登录页前调用，会丢失 router 状态） */
export function saveCurrentLocationForLogin(): void {
  const { pathname, search, hash } = window.location;
  saveLoginRedirect(`${pathname}${search}${hash}`);
}

/**
 * 取出并清除待回跳路径
 * @param fallback 没有有效记录时使用的兜底路径（通常是 defaultRoute）
 */
export function consumeLoginRedirect(fallback: string): string {
  let target: string | null = null;
  try {
    target = sessionStorage.getItem(LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
  } catch {
    return fallback;
  }
  if (!target || !isSafeAppPath(target) || isLoginPath(target)) return fallback;
  return target;
}
