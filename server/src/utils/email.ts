/**
 * 邮件发送工具
 */
import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// 创建邮件传输器
function createTransporter() {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  return nodemailer.createTransport(config);
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"xTool" <${process.env.SMTP_USER || ''}>`,
    to: email,
    subject: 'xTool 验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">xTool 验证码</h2>
        <p style="color: #666; font-size: 14px;">您的验证码是：</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          验证码有效期为 10 分钟，请勿泄露给他人。
        </p>
        <p style="color: #999; font-size: 12px;">
          如果您没有请求此验证码，请忽略此邮件。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`验证码邮件已发送到: ${email}`);
  } catch (error) {
    console.error('发送邮件失败:', error);
    throw new Error('发送验证码邮件失败');
  }
}

