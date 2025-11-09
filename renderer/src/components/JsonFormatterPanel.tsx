import { useCallback, useState } from 'react';
import jsonlint from 'jsonlint-mod';

export function JsonFormatterPanel() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFormat = useCallback(() => {
    try {
      const parsed = jsonlint.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = jsonlint.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [input]);

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">JSON 工具</h2>
          <p className="text-sm text-slate-500">格式化、压缩与校验 JSON 字符串</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleFormat}>
            格式化
          </button>
          <button className="btn-secondary" onClick={handleMinify}>
            压缩
          </button>
        </div>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-4">
        <textarea
          className="h-full w-full resize-none rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm shadow-inner focus:border-slate-400 focus:outline-none"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="将 JSON 字符串粘贴到这里"
        />
        <textarea
          className="h-full w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm shadow-inner"
          value={output}
          readOnly
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
