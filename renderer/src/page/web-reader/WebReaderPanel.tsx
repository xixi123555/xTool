import { useState } from 'react';
import { readWebPage, isValidUrl } from '../../utils/webReader';
import { showToast } from '../../components/toast/Toast';
import { useAppStore } from '../../store/useAppStore';

export function WebReaderPanel() {
  const { canUseFeature } = useAppStore();
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [isReading, setIsReading] = useState(false);

  const handleRead = async () => {
    if (!canUseFeature('web_reader')) {
      showToast('路人身份无法使用网页阅读器功能，请注册或登录');
      return;
    }

    if (!url.trim()) {
      showToast('请输入网页地址');
      return;
    }

    if (!isValidUrl(url)) {
      showToast('请输入有效的网址（以 http:// 或 https:// 开头）');
      return;
    }

    setIsReading(true);
    setContent('');

    try {
      await readWebPage(
        url,
        // onChunk: 接收流式数据块
        (chunk) => {
          setContent((prev) => prev + chunk);
        },
        // onComplete: 读取完成
        (result) => {
          setContent(result);
          setIsReading(false);
        },
        // onError: 错误处理
        (error) => {
          console.error('网页读取错误:', error);
          showToast(`读取失败: ${error.message}`);
          setIsReading(false);
        }
      );
    } catch (error) {
      console.error('网页读取异常:', error);
      showToast(`读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsReading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setContent('');
  };

  const handleCopy = async () => {
    if (!content) {
      showToast('没有可复制的内容');
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      showToast('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isReading) {
      handleRead();
    }
  };

  return (
    <section className="flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-soft backdrop-blur">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">网页阅读器</h2>
          <p className="text-sm text-slate-500">输入网址，AI 将为您提取并总结网页内容</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={handleCopy}
            disabled={!content}
          >
            复制
          </button>
          <button
            className="btn-secondary"
            onClick={handleClear}
            disabled={isReading}
          >
            清空
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 flex-1 overflow-hidden">
        {/* URL 输入区域 */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="请输入网页地址，例如：https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isReading}
          />
          <button
            className="btn-primary px-6"
            onClick={handleRead}
            disabled={isReading || !url.trim()}
          >
            {isReading ? '读取中...' : '读取'}
          </button>
        </div>

        {/* 内容显示区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">网页内容</label>
            {isReading && (
              <span className="text-xs text-slate-500 animate-pulse">正在读取...</span>
            )}
          </div>
          <div className="flex-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800 overflow-y-auto whitespace-pre-wrap">
            {content || (
              <div className="text-slate-400 italic">
                {isReading ? '正在读取网页内容...' : '网页内容将显示在这里'}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

