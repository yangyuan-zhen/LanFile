import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class LogService {
    private logPath: string;

    constructor() {
        this.logPath = path.join(app.getPath('userData'), 'logs');
        // 确保日志目录存在
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }

    // 覆盖默认的 console.log
    setupConsole() {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        // 替换 console.log
        console.log = (...args) => {
            // 原始输出
            originalConsoleLog.apply(console, args);
            // 写入文件日志（带有正确的编码）
            this.writeLog('info', args);
        };

        console.error = (...args) => {
            // 原始输出
            originalConsoleError.apply(console, args);
            // 写入文件日志
            this.writeLog('error', args);
        };

        // 添加对 console.warn 的重写
        console.warn = (...args) => {
            // 原始输出
            originalConsoleWarn.apply(console, args);
            // 写入文件日志
            this.writeLog('warn', args);
        };
    }

    private writeLog(level: string, args: any[]) {
        try {
            const logFile = path.join(this.logPath, `${new Date().toISOString().split('T')[0]}.log`);
            const timestamp = new Date().toISOString();
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');

            fs.appendFileSync(
                logFile,
                `[${timestamp}] [${level.toUpperCase()}] ${message}\n`,
                { encoding: 'utf8' }
            );
        } catch (error) {
            // 使用类型断言解决 _rawDebug 属性不存在的问题
            (process as any)._rawDebug(`日志写入失败: ${error}`);
        }
    }

    log(message: string): void {
        console.log(message);
    }

    error(message: string): void {
        console.error(message);
    }

    warn(message: string): void {
        console.warn(message);
    }

    // 添加日志清理方法
    cleanOldLogs(daysToKeep: number = 7): void {
        try {
            const files = fs.readdirSync(this.logPath);
            const now = new Date();

            files.forEach(file => {
                if (!file.endsWith('.log')) return;

                const filePath = path.join(this.logPath, file);
                const fileDate = new Date(file.split('.')[0]);

                // 计算日志文件的天数差
                const diffDays = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays > daysToKeep) {
                    fs.unlinkSync(filePath);
                    console.log(`已删除旧日志文件: ${file}`);
                }
            });
        } catch (error) {
            console.error(`清理旧日志文件失败: ${error}`);
        }
    }
}

export const logService = new LogService();
// 初始化控制台重写
logService.setupConsole(); 