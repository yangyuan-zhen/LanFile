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
    const connectToPeer = useCallback(async (peerId: string, peerIp?: string) => {
        try {
            console.log(`尝试建立与 ${peerId} 的 WebRTC 连接 (IP: ${peerIp || '未知'})`);

            // 检查是否已经连接
            if (peers[peerId] && dataChannels[peerId]) {
                if (dataChannels[peerId].readyState === 'open') {
                    console.log(`已经连接到设备 ${peerId}`);
                    return;
                } else {
                    console.log(`数据通道状态: ${dataChannels[peerId].readyState}，尝试重新连接`);
                    // 关闭现有连接，重新建立
                    closeConnectionToPeer(peerId);
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
                // 为局域网环境优化 - 使用 all 确保尝试所有连接类型
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 10
            });

            // 记录所有ICE连接状态变化
            peerConnection.oniceconnectionstatechange = () => {
                console.log(`ICE 连接状态变化: ${peerConnection.iceConnectionState} (peer: ${peerId})`);

                // 特别处理失败状态
                if (peerConnection.iceConnectionState === 'failed') {
                    console.error(`ICE 连接失败 (peer: ${peerId})`);
                    // 尝试重启 ICE - 这可能有助于解决某些连接问题
                    if (peerConnection.restartIce) {
                        console.log(`尝试重启 ICE 连接 (peer: ${peerId})`);
                        peerConnection.restartIce();
                    }
                }
            };

            // 增加连接超时保护
            const connectionTimeoutId = setTimeout(() => {
                if (!dataChannels[peerId] || dataChannels[peerId].readyState !== 'open') {
                    console.error(`连接到 ${peerId} 超时`);
                    closeConnectionToPeer(peerId);
                    throw new Error(`连接超时 - 检查网络环境和防火墙设置`);
                }
            }, 20000); // 20秒超时

            // 添加数据通道开启处理
            const setupDataChannelWithTimeout = (dataChannel: RTCDataChannel) => {
                return new Promise((resolve, reject) => {
                    let isDone = false;

                    // 设置通道监听器
                    dataChannel.onopen = () => {
                        console.log(`数据通道已打开 (peer: ${peerId})`);
                        clearTimeout(connectionTimeoutId);
                        isDone = true;
                        resolve(true);
                    };

                    dataChannel.onerror = (error) => {
                        console.error(`数据通道错误 (peer: ${peerId}):`, error);
                        if (!isDone) {
                            isDone = true;
                            // 使用错误事件中的错误描述或提供默认消息
                            const errorMessage = error.error?.message || '未知错误';
                            reject(new Error(`数据通道错误: ${errorMessage}`));
                        }
                    };

                    dataChannel.onclose = () => {
                        console.log(`数据通道已关闭 (peer: ${peerId})`);
                    };
                });
            };

            // 使用局域网优化的数据通道选项
            const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                ordered: true,
                maxRetransmits: 30
            });

            // 保存连接信息
            peers[peerId] = {
                peerId,
                connection: peerConnection
            };
            dataChannels[peerId] = dataChannel;

            // 设置数据通道
            const dataChannelPromise = setupDataChannelWithTimeout(dataChannel);

            // 创建和发送 offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // 通过信令发送 offer
            await window.electron.invoke('webrtc:sendOffer', {
                toPeerId: peerId,
                offer: peerConnection.localDescription
            });

            // 等待数据通道连接
            await dataChannelPromise;
            console.log(`已成功建立与 ${peerId} 的 WebRTC 连接`);

        } catch (error) {
            console.error(`建立连接失败:`, error);
            closeConnectionToPeer(peerId);
            throw new Error('无法建立数据通道连接');
        }
    }, [peers, dataChannels]);

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

    // 添加在 useWebRTC 钩子内，其他函数旁边
    const closeConnectionToPeer = (peerId: string) => {
        console.log(`关闭与 ${peerId} 的连接`);

        // 关闭数据通道
        if (dataChannels[peerId]) {
            dataChannels[peerId].close();
        }

        // 关闭对等连接
        if (peers[peerId]) {
            peers[peerId].connection.close();
        }

        // 从状态中移除
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

    return {
        isReady,
        peers,
        transfers,
        connectToPeer,
        sendFile
    };
}; 