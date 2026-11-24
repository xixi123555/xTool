import { useSyncExternalStore } from 'react';

/**
 * 订阅 CSS 媒体查询。
 *
 * 使用 useSyncExternalStore 而不是 useEffect + setState，
 * 首帧就能拿到正确结果，避免 PC/移动端视图切换时闪一下。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE_QUERY = '(max-width: 767px)';

/** 记账等模块用这个断点决定渲染 PC 还是移动端视图 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
