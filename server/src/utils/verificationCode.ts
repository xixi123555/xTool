/**
 * 验证码存储和管理
 */

interface VerificationCode {
  code: string;
  email: string;
  expiresAt: number;
}

// 内存存储验证码（生产环境建议使用 Redis）
const verificationCodes = new Map<string, VerificationCode>();

// 验证码有效期（10分钟）
const CODE_EXPIRY_TIME = 10 * 60 * 1000;

/**
 * 生成6位数字验证码
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 存储验证码
 */
export function storeCode(email: string, code: string): void {
  const expiresAt = Date.now() + CODE_EXPIRY_TIME;
  verificationCodes.set(email, {
    code,
    email,
    expiresAt,
  });

  // 清理过期验证码
  cleanupExpiredCodes();
}

/**
 * 验证验证码
 */
export function verifyCode(email: string, code: string): boolean {
  const stored = verificationCodes.get(email);

  if (!stored) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return false;
  }

  // 检查验证码是否匹配
  if (stored.code !== code) {
    return false;
  }

  // 验证成功后删除验证码（一次性使用）
  verificationCodes.delete(email);
  return true;
}

/**
 * 清理过期验证码
 */
function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(email);
    }
  }
}

/**
 * 检查验证码是否存在且未过期
 */
export function hasValidCode(email: string): boolean {
  const stored = verificationCodes.get(email);
  if (!stored) {
    return false;
  }
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return false;
  }
  return true;
}

/**
 * 获取验证码剩余时间（秒）
 */
export function getCodeRemainingTime(email: string): number {
  const stored = verificationCodes.get(email);
  if (!stored) {
    return 0;
  }
  const remaining = stored.expiresAt - Date.now();
  return remaining > 0 ? Math.floor(remaining / 1000) : 0;
}

