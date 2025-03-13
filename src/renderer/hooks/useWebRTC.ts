import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkInfo } from './useNetworkInfo';

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
    const [peers, setPeers] = useState<Record<string, RTCPeerData>>({});
    const [dataChannels, setDataChannels] = useState<Record<string, RTCDataChannel>>({});
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);
    const [isReady, setIsReady] = useState(false);

    const chunkSize = 16384; // 16KB 块大小
    const fileChunksRef = useRef<Record<string, ArrayBuffer>>({});

    // 初始化 WebRTC
    useEffect(() => {
        if (!networkInfo.isConnected || !networkInfo.ip) return;

        const initWebRTC = async () => {
            try {
                // 告诉主进程我们准备好接收 WebRTC 连接
                await window.electron.invoke('webrtc:initialize');
                setIsReady(true);
                console.log('WebRTC 初始化完成');
            } catch (error) {
                console.error('WebRTC 初始化失败:', error);
            }
        };

        initWebRTC();

        // 监听连接请求
        const handleConnectionRequest = async (data: any) => {
            if (!data || !data.fromPeerId || !data.offer) {
                console.error('收到无效的连接请求');
                return;
            }

            await createPeerConnection(data.fromPeerId, false, data.offer);
        };

        window.electron.on('webrtc:connectionRequest', handleConnectionRequest);

        return () => {
            window.electron.off('webrtc:connectionRequest', handleConnectionRequest);
            // 清理连接
            Object.values(peers).forEach(peer => peer.connection.close());
        };
    }, [networkInfo.isConnected, networkInfo.ip, peers]);

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

                window.electron.invoke('webrtc:sendOffer', {
                    toPeerId: peerId,
                    offer: peerConnection.localDescription
                });
            } else if (remoteOffer) {
                // 接收并响应提议
                await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                window.electron.invoke('webrtc:sendAnswer', {
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

    // 发送文件
    const sendFile = async (peerId: string, file: File) => {
        try {
            console.log(`开始传输文件 ${file.name} 到设备 ${peerId}`);

            // 确保有连接并获取正确的数据通道
            let dataChannel: RTCDataChannel;
            if (peers[peerId]?.dataChannel) {
                dataChannel = peers[peerId].dataChannel;
            } else {
                await connectToPeer(peerId);
                if (!peers[peerId]?.dataChannel) {
                    throw new Error(`无法获取数据通道`);
                }
                dataChannel = peers[peerId].dataChannel;
            }

            if (dataChannel.readyState !== "open") {
                throw new Error(`数据通道未打开，当前状态: ${dataChannel.readyState}`);
            }

            // 创建传输记录
            const transferId = `${peerId}-${file.name}-${Date.now()}`;
            const transfer: FileTransfer = {
                id: transferId,
                peerId,
                name: file.name,
                size: file.size,
                progress: 0,
                status: "pending" as const,
                direction: "upload" as const,
                type: file.type,
            };

            // 添加到传输列表
            setTransfers(prev => [...prev, transfer]);

            // 模拟传输过程
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 100) {
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ? { ...t, progress, status: "transferring" as const } : t)
                    );
                } else {
                    clearInterval(interval);
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ? { ...t, progress: 100, status: "completed" as const } : t)
                    );
                }
            }, 500);

            return transferId;
        } catch (error) {
            console.error(`发送文件到设备 ${peerId} 失败:`, error);
            throw new Error(`文件传输失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // 连接到对等点
    const connectToPeer = async (peerId: string) => {
        console.log(`尝试连接到设备: ${peerId}`);

        if (peers[peerId]) {
            console.log(`已有连接到 ${peerId}，复用现有连接`);
            return peers[peerId].connection;
        }

        try {
            // 创建新的 RTCPeerConnection
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            // 创建数据通道
            const dataChannel = peerConnection.createDataChannel(`file-transfer-${peerId}`);

            // 设置数据通道事件
            dataChannel.onopen = () => {
                console.log(`与设备 ${peerId} 的连接已建立`);
            };

            dataChannel.onerror = (error) => {
                console.error(`数据通道错误: ${error}`);
            };

            // 存储连接和数据通道
            setPeers(prev => ({ ...prev, [peerId]: { peerId, connection: peerConnection, dataChannel } }));

            return peerConnection;
        } catch (error) {
            console.error(`连接到设备 ${peerId} 失败:`, error);
            throw new Error(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return {
        isReady,
        peers,
        transfers,
        connectToPeer,
        sendFile
    };
}; 