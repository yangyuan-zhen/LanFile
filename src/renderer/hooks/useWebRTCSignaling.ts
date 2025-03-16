import { useState, useEffect, useCallback } from 'react';
import { useDeviceInfo } from './useDeviceInfo';

export const useWebRTCSignaling = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectedDevices, setConnectedDevices] = useState<Record<string, any>>({});
    const deviceInfo = useDeviceInfo();

    // 1. 先定义处理函数
    const handleOfferMessage = useCallback(async (message: any) => {
        try {
            console.log('处理 offer 消息:', message);
            // 实现处理代码...
        } catch (error) {
            console.error('处理 offer 消息失败:', error);
        }
    }, []);

    const handleAnswerMessage = useCallback(async (message: any) => {
        try {
            console.log('处理 answer 消息:', message);
            // 实现处理代码...
        } catch (error) {
            console.error('处理 answer 消息失败:', error);
        }
    }, []);

    const handleIceCandidateMessage = useCallback(async (message: any) => {
        try {
            console.log('处理 ICE 候选消息:', message);
            // 实现处理代码...
        } catch (error) {
            console.error('处理 ICE 候选消息失败:', error);
        }
    }, []);

    // 2. 然后定义使用这些函数的 useEffect
    useEffect(() => {
        // 处理传入的信令消息
        const handleSignalingMessage = (message: any) => {
            console.log('收到信令消息:', message);

            if (message.type === 'offer' && message.from) {
                // 处理offer
                handleOfferMessage(message);
            } else if (message.type === 'answer' && message.from) {
                // 处理answer
                handleAnswerMessage(message);
            } else if (message.type === 'ice-candidate' && message.from) {
                // 处理ICE候选
                handleIceCandidateMessage(message);
            }
        };

        // 添加事件监听
        window.electron.signaling.onMessage(handleSignalingMessage);

        return () => {
            // 检查函数是否存在
            if (typeof window.electron.signaling.offMessage === 'function') {
                window.electron.signaling.offMessage(handleSignalingMessage);
            } else {
                console.warn('window.electron.signaling.offMessage 未定义，无法移除监听器');
                // 可能需要在 preload.js 中添加此函数
            }
        };
    }, [handleOfferMessage, handleAnswerMessage, handleIceCandidateMessage]);

    // 初始化信令服务
    useEffect(() => {
        const initSignaling = async () => {
            if (!deviceInfo.id || !deviceInfo.name) return;

            try {
                // 不再请求服务配置，直接连接到默认端口
                // 默认使用内置信令服务器，不需要外部连接

                // 启动信令服务
                const result = await window.electron.invoke('signaling:start', deviceInfo.id, deviceInfo.name);
                console.log('信令服务启动结果:', result); // 详细记录结果对象的结构

                if (result.success) {
                    console.log(`信令服务已启动，端口: ${result.port}`);
                    setIsConnected(true);
                } else {
                    console.error('启动信令服务失败:', result.error);
                }
            } catch (error) {
                console.error('信令服务初始化详细错误:', error);
                if (error instanceof Error) {
                    console.error('错误堆栈:', error.stack);
                }
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
            console.log(`尝试连接到设备: ${deviceId}, 地址: ${address}, 端口: ${port || '默认'}`);
            const result = await window.electron.invoke('signaling:connectToDevice', deviceId, address, port);
            console.log(`连接结果:`, result);
            return result.success;
        } catch (error) {
            console.error('连接设备详细错误:', error);
            if (error instanceof Error) console.error('错误堆栈:', error.stack);
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