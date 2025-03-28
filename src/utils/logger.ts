export const logger = {
    debug: (module: string, message: string, ...args: any[]) => {
        console.log(`[${module}] ${message}`, ...args);
    },
    error: (module: string, message: string, error: any) => {
        console.error(`[${module}] ${message}`, error);
    },
    // 可以添加写入文件等功能
}; 