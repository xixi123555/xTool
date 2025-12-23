/**
 * 股票数据 API
 */
const API_BASE_URL = 'https://api.mairuiapi.com';
const LICENCE = '2874a10189f58fa06e';

export interface StockItem {
  dm: string; // 股票代码
  mc: string; // 股票名称
  jys: string; // 交易所，"sh"表示上证，"sz"表示深证
}

export interface DividendInfo {
  sdate: string; // 公告日期
  give: string; // 每10股送股数
  change: string; // 每10股转增股数
  send: string; // 每10股派息金额（税前）
  line: string; // 进度
  cdate: string; // 除权除息日
  edate: string; // 股权登记日
  hdate: string; // 红股上市日
  o?: string; // 当日价格
}

/**
 * 获取股票列表
 */
export async function getStockList(): Promise<StockItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/hslt/list/${LICENCE}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取股票列表失败:', error);
    throw error;
  }
}

export interface StockPriceData {
  d: string; // 日期，格式：YYYY-MM-DD
  o: number; // 开盘价
  h: number; // 最高价
  l: number; // 最低价
  c: number; // 收盘价
  v: number; // 成交量
  e: number; // 成交额
  zf?: number; // 涨幅
  hs?: number; // 换手率
  zd?: number; // 涨跌
  zde?: number; // 涨跌额
  ud?: string; // 更新时间
}

/**
 * 获取股票历史价格数据
 * @param stockCode 股票代码，如：000001
 */
export async function getStockPriceHistory(stockCode: string): Promise<StockPriceData[]> {
  try {
    // 提取纯股票代码（移除交易所后缀，如.SH、.SZ等）
    let code = stockCode;
    if (code.includes('.')) {
      code = code.split('.')[0];
    }
    
    const response = await fetch(`${API_BASE_URL}/hszbl/fsjy/${code}/dn/${LICENCE}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取股票历史价格失败:', error);
    return [];
  }
}

/**
 * 从历史价格数据中获取指定日期的价格
 * @param priceHistory 历史价格数据数组
 * @param date 日期，格式：YYYY-MM-DD 或 YYYYMMDD
 */
export function getPriceByDate(priceHistory: StockPriceData[], date: string): number | undefined {
  // 格式化日期为 YYYY-MM-DD
  let formattedDate = date;
  if (date.length === 8 && !date.includes('-')) {
    // YYYYMMDD 格式转换为 YYYY-MM-DD
    formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  }
  
  // 在历史数据中查找对应日期的数据
  const priceData = priceHistory.find((item) => item.d === formattedDate);
  return priceData?.o;
}

/**
 * 获取股票分红信息
 * @param stockCode 股票代码，如：000001 或 000001.SZ（会自动提取纯代码）
 */
export async function getDividendInfo(stockCode: string): Promise<DividendInfo[]> {
  try {
    // 提取纯股票代码（移除交易所后缀，如.SH、.SZ等）
    let code = stockCode;
    if (code.includes('.')) {
      // 如果包含点，提取点之前的部分作为股票代码
      code = code.split('.')[0];
    }
    
    const response = await fetch(`${API_BASE_URL}/hscp/jnfh/${code}/${LICENCE}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取分红信息失败:', error);
    throw error;
  }
}

