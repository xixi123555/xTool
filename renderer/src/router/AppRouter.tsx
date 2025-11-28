import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/transition/PageTransition';
import { ProtectedRoute } from './ProtectedRoute';
import { routes, defaultRoute } from './routes';

export function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute path={route.path}>
                <PageTransition>{route.element}</PageTransition>
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

