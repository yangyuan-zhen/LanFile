import { useState, useEffect, useCallback } from 'react';
import { useGlobalPeerJS } from '../contexts/PeerJSContext';

export const usePeerConnection = (deviceIp: string) => {
    const { connectToPeer, connections } = useGlobalPeerJS();
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [error, setError] = useState<string | null>(null);

    // 检查连接状态
    useEffect(() => {
        const checkConnection = () => {
            const conn = connections.get(deviceIp);
            if (conn?.open) {
                setConnectionState('connected');
            } else if (conn) {
                setConnectionState('connecting');
            } else {
                setConnectionState('disconnected');
            }
        };

        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, [connections, deviceIp]);

    // 连接函数
    const connect = useCallback(async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            await connectToPeer(deviceIp);
            setConnectionState('connected');
        } catch (err) {
            setConnectionState('error');
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        }
    }, [connectToPeer, deviceIp]);

    return {
        connectionState,
        error,
        connect,
        isConnected: connectionState === 'connected'
    };
}; 