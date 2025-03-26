export interface NetworkDevice {
    id: string;
    name: string;
    ip: string;
    port?: number;
    type: string;
    online: boolean;
    icon?: any;
    status?: string;
}

export interface Device {
    id: string;
    name: string;
    ip: string;
    port?: number;
    status?: string;
    type?: string;
    [key: string]: any; // 允许其他属性
} 