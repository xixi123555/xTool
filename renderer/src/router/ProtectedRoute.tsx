import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { routes, defaultRoute } from './routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

/**
 * 受保护的路由组件
 * 根据路由配置和用户身份控制访问权限
 */
export function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const { user } = useAppStore();
  const location = useLocation();

  // 查找当前路由配置
  const routeConfig = routes.find((route) => route.path === path);

  // 如果是路人用户，检查 isShowForGuest
  if (user?.user_type === 'guest' && routeConfig?.isShowForGuest === false) {
    // 重定向到默认路由
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}

