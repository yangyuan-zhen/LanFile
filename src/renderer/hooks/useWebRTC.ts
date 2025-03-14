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

    // 发送文件的真实实现
    const sendFile = async (peerId: string, file: File) => {
        try {
            console.log(`开始传输文件 ${file.name} 到设备 ${peerId}`);

            // 确保有连接
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

            // 告知对方准备接收文件
            sendControlMessage(peerId, {
                type: 'file-info',
                name: file.name,
                size: file.size,
                fileType: file.type,
                transferId
            });

            // 将文件分块发送
            const chunkSize = 16384; // 16KB
            const reader = new FileReader();
            let offset = 0;

            reader.onload = async (e) => {
                if (!e.target?.result) return;

                const data = e.target.result;
                try {
                    // 添加文件ID到数据前面
                    const idBytes = new TextEncoder().encode(transferId);
                    const chunk = new Uint8Array(1 + idBytes.length + (data as ArrayBuffer).byteLength);
                    chunk[0] = idBytes.length;
                    chunk.set(idBytes, 1);
                    chunk.set(new Uint8Array(data as ArrayBuffer), idBytes.length + 1);

                    // 发送数据
                    dataChannel.send(chunk);

                    // 更新进度
                    offset += (data as ArrayBuffer).byteLength;
                    const progress = Math.min(100, Math.floor((offset / file.size) * 100));

                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, progress, status: "transferring" as const } : t)
                    );

                    // 继续读取下一块
                    if (offset < file.size) {
                        readNextChunk();
                    } else {
                        // 文件传输完成
                        sendControlMessage(peerId, {
                            type: 'file-complete',
                            transferId,
                            fileName: file.name,
                            fileType: file.type
                        });

                        setTransfers(prev =>
                            prev.map(t => t.id === transferId ?
                                { ...t, progress: 100, status: "completed" as const } : t)
                        );
                    }
                } catch (error) {
                    console.error(`发送文件块失败:`, error);
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, status: "error" as const } : t)
                    );
                }
            };

            reader.onerror = () => {
                console.error(`读取文件失败`);
                setTransfers(prev =>
                    prev.map(t => t.id === transferId ?
                        { ...t, status: "error" as const } : t)
                );
            };

            const readNextChunk = () => {
                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
            };

            // 开始读取第一块
            readNextChunk();

            return transferId;
        } catch (error) {
            console.error(`发送文件到设备 ${peerId} 失败:`, error);
            throw new Error(`文件传输失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // 连接到对等点
    const connectToPeer = async (peerId: string, options = {}) => {
        try {
            setConnectionState('connecting');

            // 添加连接超时处理
            const connectionTimeout = setTimeout(() => {
                if (connectionState === 'connecting') {
                    console.error('WebRTC连接超时');
                    setConnectionState('failed');
                    setConnectionError('连接超时，请重试');
                }
            }, 10000); // 10秒超时

            // 连接逻辑...

            // 成功连接后清除超时
            clearTimeout(connectionTimeout);

        } catch (error) {
            console.error('WebRTC连接失败:', error);
            setConnectionState('failed');
            setConnectionError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
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