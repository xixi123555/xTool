import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

class Logger {
  private logFilePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logFilePath = path.join(userDataPath, 'logs', 'main.log');
    const directory = path.dirname(this.logFilePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  private write(level: 'info' | 'error' | 'warn', message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFilePath, `[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
  }

  info(message: string) {
    this.write('info', message);
  }

  warn(message: string) {
    this.write('warn', message);
  }

  error(message: string, error?: unknown) {
    const details = error instanceof Error ? ` | ${error.name}: ${error.message}` : '';
    this.write('error', `${message}${details}`);
  }
}

export const logger = new Logger();
