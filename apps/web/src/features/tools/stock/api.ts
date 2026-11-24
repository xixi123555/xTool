import { get } from '../../../shared/lib/http';

export interface StockItem {
  dm: string;
  mc: string;
  jys: string;
}

export interface DividendInfo {
  sdate: string;
  give: string;
  change: string;
  send: string;
  line: string;
  cdate: string;
  edate: string;
  hdate: string;
  o?: string;
}

export interface PricePoint {
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface ProxyResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export async function fetchStockList(): Promise<StockItem[]> {
  const result = await get<ProxyResponse<StockItem[]>>('/stock/list');
  if (!result.success) throw new Error(result.error || '获取股票列表失败');
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchDividends(code: string): Promise<DividendInfo[]> {
  const result = await get<ProxyResponse<DividendInfo[]>>(
    `/stock/dividends/${encodeURIComponent(code)}`,
  );
  if (!result.success) throw new Error(result.error || '获取分红信息失败');
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchPrices(code: string): Promise<PricePoint[]> {
  const result = await get<ProxyResponse<PricePoint[]>>(
    `/stock/prices/${encodeURIComponent(code)}`,
  );
  if (!result.success) throw new Error(result.error || '获取历史价格失败');
  return Array.isArray(result.data) ? result.data : [];
}

export function priceOnDate(prices: PricePoint[], date: string): number | undefined {
  const normalized =
    date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
  return prices.find((point) => point.d === normalized)?.o;
}
