import { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/transition/PageTransition';
import { ProtectedRoute } from './ProtectedRoute';
import { routes, defaultRoute } from './routes';

function PageLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
    </div>
  );
}

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
                <PageTransition>
                  <Suspense fallback={<PageLoading />}>
                    {route.element}
                  </Suspense>
                </PageTransition>
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

