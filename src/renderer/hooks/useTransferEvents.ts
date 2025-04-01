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
        const handleTransferEvent = (event: CustomEvent) => {
            const { type, transfer } = event.detail;

            if (!transfer || !transfer.id) {
                console.warn('[TransferEvents] 收到无效传输事件', event.detail);
                return;
            }

            console.log(`[TransferEvents] 处理传输事件: ${type} ${transfer.id} (${transfer.progress || 0}%)`);

            // 确保传输对象完整且进度值合法
            const safeTransfer = {
                ...transfer,
                progress: typeof transfer.progress === 'number' && !isNaN(transfer.progress)
                    ? Math.min(Math.max(0, transfer.progress), 100) // 确保进度在0-100之间
                    : 0
            };

            setTransfers(prev => {
                const exists = prev.some(t => t.id === safeTransfer.id);

                if (exists) {
                    return prev.map(t => t.id === safeTransfer.id ? { ...t, ...safeTransfer } : t);
                } else {
                    console.log(`[TransferEvents] 添加新传输: ${safeTransfer.id}`);
                    return [...prev, safeTransfer];
                }
            });
        };

        // 添加事件监听器
        window.addEventListener('transferEvent', handleTransferEvent as EventListener);
        return () => window.removeEventListener('transferEvent', handleTransferEvent as EventListener);
    }, []);

    return { transfers };
};

// 导出发布方法供 usePeerJS 使用
export const publishTransferEvent = (event: TransferEvent) => {
    transferEventBus.publish(event);
}; 