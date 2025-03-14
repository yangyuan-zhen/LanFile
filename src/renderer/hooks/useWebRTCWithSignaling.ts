import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useDeviceInfo } from './useDeviceInfo';

export const useWebRTCWithSignaling = () => {
    const [peerConnections, setPeerConnections] = useState<Record<string, RTCPeerConnection>>({});
    const [dataChannels, setDataChannels] = useState<Record<string, RTCDataChannel>>({});
    const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connecting' | 'connected' | 'disconnected' | 'failed'>>({});

    const signalingService = useWebRTCSignaling();
    const deviceInfo = useDeviceInfo();

    // 缓存处理函数的引用
    const messageHandlerRef = useRef<(message: any) => void>();

    // 初始化信令消息处理
    useEffect(() => {
        // 处理所有信令消息
        const handleSignalingMessage = (message: any) => {
            if (!message || !message.type || !message.from) return;

            const { type, from: peerId, data } = message;

            console.log(`收到信令消息: ${type} 来自 ${peerId}`);

            switch (type) {
                case 'offer':
                    handleOffer(peerId, data);
                    break;
                case 'answer':
                    handleAnswer(peerId, data);
                    break;
                case 'ice-candidate':
                    handleICECandidate(peerId, data);
                    break;
                case 'disconnect':
                    handleDisconnect(peerId);
                    break;
            }
        };

        // 保存引用以便清理
        messageHandlerRef.current = handleSignalingMessage;

        // 设置监听器
        window.electron.signaling.onMessage(handleSignalingMessage);

        return () => {
            // 清理
            messageHandlerRef.current = undefined;
        };
    }, []);

    // 处理收到的 Offer
    const handleOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
        try {
            console.log(`处理来自 ${peerId} 的 Offer`);
            let peerConnection = peerConnections[peerId];

            if (!peerConnection) {
                peerConnection = createPeerConnection(peerId);
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // 发送应答
            signalingService.sendSignalingMessage(peerId, {
                type: 'answer',
                data: peerConnection.localDescription
            });

            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'connecting'
            }));
        } catch (error) {
            console.error(`处理Offer失败:`, error);
            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'failed'
            }));
        }
    };

    // 处理收到的 Answer
    const handleAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
        try {
            console.log(`处理来自 ${peerId} 的 Answer`);
            const peerConnection = peerConnections[peerId];

            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`已设置远程描述, 连接状态: ${peerConnection.connectionState}`);
            }
        } catch (error) {
            console.error(`处理Answer失败:`, error);
        }
    };

    // 处理 ICE 候选
    const handleICECandidate = async (peerId: string, candidate: RTCIceCandidateInit) => {
        try {
            console.log(`处理来自 ${peerId} 的 ICE 候选`);
            const peerConnection = peerConnections[peerId];

            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error(`处理ICE候选失败:`, error);
        }
    };

    // 处理断开连接
    const handleDisconnect = (peerId: string) => {
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();

            setPeerConnections(prev => {
                const newConnections = { ...prev };
                delete newConnections[peerId];
                return newConnections;
            });

            setDataChannels(prev => {
                const newChannels = { ...prev };
                delete newChannels[peerId];
                return newChannels;
            });

            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'disconnected'
            }));

            console.log(`与设备 ${peerId} 的连接已关闭`);
        }
    };

    // 创建 PeerConnection
    const createPeerConnection = (peerId: string) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // 设置 ICE 候选处理
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingService.sendSignalingMessage(peerId, {
                    type: 'ice-candidate',
                    data: event.candidate
                });
            }
        };

        // 连接状态变化
        peerConnection.onconnectionstatechange = () => {
            console.log(`PeerConnection状态变化: ${peerConnection.connectionState}`);

            switch (peerConnection.connectionState) {
                case 'connected':
                    setConnectionStatus(prev => ({
                        ...prev,
                        [peerId]: 'connected'
                    }));
                    break;
                case 'disconnected':
                case 'failed':
                case 'closed':
                    setConnectionStatus(prev => ({
                        ...prev,
                        [peerId]: peerConnection.connectionState === 'disconnected'
                            ? 'disconnected' : 'failed'
                    }));
                    break;
            }
        };

        // 数据通道事件
        peerConnection.ondatachannel = (event) => {
            setupDataChannel(event.channel, peerId);
        };

        // 更新状态
        setPeerConnections(prev => ({
            ...prev,
            [peerId]: peerConnection
        }));

        return peerConnection;
    };

    // 设置数据通道
    const setupDataChannel = (channel: RTCDataChannel, peerId: string) => {
        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
            console.log(`数据通道已打开: ${peerId}`);
            setDataChannels(prev => ({
                ...prev,
                [peerId]: channel
            }));
        };

        channel.onclose = () => {
            console.log(`数据通道已关闭: ${peerId}`);
            setDataChannels(prev => {
                const newChannels = { ...prev };
                delete newChannels[peerId];
                return newChannels;
            });
        };

        channel.onerror = (error) => {
            console.error(`数据通道错误:`, error);
        };

        channel.onmessage = (event) => {
            // 处理接收到的消息
            console.log(`收到数据通道消息, 长度: ${typeof event.data === 'string' ? event.data.length : '二进制数据'}`);
            // 在这里处理文件传输数据
            // 实际实现时需要根据协议解析消息
        };

        return channel;
    };

    // 发起连接到远程节点
    const connectToPeer = async (peerId: string, address: string, port?: number) => {
        try {
            console.log(`尝试连接到设备 ${peerId}...`);

            // 先尝试通过信令服务连接
            const connected = await signalingService.connectToDevice(peerId, address, port);

            if (!connected) {
                throw new Error('信令连接失败');
            }

            // 创建并获取 PeerConnection
            const peerConnection = createPeerConnection(peerId);

            // 创建数据通道
            const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                ordered: true
            });

            setupDataChannel(dataChannel, peerId);

            // 创建并发送提议
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // 通过信令发送提议
            signalingService.sendSignalingMessage(peerId, {
                type: 'offer',
                data: peerConnection.localDescription
            });

            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'connecting'
            }));

            // 等待连接建立
            return new Promise<RTCDataChannel>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('连接超时'));
                }, 10000);

                const checkConnected = () => {
                    if (peerConnection.connectionState === 'connected' && dataChannel.readyState === 'open') {
                        clearTimeout(timeout);
                        setConnectionStatus(prev => ({
                            ...prev,
                            [peerId]: 'connected'
                        }));
                        resolve(dataChannel);
                    } else if (peerConnection.connectionState === 'failed' ||
                        peerConnection.connectionState === 'closed' ||
                        dataChannel.readyState === 'closed') {
                        clearTimeout(timeout);
                        setConnectionStatus(prev => ({
                            ...prev,
                            [peerId]: 'failed'
                        }));
                        reject(new Error('连接失败'));
                    } else {
                        setTimeout(checkConnected, 500);
                    }
                };

                checkConnected();
            });
        } catch (error) {
            console.error('连接到对等节点失败:', error);
            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'failed'
            }));
            throw error;
        }
    };

    // 断开与对等节点的连接
    const disconnectFromPeer = (peerId: string) => {
        if (peerConnections[peerId]) {
            // 发送断开连接消息
            signalingService.sendSignalingMessage(peerId, {
                type: 'disconnect'
            });

            // 关闭 WebRTC 连接
            peerConnections[peerId].close();

            // 从信令服务断开
            signalingService.disconnectFromDevice(peerId);

            // 更新状态
            setPeerConnections(prev => {
                const newConnections = { ...prev };
                delete newConnections[peerId];
                return newConnections;
            });

            setDataChannels(prev => {
                const newChannels = { ...prev };
                delete newChannels[peerId];
                return newChannels;
            });

            setConnectionStatus(prev => ({
                ...prev,
                [peerId]: 'disconnected'
            }));
        }
    };

    return {
        // 连接状态
        connectionStatus,
        connectedDevices: signalingService.connectedDevices,
        dataChannels,

        // 连接方法
        connectToPeer,
        disconnectFromPeer,

        // 信令状态
        isSignalingConnected: signalingService.isConnected
    };
}; 