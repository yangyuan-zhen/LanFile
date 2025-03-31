import { useEffect, useState } from 'react';
import type { FileTransfer } from './usePeerJS';

// 定义事件类型
type TransferEvent = {
    type: 'progress' | 'complete' | 'error' | 'new';
    transfer: FileTransfer;
};

// 创建一个全局事件总线
const transferEventBus = {
    listeners: new Set<(event: TransferEvent) => void>(),

    publish(event: TransferEvent) {
        this.listeners.forEach(listener => listener(event));
    },

    subscribe(listener: (event: TransferEvent) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        }
    }
};

// 创建钩子
export const useTransferEvents = () => {
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);

    useEffect(() => {
        const unsubscribe = transferEventBus.subscribe((event) => {
            console.log('[TransferEvents] 收到传输事件:', event.type, event.transfer.id);

            setTransfers(prev => {
                // 处理不同事件类型
                switch (event.type) {
                    case 'new':
                        return [...prev, event.transfer];
                    case 'progress':
                    case 'complete':
                    case 'error':
                        return prev.map(t => t.id === event.transfer.id ? event.transfer : t);
                    default:
                        return prev;
                }
            });
        });

        return unsubscribe;
    }, []);

    return { transfers };
};

// 导出发布方法供 usePeerJS 使用
export const publishTransferEvent = (event: TransferEvent) => {
    transferEventBus.publish(event);
}; 