import { ClipboardHistoryPanel } from './page/clipboard-history/ClipboardHistoryPanel';
import { JsonFormatterPanel } from './page/json-formatter/JsonFormatterPanel';
import { Sidebar } from './components/sidebar/Sidebar';
import { useState } from 'react';

const panels = {
  clipboard: <ClipboardHistoryPanel />,
  json: <JsonFormatterPanel />,
};

export function App() {
  const [activePanel, setActivePanel] = useState<keyof typeof panels>('clipboard');

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-800">
      <Sidebar activePanel={activePanel} onChange={setActivePanel} />
      <main className="flex flex-1 flex-col gap-4 p-6">
        {panels[activePanel]}
      </main>
    </div>
  );
}
