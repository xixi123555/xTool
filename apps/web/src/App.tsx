import { BrowserRouter } from 'react-router-dom';

import { AppRouter } from './app/router';
import { ThemeEffect } from './app/ThemeEffect';
import { FeedbackHost } from './shared/ui/FeedbackHost';

export function App() {
  return (
    <BrowserRouter>
      <ThemeEffect />
      <AppRouter />
      <FeedbackHost />
    </BrowserRouter>
  );
}
