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