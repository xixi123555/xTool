import { Search, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { toast } from '../../../shared/store/feedback';
import { Page, PageHeader, Spinner } from '../../../shared/ui/Page';
import {
  fetchDividends,
  fetchPrices,
  fetchStockList,
  priceOnDate,
  type DividendInfo,
  type PricePoint,
  type StockItem,
} from './api';
import { PriceChart } from './PriceChart';

function dividendPlan(item: DividendInfo): string {
  const parts: string[] = [];
  if (item.give && item.give !== '0') parts.push(`送 ${item.give}`);
  if (item.change && item.change !== '0') parts.push(`转 ${item.change}`);
  if (item.send && item.send !== '0') parts.push(`派 ${item.send}`);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

export function StockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [dividends, setDividends] = useState<DividendInfo[]>([]);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStockList()
      .then(setStocks)
      .catch((error) => toast(errorMessage(error, '股票列表加载失败'), 'error'))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const suggestions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return stocks
      .filter(
        (stock) =>
          stock.dm.toLowerCase().includes(keyword) || stock.mc.toLowerCase().includes(keyword),
      )
      .slice(0, 8);
  }, [stocks, query]);

  const loadDetail = async (stock: StockItem) => {
    setSelected(stock);
    setQuery(`${stock.dm} ${stock.mc}`);
    setSuggestionsOpen(false);
    setLoadingDetail(true);
    try {
      const [dividendData, priceData] = await Promise.all([
        fetchDividends(stock.dm),
        fetchPrices(stock.dm),
      ]);
      setDividends(dividendData);
      setPrices(priceData);
    } catch (error) {
      toast(errorMessage(error, '行情加载失败'), 'error');
      setDividends([]);
      setPrices([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleManualSearch = () => {
    const keyword = query.trim();
    if (!/^\d{6}$/.test(keyword)) {
      toast('请输入 6 位股票代码，或从建议中选择', 'error');
      return;
    }
    const matched = stocks.find((stock) => stock.dm.split('.')[0] === keyword);
    void loadDetail(matched ?? { dm: keyword, mc: `股票 ${keyword}`, jys: '' });
  };

  const latest = dividends[0];

  return (
    <Page>
      <PageHeader title="股票" description="查询分红方案与历史收盘价。" />

      <div className="card p-4">
        <div ref={searchRef} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                className="field pl-9"
                placeholder="输入股票代码或名称，例如 000001 / 平安银行"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleManualSearch();
                }}
              />
            </div>
            <button
              type="button"
              className="btn-primary flex-shrink-0"
              onClick={handleManualSearch}
            >
              查询
            </button>
          </div>

          {suggestionsOpen && suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-pop">
              {suggestions.map((stock) => (
                <li key={`${stock.jys}-${stock.dm}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void loadDetail(stock)}
                  >
                    <span className="font-medium text-fg">{stock.mc}</span>
                    <span className="text-xs text-subtle">
                      {stock.dm} · {stock.jys.toUpperCase()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {loadingList && <p className="mt-2 text-xs text-subtle">股票列表加载中…</p>}
      </div>

      {loadingDetail ? (
        <Spinner className="py-16" />
      ) : selected ? (
        <div className="mt-4 space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-fg">{selected.mc}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {selected.dm}
                  {selected.jys ? ` · ${selected.jys.toUpperCase()}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-xs text-subtle">最新公告</p>
                  <p className="mt-0.5 font-medium text-fg">{latest?.sdate || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">除权除息</p>
                  <p className="mt-0.5 font-medium text-fg">{latest?.cdate || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">最新方案</p>
                  <p className="mt-0.5 font-medium text-fg">
                    {latest ? dividendPlan(latest) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-subtle">分红次数</p>
                  <p className="mt-0.5 font-medium text-fg">{dividends.length}</p>
                </div>
              </div>
            </div>
          </div>

          <PriceChart prices={prices} />

          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <TrendingUp className="h-4 w-4 text-accent" />
              <p className="section-title">分红记录</p>
            </div>
            {dividends.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-subtle">暂无分红记录。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs text-subtle">
                    <tr>
                      <th className="px-4 py-2 font-medium">公告日</th>
                      <th className="px-4 py-2 font-medium">方案</th>
                      <th className="hidden px-4 py-2 font-medium sm:table-cell">除权除息日</th>
                      <th className="hidden px-4 py-2 font-medium sm:table-cell">股权登记日</th>
                      <th className="px-4 py-2 font-medium">进度</th>
                      <th className="px-4 py-2 text-right font-medium">当日价格</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dividends.map((item, index) => {
                      const price = priceOnDate(prices, item.cdate || item.sdate);
                      return (
                        <tr key={`${item.sdate}-${index}`} className="hover:bg-muted/60">
                          <td className="px-4 py-2.5 text-fg">{item.sdate}</td>
                          <td className="px-4 py-2.5 text-fg">{dividendPlan(item)}</td>
                          <td className="hidden px-4 py-2.5 text-subtle sm:table-cell">
                            {item.cdate || '—'}
                          </td>
                          <td className="hidden px-4 py-2.5 text-subtle sm:table-cell">
                            {item.edate || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-subtle">{item.line || '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-fg">
                            {price !== undefined ? price.toFixed(2) : item.o || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
          <TrendingUp className="h-8 w-8 text-subtle" />
          <p className="mt-2 text-sm font-medium text-fg">搜索一只股票开始</p>
          <p className="mt-1 text-xs text-subtle">可以输入代码，也可以输入名称。</p>
        </div>
      )}
    </Page>
  );
}
