import { Outlet } from 'react-router-dom';

import { MobileTabBar, MobileTopBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
