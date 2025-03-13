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
                            status: 'pending',
                            direction: 'download',
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
                                ? { ...t, status: 'completed', progress: 100 }
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
                            ? { ...t, progress, status: 'transferring' }
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
            const peer = peers[peerId];
            if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
                throw new Error(`与设备 ${peerId} 的数据通道未打开`);
            }

            // 创建传输记录
            const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            setTransfers(prev => [
                ...prev,
                {
                    id: transferId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    progress: 0,
                    status: 'pending',
                    direction: 'upload',
                    peerId
                }
            ]);

            // 发送文件信息
            sendControlMessage(peerId, {
                type: 'file-info',
                name: file.name,
                size: file.size,
                fileType: file.type
            });

            // 等待接收方准备就绪
            const readyPromise = new Promise<void>((resolve) => {
                const handleMessage = (event: MessageEvent) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'file-ready' && message.transferId === transferId) {
                            peer.dataChannel?.removeEventListener('message', handleMessage);
                            resolve();
                        }
                    } catch (e) {
                        // 忽略非 JSON 消息
                    }
                };

                peer.dataChannel?.addEventListener('message', handleMessage);

                // 5秒超时
                setTimeout(() => {
                    peer.dataChannel?.removeEventListener('message', handleMessage);
                    resolve(); // 即使超时也继续发送
                }, 5000);
            });

            await readyPromise;

            // 读取并发送文件
            const buffer = await file.arrayBuffer();
            let offset = 0;
            let sentBytes = 0;

            setTransfers(prev =>
                prev.map(t =>
                    t.id === transferId
                        ? { ...t, status: 'transferring' }
                        : t
                )
            );

            while (offset < buffer.byteLength) {
                const chunkSize = Math.min(16384, buffer.byteLength - offset);
                const chunk = buffer.slice(offset, offset + chunkSize);

                // 添加传输ID前缀
                const transferIdBytes = new TextEncoder().encode(transferId);
                const dataToSend = new Uint8Array(1 + transferIdBytes.length + chunk.byteLength);
                dataToSend[0] = transferIdBytes.length;
                dataToSend.set(transferIdBytes, 1);
                dataToSend.set(new Uint8Array(chunk), 1 + transferIdBytes.length);

                peer.dataChannel.send(dataToSend);

                offset += chunkSize;
                sentBytes += chunkSize;

                // 更新进度
                const progress = Math.floor((sentBytes / file.size) * 100);
                setTransfers(prev =>
                    prev.map(t =>
                        t.id === transferId
                            ? { ...t, progress }
                            : t
                    )
                );

                // 添加小延迟以避免阻塞UI
                if (offset % (chunkSize * 10) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // 发送完成消息
            sendControlMessage(peerId, {
                type: 'file-complete',
                transferId,
                fileName: file.name,
                fileType: file.type
            });

            // 更新状态为完成
            setTransfers(prev =>
                prev.map(t =>
                    t.id === transferId
                        ? { ...t, status: 'completed', progress: 100 }
                        : t
                )
            );

            console.log(`文件 ${file.name} 发送完成`);
            return transferId;
        } catch (error) {
            console.error('发送文件失败:', error);
            throw error;
        }
    };

    // 连接到对等点
    const connectToPeer = async (peerId: string) => {
        if (peers[peerId]) {
            console.log(`已存在与设备 ${peerId} 的连接`);
            return peers[peerId];
        }

        return await createPeerConnection(peerId, true);
    };

    return {
        isReady,
        peers,
        transfers,
        connectToPeer,
        sendFile
    };
}; 