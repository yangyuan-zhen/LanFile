import { useState, useEffect, useCallback } from 'react';
import { useDeviceInfo } from './useDeviceInfo';

export const useWebRTCSignaling = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectedDevices, setConnectedDevices] = useState<Record<string, any>>({});
    const deviceInfo = useDeviceInfo();

    // 初始化信令服务
    useEffect(() => {
        const initSignaling = async () => {
            if (!deviceInfo.id || !deviceInfo.name) return;

            try {
                // 不再请求服务配置，直接连接到默认端口
                // 默认使用内置信令服务器，不需要外部连接

                // 启动信令服务
                const result = await window.electron.invoke('signaling:start', deviceInfo.id, deviceInfo.name);
                if (result.success) {
                    console.log(`信令服务已启动，端口: ${result.port}`);
                    setIsConnected(true);
                } else {
                    console.error('启动信令服务失败:', result.error);
                }
            } catch (error) {
                console.error('信令服务初始化错误:', error);
            }
        };

        initSignaling();

        // 订阅设备连接事件
        const deviceConnectedHandler = (device: any) => {
            console.log('设备已连接:', device);
            setConnectedDevices(prev => ({
                ...prev,
                [device.id]: device
            }));
        };

        const deviceDisconnectedHandler = (deviceId: string) => {
            console.log('设备已断开:', deviceId);
            setConnectedDevices(prev => {
                const newDevices = { ...prev };
                delete newDevices[deviceId];
                return newDevices;
            });
        };

        // 设置事件监听
        window.electron.signaling.onDeviceConnected(deviceConnectedHandler);
        window.electron.signaling.onDeviceDisconnected(deviceDisconnectedHandler);

        return () => {
            // 停止信令服务
            window.electron.invoke('signaling:stop').catch(console.error);
        };
    }, [deviceInfo.id, deviceInfo.name]);

    // 连接到设备
    const connectToDevice = useCallback(async (deviceId: string, address: string, port?: number) => {
        try {
            const result = await window.electron.invoke('signaling:connectToDevice', deviceId, address, port);
            return result.success;
        } catch (error) {
            console.error('连接到设备失败:', error);
            return false;
        }
    }, []);

    // 发送信令消息
    const sendSignalingMessage = useCallback(async (targetDeviceId: string, message: any) => {
        try {
            const finalMessage = {
                ...message,
                from: deviceInfo.id,
                to: targetDeviceId,
                timestamp: Date.now()
            };

            return await window.electron.invoke('signaling:sendMessage', targetDeviceId, finalMessage);
        } catch (error) {
            console.error('发送信令消息失败:', error);
            return { success: false };
        }
    }, [deviceInfo.id]);

    // 断开与设备的连接
    const disconnectFromDevice = useCallback(async (deviceId: string) => {
        try {
            await window.electron.invoke('signaling:disconnectFromDevice', deviceId);
            return true;
        } catch (error) {
            console.error('断开设备连接失败:', error);
            return false;
        }
    }, []);

    return {
        isConnected,
        connectedDevices: Object.values(connectedDevices),
        connectToDevice,
        sendSignalingMessage,
        disconnectFromDevice
    };
}; 