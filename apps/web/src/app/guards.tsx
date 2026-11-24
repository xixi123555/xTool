import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { saveLoginRedirect } from '../shared/lib/redirect';
import { useAuthStore } from '../shared/store/auth';

export function RequireAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const authenticated = Boolean(user && token);

  useEffect(() => {
    if (!authenticated) {
      saveLoginRedirect(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [authenticated, location]);

  if (!authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnly() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  if (user && token) return <Navigate to="/bookkeeping" replace />;
  return <Outlet />;
}

/** 需要正式账号的页面（翻译、网页阅读等） */
export function RequireMember() {
  const user = useAuthStore((state) => state.user);
  if (user?.user_type === 'guest') return <Navigate to="/tools" replace />;
  return <Outlet />;
}
