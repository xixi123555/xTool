/**
 * 股票数据代理。
 *
 * 第三方行情接口的授权码只放在服务端环境变量里，浏览器不直接接触；
 * 同时统一超时与错误口径，页面只需处理 success/error。
 */
import express, { Request, Response } from 'express';

import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = express.Router();
const API_BASE = 'https://api.mairuiapi.com';
const LICENSE = process.env.MAIRUI_LICENSE || '';

function ensureLicense(res: Response): boolean {
  if (LICENSE) return true;
  res.status(503).json({ error: '未配置行情授权码，请联系管理员' });
  return false;
}

router.use((req, res, next) => {
  authenticate(req as unknown as AuthenticatedRequest, res, next);
});

async function proxyJson(res: Response, path: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      res.status(502).json({ error: `行情服务返回 ${response.status}` });
      return;
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('股票行情请求失败:', error);
    res.status(502).json({ error: '行情服务暂时不可用' });
  }
}

router.get('/list', (_req: Request, res: Response) => {
  if (!ensureLicense(res)) return;
  void proxyJson(res, `/hslt/list/${LICENSE}`);
});

router.get('/dividends/:code', (req: Request, res: Response) => {
  if (!ensureLicense(res)) return;
  const code = req.params.code.split('.')[0];
  void proxyJson(res, `/hscp/jnfh/${code}/${LICENSE}`);
});

router.get('/prices/:code', (req: Request, res: Response) => {
  if (!ensureLicense(res)) return;
  const code = req.params.code.split('.')[0];
  void proxyJson(res, `/hszbl/fsjy/${code}/dn/${LICENSE}`);
});

export default router;
