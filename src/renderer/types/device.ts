// 创建新的类型定义文件
export interface Device {
    id: string;
    name: string;
    host: string;
    addresses?: string[];
    port?: number;
} 