import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStockList, getDividendInfo, getStockPriceHistory, getPriceByDate, type StockItem, type DividendInfo, type StockPriceData } from '../../api/stock';
import { showToast } from '../../components/toast/Toast';
import { SearchIcon } from '../../assets/icons';
import { DividendList } from './DividendList';
import { DividendTrend } from './DividendTrend';

type TabId = 'dividend';
type ViewMode = 'list' | 'trend';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'dividend', label: '分红信息' },
];

export function StockPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('dividend');
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [dividendData, setDividendData] = useState<DividendInfo[]>([]);
  const [loadingDividend, setLoadingDividend] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const searchRef = useRef<HTMLDivElement>(null);

  // 加载股票列表
  useEffect(() => {
    async function loadStockList() {
      try {
        setLoading(true);
        const data = await getStockList();
        setStockList(data);
      } catch (error) {
        console.error('加载股票列表失败:', error);
        showToast('加载股票列表失败');
      } finally {
        setLoading(false);
      }
    }
    loadStockList();
  }, []);

  // 过滤股票列表
  const filteredStocks = useMemo(() => {
    if (!searchKeyword.trim()) {
      return [];
    }
    const keyword = searchKeyword.trim().toLowerCase();
    return stockList.filter(
      (stock) =>
        stock.dm.toLowerCase().includes(keyword) ||
        stock.mc.toLowerCase().includes(keyword)
    );
  }, [stockList, searchKeyword]);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // 加载分红信息
  const loadDividendInfo = async (stock: StockItem) => {
    try {
      setLoadingDividend(true);
      // 并行获取分红数据和历史价格数据
      const [dividendData, priceHistory] = await Promise.all([
        getDividendInfo(stock.dm),
        getStockPriceHistory(stock.dm)
      ]);
      
      // 为每个分红记录匹配对应日期的价格（使用除权除息日cdate，如果没有则使用公告日期sdate）
      const dataWithPrice = dividendData.map((item) => {
        const date = item.cdate || item.sdate;
        if (date) {
          const price = getPriceByDate(priceHistory, date);
          return {
            ...item,
            o: price !== undefined ? String(price) : undefined
          };
        }
        return { ...item, o: undefined };
      });
      
      setDividendData(dataWithPrice);
      setSelectedStock(stock);
    } catch (error) {
      console.error('加载分红信息失败:', error);
      showToast('加载分红信息失败');
      setDividendData([]);
    } finally {
      setLoadingDividend(false);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    if (!searchKeyword.trim()) {
      showToast('请输入股票代码或名称');
      return;
    }
    
    // 如果输入的是纯数字（可能是股票代码），尝试直接查找
    const keyword = searchKeyword.trim();
    const isNumericCode = /^\d{6}$/.test(keyword);
    
    if (isNumericCode) {
      // 直接查找匹配的股票代码
      const matchedStock = stockList.find((stock) => stock.dm === keyword);
      if (matchedStock) {
        loadDividendInfo(matchedStock);
        return;
      }
    }
    
    // 如果过滤结果为空
    if (filteredStocks.length === 0) {
      showToast('未找到匹配的股票');
      return;
    }
    
    // 如果有匹配结果，选择第一个
    loadDividendInfo(filteredStocks[0]);
  };

  // 处理输入框回车
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
      setShowSuggestions(false);
    }
  };

  // 处理输入框聚焦
  const handleInputFocus = () => {
    if (filteredStocks.length > 0) {
      setShowSuggestions(true);
    }
  };

  // 处理选择股票
  const handleSelectStock = (stock: StockItem) => {
    setSearchKeyword(`${stock.dm} ${stock.mc}`);
    setShowSuggestions(false);
    loadDividendInfo(stock);
  };

  return (
    <section className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft backdrop-blur">
      {/* <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">股票</h2>
          <p className="text-sm text-slate-500">股票数据查询工具</p>
        </div>
      </header> */}

      {/* Tab 导航 */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {activeTab === 'dividend' && (
          <div className="flex flex-col h-full gap-4">
            {/* 搜索区域 */}
            <div className="flex flex-col gap-3">
              <div className="relative flex gap-2" ref={searchRef}>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="输入股票代码或名称进行搜索（按Enter查询）"
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={handleInputFocus}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  className="flex w-40 items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSearch}
                  disabled={loading || !searchKeyword.trim()}
                >
                  <SearchIcon className="h-4 w-4" />
                  {loading ? '查询中...' : '查询'}
                </button>
                {showSuggestions && filteredStocks.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredStocks.slice(0, 10).map((stock) => (
                      <button
                        key={`${stock.dm}-${stock.jys}`}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition"
                        onClick={() => handleSelectStock(stock)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{stock.mc}</span>
                          <span className="text-slate-500">{stock.dm}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* 提示信息 */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg
                  className="h-4 w-4 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>提示: 可以尝试查询 000001(平安银行) 或 600519(贵州茅台)</span>
              </div>
            </div>

            {/* 分红信息展示区域 */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {loadingDividend ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-slate-500">加载中...</div>
                </div>
              ) : selectedStock ? (
                <div className="flex flex-col h-full">
                  {/* 标题区域 */}
                  <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">历史分红记录</h3>
                    <div className="flex gap-2">
                      <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          viewMode === 'list'
                            ? 'bg-white text-blue-600'
                            : 'bg-blue-500 text-white hover:bg-blue-400'
                        }`}
                        onClick={() => setViewMode('list')}
                      >
                        列表
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          viewMode === 'trend'
                            ? 'bg-white text-blue-600'
                            : 'bg-blue-500 text-white hover:bg-blue-400'
                        }`}
                        onClick={() => setViewMode('trend')}
                      >
                        趋势
                      </button>
                    </div>
                  </div>
                  {dividendData.length > 0 ? (
                    viewMode === 'list' ? (
                      <DividendList data={dividendData} />
                    ) : (
                      <DividendTrend data={dividendData} />
                    )
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center py-8 text-slate-500">
                        暂无分红信息
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-slate-500">请搜索股票代码或名称</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

