import React, { useState, useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import jsonlint from 'jsonlint-mod';

type ComparisonType = 'text' | 'json';

export function ComparisonPanel() {
  const [type, setType] = useState<ComparisonType>('text');
  const [originalText, setOriginalText] = useState('');
  const [changedText, setChangedText] = useState('');

  // 处理文本，如果是JSON模式则格式化
  const { oldValue, newValue } = useMemo(() => {
    let text1 = originalText;
    let text2 = changedText;

    if (type === 'json') {
      try {
        if (originalText.trim()) {
          const originalJson = jsonlint.parse(originalText);
          text1 = JSON.stringify(originalJson, null, 2);
        }
        if (changedText.trim()) {
          const changedJson = jsonlint.parse(changedText);
          text2 = JSON.stringify(changedJson, null, 2);
        }
      } catch (error) {
        // JSON解析失败，使用原始文本
      }
    }

    return { oldValue: text1, newValue: text2 };
  }, [originalText, changedText, type]);

  // 获取语言模式
  const language = type === 'json' ? 'json' : 'plaintext';

  // 处理编辑器挂载
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneDiffEditor,
    monaco: Monaco
  ) => {
    // 监听修改后的编辑器变化
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent(() => {
      const value = modifiedEditor.getValue();
      setChangedText(value);
    });

    // 监听原始编辑器变化
    const originalEditor = editor.getOriginalEditor();
    originalEditor.onDidChangeModelContent(() => {
      const value = originalEditor.getValue();
      setOriginalText(value);
    });
  };

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">对比</h2>
          <p className="text-sm text-slate-500">文本和JSON对比工具</p>
        </div>
        <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setType('text')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              type === 'text'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setType('json')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              type === 'json'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JSON
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={oldValue}
          modified={newValue}
          theme="vs"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            renderSideBySide: true,
            wordWrap: 'on',
            automaticLayout: true,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </section>
  );
}

