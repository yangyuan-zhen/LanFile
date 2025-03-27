import { useState, useEffect, useCallback, useRef } from 'react';
import Peer from 'peerjs';
import { useSettings } from './useSettings';

export interface FileTransfer {
    id: string;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: 'pending' | 'transferring' | 'completed' | 'error';
    direction: 'upload' | 'download';
    peerId: string;
    savedPath?: string;
    speed?: number;
}

export const usePeerJS = () => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [connections, setConnections] = useState<Map<string, any>>(new Map());
    const [isReady, setIsReady] = useState(false);
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [deviceId, setDeviceId] = useState<string>('');
    const isConnecting = useRef<boolean>(false);

    // 提升到全局，而不是每个连接单独维护
    const fileChunks = useRef<Record<string, Uint8Array[]>>({});
    const fileInfo = useRef<Record<string, any>>({});

    // 添加速度计算
    const transferTimes = useRef<Record<string, { lastTime: number; lastBytes: number }>>({});

    const { chunkSize } = useSettings();

    // 初始化PeerJS
    useEffect(() => {
        const initPeer = async () => {
            try {
                setStatus('connecting');

                // 获取设备信息
                const deviceInfo = await window.electron.invoke('device:getInfo');

                // 生成规范的 PeerJS ID
                // 1. 清理 ID 中的非法字符
                const cleanId = deviceInfo.id.replace(/[^a-zA-Z0-9]/g, '');
                // 2. 添加随机后缀
                const randomSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
                // 3. 组合成有效的 ID
                const peerId = `lanfile${cleanId.substring(0, 8)}${randomSuffix}`;

                console.log("生成的 PeerJS ID:", peerId);
                setDeviceId(peerId);

                // 创建 Peer 实例
                const peer = new Peer(deviceId, {
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' }
                        ]
                    },
                    debug: 2
                });

                // 当PeerJS连接成功后，启动发现服务
                peer.on('open', async (id) => {
                    console.log(`PeerJS已连接，ID: ${id}`);
                    // 启动ID发现服务
                    await window.electron.invoke('peer:startDiscovery', id);
                    setIsReady(true);
                    setStatus('idle');
                });

                peer.on('connection', (conn) => {
                    handleIncomingConnection(conn);
                });

                peer.on('error', (err) => {
                    console.error('PeerJS错误:', err);
                    setError(`PeerJS错误: ${err.message}`);
                    setStatus('error');
                });

                setPeer(peer);
            } catch (error) {
                console.error('PeerJS初始化失败:', error);
                setError(`初始化失败: ${error instanceof Error ? error.message : String(error)}`);
                setStatus('error');
            }
        };

        initPeer();

        return () => {
            if (peer) {
                console.log('关闭PeerJS连接');
                peer.destroy();
            }
        };
    }, []);

    // 处理传入连接
    const handleIncomingConnection = useCallback((conn: any) => {
        console.log(`收到来自 ${conn.peer} 的连接`);

        conn.on('open', () => {
            console.log(`与 ${conn.peer} 的连接已打开`);
            setConnections(prev => {
                const newConnections = new Map(prev);
                newConnections.set(conn.peer, conn);
                return newConnections;
            });
        });

        conn.on('data', async (data: any) => {
            // 对于文件信息，立即发送确认
            if (data.type === 'file-info') {
                console.log('收到文件信息:', data.transferId);

                // 存储到全局引用中
                fileInfo.current[data.transferId] = data;
                fileChunks.current[data.transferId] = [];

                // 创建新的传输记录
                const transfer: FileTransfer = {
                    id: data.transferId,
                    name: data.name,
                    size: data.size,
                    type: data.fileType,
                    progress: 0,
                    status: 'pending',
                    direction: 'download',
                    peerId: conn.peer
                };

                setTransfers(prev => [...prev, transfer]);

                // 确认文件信息接收 - 确保这一步不会被跳过
                try {
                    console.log(`发送文件信息确认: ${data.transferId}`);
                    conn.send({ type: 'file-info-received', transferId: data.transferId });
                } catch (error) {
                    console.error('发送确认失败:', error);
                }
            }
            else if (data.type === 'file-chunk') {
                const transferId = data.transferId;
                // 更详细的日志
                console.log(`收到文件块 ${transferId}, 块大小:`, data.data.byteLength);

                // 检查引用中是否存在
                if (!fileInfo.current[transferId]) {
                    console.error('收到未知传输ID的文件块:', transferId);
                    // 请求重新发送文件信息
                    conn.send({ type: 'request-file-info', transferId });
                    return;
                }

                // 存储到全局引用
                const chunk = new Uint8Array(data.data);
                fileChunks.current[transferId].push(chunk);

                // 计算已接收的总大小
                const receivedSize = fileChunks.current[transferId].reduce(
                    (total, chunk) => total + chunk.byteLength, 0
                );

                // 计算进度并更新
                const progress = Math.min(100, Math.floor((receivedSize / fileInfo.current[transferId].size) * 100));

                // 更新传输进度
                updateTransferProgress(transferId, receivedSize);
            }
            else if (data.type === 'file-complete') {
                const transferId = data.transferId;
                console.log(`收到文件完成消息: ${transferId}`);

                // 检查引用中是否存在
                if (!fileInfo.current[transferId] || !fileChunks.current[transferId]) {
                    console.error('收到未知传输ID的完成消息:', transferId);
                    return;
                }

                // 使用全局引用
                const totalLength = fileChunks.current[transferId].reduce(
                    (total, chunk) => total + chunk.byteLength, 0
                );

                console.log(`准备合并文件: ${transferId}, 总大小: ${totalLength} 字节`);

                const completeFile = new Uint8Array(totalLength);
                let offset = 0;

                for (const chunk of fileChunks.current[transferId]) {
                    completeFile.set(chunk, offset);
                    offset += chunk.byteLength;
                }

                // 创建 Blob
                const blob = new Blob([completeFile], { type: fileInfo.current[transferId].type });

                // 将 Blob 转换为 ArrayBuffer 再传递
                const arrayBuffer = await blob.arrayBuffer();

                // 修改这里：使用 ArrayBuffer 而不是 Blob
                window.electron.invoke('file:saveToDownloads', {
                    fileName: fileInfo.current[transferId].name,
                    fileData: arrayBuffer  // 传递 ArrayBuffer 而不是 Blob
                }).then((savedPath: string) => {
                    console.log('文件已自动保存到:', savedPath);

                    // 更新传输状态为完成
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, progress: 100, status: 'completed' as const, savedPath } : t)
                    );

                    // 触发文件清理事件
                    window.dispatchEvent(new CustomEvent('file-transfer-complete'));
                }).catch((error: any) => {
                    console.error('文件保存失败:', error);
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, status: 'error' as const } : t)
                    );
                });

                // 清理全局引用中的数据
                delete fileChunks.current[transferId];
                delete fileInfo.current[transferId];
            }
            // 添加请求文件信息的处理
            else if (data.type === 'request-file-info') {
                // 如果是发送方，重新发送文件信息
                const transfer = transfers.find(t => t.id === data.transferId);
                if (transfer && transfer.direction === 'upload') {
                    // 重新发送文件信息
                    conn.send(fileInfo.current[data.transferId]);
                }
            }
        });

        conn.on('close', () => {
            console.log(`与 ${conn.peer} 的连接已关闭`);
            setConnections(prev => {
                const newConnections = new Map(prev);
                newConnections.delete(conn.peer);
                return newConnections;
            });
        });

        conn.on('error', (err: Error) => {
            console.error(`与 ${conn.peer} 的连接错误:`, err);
        });
    }, []);

    // 连接到对等设备
    const connectToPeer = useCallback(async (peerIp: string) => {
        if (isConnecting.current || !peer || !isReady) {
            console.log('连接尚未就绪或已有连接请求进行中');
            return null;
        }

        isConnecting.current = true;
        setStatus('connecting');

        try {
            console.log(`尝试连接到 ${peerIp}`);

            // 从目标设备获取实际的PeerJS ID
            const peerResult = await window.electron.invoke('peer:getRemotePeerId', peerIp);
            if (!peerResult.success || !peerResult.peerId) {
                throw new Error(`无法获取设备 ${peerIp} 的PeerJS ID: ${peerResult.error || '未知错误'}`);
            }

            const remotePeerId = peerResult.peerId;
            console.log(`获取到远程设备的PeerJS ID: ${remotePeerId}`);

            // 创建到远程Peer的连接
            const conn = peer.connect(remotePeerId, {
                reliable: true,
                serialization: 'binary'
            });

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.log('连接超时');
                    conn.close();
                    isConnecting.current = false;
                    setStatus('error');
                    setError(`连接到 ${peerIp} 超时`);
                    reject(new Error('连接超时'));
                }, 10000);

                conn.on('open', () => {
                    console.log(`成功连接到 ${remotePeerId}`);
                    clearTimeout(timeout);
                    const newConnections = new Map(connections);
                    newConnections.set(remotePeerId, conn);
                    setConnections(newConnections);
                    isConnecting.current = false;
                    setStatus('connected');
                    resolve(conn);
                });

                conn.on('error', (err) => {
                    console.error(`连接失败:`, err);
                    clearTimeout(timeout);
                    isConnecting.current = false;
                    setStatus('error');
                    setError(`连接失败: ${err.message}`);
                    reject(err);
                });
            });
        } catch (error) {
            console.error('连接失败:', error);
            isConnecting.current = false;
            setStatus('error');
            setError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }, [peer, isReady, connections]);

    // 发送文件方法
    const sendFile = useCallback(async (peerIp: string, file: File) => {
        console.log(`尝试向 ${peerIp} 发送文件: ${file.name}`);

        if (!peer || !peer.open) {
            await connectToPeer(peerIp);
        }

        return new Promise<string>(async (resolve, reject) => {
            try {
                // 获取或等待建立连接
                let conn = connections.get(peerIp);

                if (!conn) {
                    console.log("连接不存在，正在重新连接...");
                    try {
                        conn = await connectToPeer(peerIp);
                        if (!conn) throw new Error("连接失败");
                    } catch (error) {
                        reject(error);
                        return;
                    }
                }

                // 确保连接已打开且数据通道可用
                if (!conn.open || !conn.dataChannel) {
                    console.log("连接未打开或数据通道不可用，等待重试...");
                    // 等待数据通道准备就绪
                    await new Promise<void>((resolveChannel, rejectChannel) => {
                        const channelTimeout = setTimeout(() => {
                            rejectChannel(new Error("数据通道准备超时"));
                        }, 5000);

                        // 定期检查数据通道状态
                        const checkChannel = setInterval(() => {
                            if (conn.dataChannel && conn.dataChannel.readyState === 'open') {
                                clearInterval(checkChannel);
                                clearTimeout(channelTimeout);
                                resolveChannel();
                            }
                        }, 500);

                        conn.on('error', (err: any) => {
                            clearInterval(checkChannel);
                            clearTimeout(channelTimeout);
                            rejectChannel(err);
                        });
                    });
                }

                // 生成传输ID
                const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

                // 创建传输记录
                const transfer: FileTransfer = {
                    id: transferId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    progress: 0,
                    status: 'pending',
                    direction: 'upload',
                    peerId: conn.peer
                };

                setTransfers(prev => [...prev, transfer]);

                // 发送文件信息并等待确认
                const fileInfoReceived = await sendFileInfo(conn, file, transferId);

                if (!fileInfoReceived) {
                    throw new Error('文件信息发送失败，对方未确认接收');
                }

                // 开始文件传输
                await sendFileChunks(conn, file, transferId);

                resolve(transferId);
            } catch (error) {
                console.error("发送文件准备阶段失败:", error);
                reject(error);
            }
        });
    }, [connections, connectToPeer]);

    // 新增函数：发送文件信息并等待确认
    const sendFileInfo = (conn: any, file: File, transferId: string): Promise<boolean> => {
        return new Promise((resolve) => {
            console.log(`发送文件信息: ${transferId}`);

            // 存储文件信息，用于重传
            const info = {
                type: 'file-info',
                transferId,
                name: file.name,
                size: file.size,
                fileType: file.type
            };

            fileInfo.current[transferId] = info;

            // 发送文件信息
            conn.send(info);

            // 等待确认
            const timeout = setTimeout(() => {
                console.log(`文件信息发送超时: ${transferId}`);
                removeListener();
                resolve(false); // 超时，未收到确认
            }, 10000);

            // 监听确认消息
            const handleData = (data: any) => {
                if (data.type === 'file-info-received' && data.transferId === transferId) {
                    console.log(`收到文件信息确认: ${transferId}`);
                    clearTimeout(timeout);
                    removeListener();
                    resolve(true);
                }
            };

            const removeListener = () => {
                // 移除监听器逻辑，根据 PeerJS 的实现可能需要调整
                conn.off('data', handleData);
            };

            conn.on('data', handleData);
        });
    };

    // 辅助函数：发送文件块
    const sendFileChunks = async (conn: any, file: File, transferId: string) => {
        const fileReader = new FileReader();
        let offset = 0;

        setTransfers(prev =>
            prev.map(t => t.id === transferId ? { ...t, status: 'transferring' as const } : t)
        );

        return new Promise<void>((resolve, reject) => {
            fileReader.onerror = () => {
                reject(new Error('文件读取错误'));
            };

            fileReader.onload = (e) => {
                if (!e.target?.result) return;
                conn.send({
                    type: 'file-chunk',
                    transferId,
                    data: e.target.result
                });

                // 更新进度
                let bytesRead = 0;
                if (e.target?.result instanceof ArrayBuffer) {
                    bytesRead = e.target.result.byteLength;
                } else {
                    bytesRead = chunkSize; // 使用设置中的分块大小
                }

                offset += bytesRead;

                // 使用 updateTransferProgress 替代直接的 setTransfers
                updateTransferProgress(transferId, offset);

                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    // 文件发送完成，发送完成消息
                    console.log(`文件传输完成，发送完成消息: ${transferId}`);
                    conn.send({
                        type: 'file-complete',
                        transferId
                    });

                    // 更新UI状态
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, progress: 100, status: 'completed' as const } : t)
                    );

                    // 触发文件清理事件
                    window.dispatchEvent(new CustomEvent('file-transfer-complete'));
                    resolve();
                }
            };

            const readSlice = (o: number) => {
                const slice = file.slice(o, o + chunkSize);
                fileReader.readAsArrayBuffer(slice);
            };

            // 开始读取
            readSlice(0);
        });
    };

    // 添加连接状态调试
    function createConnection(targetPeerId: string) {
        console.log(`创建到 ${targetPeerId} 的新连接`);
        if (!peer) {
            throw new Error('Peer 实例未初始化');
        }

        const conn = peer.connect(targetPeerId, {
            reliable: true,
            serialization: 'binary'
        });

        conn.on('open', () => {
            console.log(`连接到 ${targetPeerId} 已打开，数据通道状态:`,
                conn.dataChannel ? conn.dataChannel.readyState : '不存在');
        });

        conn.on('error', (err) => {
            console.error(`连接到 ${targetPeerId} 发生错误:`, err);
        });

        connections.set(targetPeerId, conn);
        return conn;
    }

    // 在更新传输进度的地方
    const updateTransferProgress = (transferId: string, bytesReceived: number) => {
        const now = Date.now();

        // 获取文件总大小并计算进度
        const fileSize = fileInfo.current[transferId]?.size || 0;
        const progress = Math.min(100, Math.floor((bytesReceived / fileSize) * 100));

        console.log(`更新传输进度: ${transferId}, 进度: ${progress}%, ${bytesReceived}/${fileSize} 字节`); // 添加日志
        console.log(`文件传输进度更新: ${transferId}, 进度: ${progress}%`);

        // 更新传输状态
        setTransfers(prev => {
            const updated = prev.map(t => t.id === transferId ?
                { ...t, progress, status: 'transferring' as const } : t);
            return updated;
        });
    };

    // 在文件传输完成时触发通知事件
    const handleTransferComplete = (transfer: FileTransfer) => {
        // 更新传输状态
        setTransfers(prev =>
            prev.map(t =>
                t.id === transfer.id
                    ? { ...t, progress: 100, status: 'completed' as const }
                    : t
            )
        );

        // 触发文件传输完成事件
        window.dispatchEvent(new CustomEvent('file-transfer-complete'));

        // 主动添加通知 (额外的通知触发方式)
        if (window.electron) {
            window.electron.invoke('notification:show', {
                title: '文件传输完成',
                body: `${transfer.name} 已${transfer.direction === 'upload' ? '上传' : '下载'}完成`
            });
        }
    };

    // 在文件中找到文件传输完成时的代码，添加以下事件触发
    const completeTransfer = (transferId: string, savedPath?: string) => {
        // 更新传输状态
        setTransfers(prev =>
            prev.map(t =>
                t.id === transferId
                    ? { ...t, progress: 100, status: 'completed' as const, savedPath }
                    : t
            )
        );

        // 触发事件通知文件传输完成
        window.dispatchEvent(new CustomEvent('file-transfer-complete'));

        console.log(`触发通知事件：file-transfer-complete，ID: ${transferId}`);
    }

    // 确保返回所有需要的属性和方法
    return {
        isReady,
        status,
        error,
        transfers,
        deviceId,
        connectToPeer,
        sendFile
    };
};