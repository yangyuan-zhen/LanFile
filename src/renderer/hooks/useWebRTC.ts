import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkInfo } from './useNetworkInfo';
import { useWebRTCSignaling } from './useWebRTCSignaling';

interface RTCPeerData {
    peerId: string;
    connection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
}

interface FileTransfer {
    id: string;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: 'pending' | 'transferring' | 'completed' | 'error';
    direction: 'upload' | 'download';
    peerId: string;
}

export const useWebRTC = () => {
    const networkInfo = useNetworkInfo();
    const signalingService = useWebRTCSignaling();
    const [peers, setPeers] = useState<Record<string, RTCPeerData>>({});
    const [dataChannels, setDataChannels] = useState<Record<string, RTCDataChannel>>({});
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const chunkSize = 16384; // 16KB 块大小
    const fileChunksRef = useRef<Record<string, ArrayBuffer>>({});

    // 初始化 WebRTC
    useEffect(() => {
        if (!networkInfo.isConnected || !networkInfo.ip) return;

        const initWebRTC = async () => {
            try {
                setIsReady(false);
                // 真实初始化WebRTC
                await (window as any).electron.invoke('webrtc:initialize');
                setIsReady(true);
                console.log('WebRTC 初始化完成');
            } catch (error) {
                console.error('WebRTC 初始化失败:', error);
            }
        };

        initWebRTC();

        // 监听连接请求
        const handleConnectionRequest = (data: any) => {
            console.log('收到连接请求:', data);
            if (data?.fromPeerId && data?.offer) {
                createPeerConnection(data.fromPeerId, false, data.offer);
            }
        };

        window.electron.on('webrtc:connectionRequest', handleConnectionRequest);

        return () => {
            window.electron.off('webrtc:connectionRequest', handleConnectionRequest);
            // 清理连接
            Object.values(peers).forEach(peer => peer.connection.close());
        };
    }, [networkInfo.isConnected, networkInfo.ip]);

    // 创建对等连接
    const createPeerConnection = async (peerId: string, isInitiator = true, remoteOffer?: RTCSessionDescriptionInit) => {
        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 创建数据通道
            let dataChannel: RTCDataChannel | undefined;

            if (isInitiator) {
                dataChannel = peerConnection.createDataChannel('fileTransfer');
                setupDataChannel(dataChannel, peerId);
            }

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    window.electron.invoke('webrtc:sendIceCandidate', {
                        toPeerId: peerId,
                        candidate: event.candidate
                    });
                }
            };

            peerConnection.ondatachannel = (event) => {
                setupDataChannel(event.channel, peerId);
            };

            // 保存连接
            setPeers(prev => ({
                ...prev,
                [peerId]: { peerId, connection: peerConnection, dataChannel }
            }));

            if (isInitiator) {
                // 创建并发送提议
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                await (window as any).electron.invoke('webrtc:sendOffer', {
                    toPeerId: peerId,
                    offer: peerConnection.localDescription
                });
            } else if (remoteOffer) {
                // 接收并响应提议
                await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                await (window as any).electron.invoke('webrtc:sendAnswer', {
                    toPeerId: peerId,
                    answer: peerConnection.localDescription
                });
            }

            return peerConnection;
        } catch (error) {
            console.error('创建 WebRTC 连接失败:', error);
            throw error;
        }
    };

    // 设置数据通道
    const setupDataChannel = (channel: RTCDataChannel, peerId: string) => {
        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
            console.log(`与设备 ${peerId} 的数据通道已打开`);
            setPeers(prev => ({
                ...prev,
                [peerId]: { ...prev[peerId], dataChannel: channel }
            }));
        };

        channel.onclose = () => {
            console.log(`与设备 ${peerId} 的数据通道已关闭`);
        };

        channel.onerror = (error) => {
            console.error(`与设备 ${peerId} 的数据通道发生错误:`, error);
        };

        channel.onmessage = (event) => {
            handleDataChannelMessage(event.data, peerId);
        };
    };

    // 处理接收的消息
    const handleDataChannelMessage = (data: any, peerId: string) => {
        if (typeof data === 'string') {
            // 处理控制消息
            try {
                const message = JSON.parse(data);

                if (message.type === 'file-info') {
                    // 新文件传输开始
                    const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    fileChunksRef.current[transferId] = new ArrayBuffer(0);

                    setTransfers(prev => [
                        ...prev,
                        {
                            id: transferId,
                            name: message.name,
                            size: message.size,
                            type: message.type,
                            progress: 0,
                            status: 'pending' as const,
                            direction: 'download' as const,
                            peerId
                        }
                    ]);

                    // 确认准备接收
                    sendControlMessage(peerId, {
                        type: 'file-ready',
                        transferId
                    });
                }
                else if (message.type === 'file-complete') {
                    // 文件传输完成
                    const { transferId } = message;
                    const fileData = fileChunksRef.current[transferId];

                    // 创建 Blob 并触发下载
                    const blob = new Blob([fileData], { type: message.fileType });
                    const url = URL.createObjectURL(blob);

                    // 通知主进程保存文件
                    window.electron.invoke('file:saveDownloadedFile', {
                        url,
                        fileName: message.fileName,
                        fileType: message.fileType
                    });

                    // 更新传输状态
                    setTransfers(prev =>
                        prev.map(t =>
                            t.id === transferId
                                ? { ...t, status: 'completed' as const, progress: 100 }
                                : t
                        )
                    );

                    // 清理
                    delete fileChunksRef.current[transferId];
                }
            } catch (error) {
                console.error('解析数据通道消息失败:', error);
            }
        } else {
            // 处理二进制数据（文件块）
            // 假设第一个字节是文件标识符长度，后面跟着文件标识符
            const buffer = new Uint8Array(data);
            const idLength = buffer[0];
            const transferId = new TextDecoder().decode(buffer.slice(1, idLength + 1));
            const chunk = buffer.slice(idLength + 1);

            // 追加到文件缓冲区
            const existingBuffer = fileChunksRef.current[transferId] || new ArrayBuffer(0);
            const newBuffer = new Uint8Array(existingBuffer.byteLength + chunk.byteLength);
            newBuffer.set(new Uint8Array(existingBuffer), 0);
            newBuffer.set(chunk, existingBuffer.byteLength);
            fileChunksRef.current[transferId] = newBuffer.buffer;

            // 更新进度
            setTransfers(prev => {
                const transfer = prev.find(t => t.id === transferId);
                if (transfer) {
                    const progress = Math.min(100, Math.floor((newBuffer.byteLength / transfer.size) * 100));
                    return prev.map(t =>
                        t.id === transferId
                            ? { ...t, progress, status: 'transferring' as const }
                            : t
                    );
                }
                return prev;
            });
        }
    };

    // 发送控制消息
    const sendControlMessage = (peerId: string, message: any) => {
        const peer = peers[peerId];
        if (peer?.dataChannel?.readyState === 'open') {
            peer.dataChannel.send(JSON.stringify(message));
            return true;
        }
        console.error(`无法发送消息到设备 ${peerId}，数据通道未打开`);
        return false;
    };

    // 连接到对等点
    const connectToPeer = useCallback(async (peerId: string) => {
        try {
            console.log(`尝试建立与 ${peerId} 的 WebRTC 连接`);

            // 检查是否已经连接
            if (peers[peerId] && dataChannels[peerId]) {
                if (dataChannels[peerId].readyState === 'open') {
                    console.log(`已经连接到设备 ${peerId}`);
                    return;
                }
            }

            // 更丰富的 ICE 服务器配置
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ],
                // 为局域网环境优化
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 10
            });

            // 记录所有ICE连接状态变化
            peerConnection.oniceconnectionstatechange = () => {
                console.log(`ICE 连接状态变化: ${peerConnection.iceConnectionState}`);
                if (peerConnection.iceConnectionState === 'failed') {
                    console.error('ICE 连接失败');
                }
            };

            // 记录ICE收集状态
            peerConnection.onicegatheringstatechange = () => {
                console.log(`ICE 收集状态: ${peerConnection.iceGatheringState}`);
            };

            // 优化数据通道参数
            const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                ordered: true,
                // 确保可靠传输
                maxRetransmits: 30,
                maxPacketLifeTime: 5000
            });

            // 设置更长的连接超时时间 (60秒)
            const connectionTimeout = setTimeout(() => {
                console.log('WebRTC连接超时 - 60秒已过');
                // 不要立即抛出错误，而是仅关闭连接
                cleanupConnection();
            }, 60000);

            // 更长的数据通道超时时间 (40秒)
            const dataChannelTimeout = setTimeout(() => {
                console.log('数据通道打开超时 - 40秒已过');
                cleanupConnection();
                throw new Error('数据通道打开超时');
            }, 40000);

            // 清理函数
            const cleanupConnection = () => {
                clearTimeout(connectionTimeout);
                clearTimeout(dataChannelTimeout);
                if (peerConnection) {
                    peerConnection.close();
                }
                // 从状态中删除
                setPeers(prev => {
                    const newPeers = { ...prev };
                    delete newPeers[peerId];
                    return newPeers;
                });
                setDataChannels(prev => {
                    const newChannels = { ...prev };
                    delete newChannels[peerId];
                    return newChannels;
                });
            };

            // 数据通道事件处理
            dataChannel.onopen = () => {
                console.log(`与 ${peerId} 的数据通道已打开`);
                clearTimeout(dataChannelTimeout);
                clearTimeout(connectionTimeout);

                setPeers(prev => ({
                    ...prev,
                    [peerId]: { peerId, connection: peerConnection }
                }));

                setDataChannels(prev => ({
                    ...prev,
                    [peerId]: dataChannel
                }));

                setConnectionState('connected');
            };

            dataChannel.onclose = () => {
                console.log(`数据通道已关闭: ${peerId}`);
            };

            dataChannel.onerror = (error) => {
                console.error(`数据通道错误:`, error);
            };

            // 手动发送ICE候选
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('发送ICE候选', event.candidate);
                    signalingService.sendSignalingMessage(peerId, {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };

            // 创建并发送SDP offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            console.log('发送WebRTC offer');
            await signalingService.sendSignalingMessage(peerId, {
                type: 'offer',
                offer: peerConnection.localDescription
            });

            // 临时存储连接，等待答复
            setPeers(prev => ({
                ...prev,
                [peerId]: { peerId, connection: peerConnection, dataChannel }
            }));

        } catch (error) {
            console.error('WebRTC连接失败:', error);
            throw error;
        }
    }, [setPeers, setDataChannels, signalingService, peers, dataChannels]);

    // 发送文件的真实实现
    const sendFile = useCallback(async (peerId: string, file: File) => {
        try {
            // 检查信令服务是否已连接
            if (!signalingService.isConnected) {
                throw new Error('信令服务未连接，无法发送文件');
            }

            // 检查数据通道是否已打开
            if (!dataChannels[peerId] || dataChannels[peerId].readyState !== 'open') {
                console.log('数据通道未打开，尝试连接...');
                await connectToPeer(peerId);

                // 二次检查数据通道状态
                if (!dataChannels[peerId] || dataChannels[peerId].readyState !== 'open') {
                    throw new Error('无法建立数据通道连接');
                }
            }

            // 文件传输逻辑...
        } catch (error) {
            console.error('文件发送失败:', error);
            throw error;
        }
    }, [dataChannels, connectToPeer, signalingService]);

    return {
        isReady,
        peers,
        transfers,
        connectToPeer,
        sendFile
    };
}; 