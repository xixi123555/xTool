/**
 * 登录回跳：用 sessionStorage 暂存目标路径。
 *
 * token 失效时 http 客户端会整页跳转，拿不到 router state，
 * 因此这里只做 sessionStorage 级别的轻量记录。
 */
const LOGIN_REDIRECT_KEY = 'xtool_login_redirect';

function isSafeAppPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login');
}

export function saveLoginRedirect(path: string): void {
  if (!isSafeAppPath(path)) return;
  try {
    sessionStorage.setItem(LOGIN_REDIRECT_KEY, path);
  } catch {
    // 隐私模式下 sessionStorage 不可用时，登录后回到默认页即可
  }
}

export function consumeLoginRedirect(fallback: string): string {
  try {
    const target = sessionStorage.getItem(LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
    if (target && isSafeAppPath(target)) return target;
  } catch {
    // 忽略读取失败，使用兜底路径
  }
  return fallback;
}
