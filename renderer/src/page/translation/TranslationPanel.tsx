import { useState, useRef } from 'react';
import { translateText, detectLanguage } from '../../utils/translation';
import { showToast } from '../../components/toast/Toast';
import { useAppStore } from '../../store/useAppStore';

export function TranslationPanel() {
  const { canUseFeature } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState<'zh' | 'en'>('zh');
  const [targetLang, setTargetLang] = useState<'zh' | 'en'>('en');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleTranslate = async () => {
    if (!canUseFeature('translation')) {
      showToast('路人身份无法使用翻译功能，请注册或登录');
      return;
    }

    if (!inputText.trim()) {
      showToast('请输入要翻译的文本');
      return;
    }

    // 检测语言并设置源语言和目标语言
    const detectedLang = detectLanguage(inputText);
    setSourceLang(detectedLang);
    setTargetLang(detectedLang === 'zh' ? 'en' : 'zh');

    setIsTranslating(true);
    setOutputText('');

    try {
      await translateText(
        inputText,
        // onChunk: 接收流式数据块
        (chunk) => {
          setOutputText((prev) => prev + chunk);
        },
        // onComplete: 翻译完成
        (result) => {
          setOutputText(result);
          setIsTranslating(false);
        },
        // onError: 错误处理
        (error) => {
          console.error('翻译错误:', error);
          showToast(`翻译失败: ${error.message}`);
          setIsTranslating(false);
        }
      );
    } catch (error) {
      console.error('翻译异常:', error);
      showToast(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsTranslating(false);
    }
  };

  const handleCopy = async () => {
    if (!outputText) {
      showToast('没有可复制的内容');
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
      showToast('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败');
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  const handleSwap = () => {
    const temp = inputText;
    setInputText(outputText);
    setOutputText(temp);
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 键触发翻译，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTranslating && inputText.trim()) {
        handleTranslate();
      }
    }
  };

  return (
    <section className="flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-soft backdrop-blur">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">中英文翻译</h2>
          <p className="text-sm text-slate-500">支持中文和英文互译</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={handleClear}
            disabled={isTranslating}
          >
            清空
          </button>
          <button
            className="btn-secondary"
            onClick={handleSwap}
            disabled={isTranslating || !outputText}
          >
            交换
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* 输入区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              {sourceLang === 'zh' ? '中文' : 'English'}
            </label>
            <button
              className="btn-primary text-sm px-4 py-1.5"
              onClick={handleTranslate}
              disabled={isTranslating || !inputText.trim()}
            >
              {isTranslating ? '翻译中...' : '翻译'}
            </button>
          </div>
          <textarea
            className="flex-1 w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder={sourceLang === 'zh' ? '请输入中文... (Enter 翻译, Shift+Enter 换行)' : 'Enter English text... (Enter to translate, Shift+Enter for new line)'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTranslating}
          />
        </div>

        {/* 输出区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              {targetLang === 'zh' ? '中文' : 'English'}
            </label>
            <button
              className="btn-secondary text-sm px-4 py-1.5"
              onClick={handleCopy}
              disabled={!outputText}
            >
              复制
            </button>
          </div>
          <div className="flex-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800 overflow-y-auto">
            {outputText || (
              <div className="text-slate-400 italic">
                {isTranslating ? '翻译中...' : '翻译结果将显示在这里'}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

