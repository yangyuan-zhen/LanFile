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

    // 连接到对等点
    const connectToPeer = async (peerId: string, options = {}): Promise<RTCDataChannel> => {
        try {
            setConnectionState('connecting');
            console.log(`开始连接到设备 ${peerId}...`);

            // 添加连接超时处理
            const connectionTimeout = setTimeout(() => {
                if (connectionState === 'connecting') {
                    console.error('WebRTC连接超时');
                    setConnectionState('failed');
                    setConnectionError('连接超时，请重试');
                    throw new Error('连接超时');
                }
            }, 10000); // 10秒超时

            // 创建连接并等待完成
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 创建数据通道
            const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                ordered: true
            });

            // 等待数据通道打开
            await new Promise<void>((resolve, reject) => {
                const channelTimeout = setTimeout(() => {
                    reject(new Error('数据通道打开超时'));
                }, 5000);

                dataChannel.onopen = () => {
                    clearTimeout(channelTimeout);
                    console.log(`数据通道已成功打开: ${peerId}`);
                    resolve();
                };

                dataChannel.onerror = (err) => {
                    clearTimeout(channelTimeout);
                    reject(new Error(`数据通道错误: ${err}`));
                };
            });

            // 其他连接逻辑...
            setupDataChannel(dataChannel, peerId);

            // 更新状态
            setPeers(prev => ({
                ...prev,
                [peerId]: { peerId, connection: peerConnection, dataChannel }
            }));

            // 存储数据通道
            setDataChannels(prev => ({
                ...prev,
                [peerId]: dataChannel
            }));

            // 清除超时
            clearTimeout(connectionTimeout);
            setConnectionState('connected');

            return dataChannel;
        } catch (error) {
            console.error('WebRTC连接失败:', error);
            setConnectionState('failed');
            setConnectionError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    };

    // 发送文件的真实实现
    const sendFile = async (peerId: string, file: File) => {
        try {
            console.log(`开始传输文件 ${file.name} 到设备 ${peerId}`);

            // 确保有连接和数据通道
            let dataChannel: RTCDataChannel | null = null;

            // 首先检查现有数据通道
            if (dataChannels[peerId]) {
                console.log(`找到现有数据通道: ${peerId}`);
                dataChannel = dataChannels[peerId];
            } else if (peers[peerId]?.dataChannel) {
                console.log(`从peers中找到数据通道: ${peerId}`);
                dataChannel = peers[peerId].dataChannel;
            } else {
                // 如果没有数据通道，创建新连接
                console.log(`未找到数据通道，创建新连接: ${peerId}`);
                try {
                    dataChannel = await connectToPeer(peerId);
                } catch (connError) {
                    console.error(`创建连接失败: ${connError}`);
                    throw new Error(`无法建立连接: ${connError instanceof Error ? connError.message : String(connError)}`);
                }
            }

            if (!dataChannel) {
                throw new Error(`无法获取数据通道，连接可能已断开`);
            }

            if (dataChannel.readyState !== "open") {
                throw new Error(`数据通道未打开，当前状态: ${dataChannel.readyState}`);
            }

            // 获取设置中的分块大小
            const settings = await window.electron.invoke("settings:get");
            const chunkSize = settings?.chunkSize || 16384; // 默认值

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
            let offset = 0;
            const fileId = `file-${Date.now()}`;
            const reader = new FileReader();

            // 通知开始传输
            dataChannel.send(JSON.stringify({
                type: 'file-start',
                id: fileId,
                name: file.name,
                size: file.size,
                mimeType: file.type
            }));

            const readNextChunk = () => {
                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
            };

            reader.onload = (e) => {
                if (!e.target?.result) return;

                const chunk = e.target.result as ArrayBuffer;
                // 添加文件ID标头
                const idBytes = new TextEncoder().encode(fileId);
                const data = new Uint8Array(1 + idBytes.length + chunk.byteLength);
                data[0] = idBytes.length;
                data.set(idBytes, 1);
                data.set(new Uint8Array(chunk), 1 + idBytes.length);

                // 发送数据
                dataChannel.send(data);

                // 更新进度
                offset += chunk.byteLength;
                const progress = Math.min(100, Math.floor((offset / file.size) * 100));

                // 发送进度更新
                if (progress % 5 === 0) {
                    dataChannel.send(JSON.stringify({
                        type: 'progress',
                        id: fileId,
                        progress: progress
                    }));
                }

                // 检查是否完成
                if (offset < file.size) {
                    readNextChunk();
                } else {
                    // 发送传输完成信号
                    dataChannel.send(JSON.stringify({
                        type: 'file-complete',
                        id: fileId
                    }));
                }
            };

            // 开始传输
            readNextChunk();

            return transferId;
        } catch (error) {
            console.error(`发送文件到设备 ${peerId} 失败:`, error);
            throw new Error(`文件传输失败: ${error instanceof Error ? error.message : String(error)}`);
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