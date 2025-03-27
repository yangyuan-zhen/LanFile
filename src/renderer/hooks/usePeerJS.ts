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
    speed?: number;
    timeRemaining?: number;
    savedPath?: string;
}

const debug = (message: string, ...args: any[]) => {
    console.log(`[usePeerJS] ${message}`, ...args);
};

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

    // 修改 transferTimes 的类型定义
    const transferTimes = useRef<Record<string, {
        lastTime: number;
        lastBytes: number;
        startTime: number;
        totalBytes: number;
    }>>({});

    const { chunkSize } = useSettings();

    // 在 useEffect 中添加日志，监控 transfers 状态变化
    useEffect(() => {
        debug("Transfers state updated:", transfers);
    }, [transfers]);

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
            if (data.type === 'file-info') {
                debug("收到文件信息:", data);

                // 存储到全局引用中
                fileInfo.current[data.transferId] = data;
                fileChunks.current[data.transferId] = [];

                // 创建新的传输记录 - 只使用 addFileTransfer 添加一次
                const transferId = addFileTransfer({
                    name: data.name,
                    size: data.size,
                    type: data.fileType,
                    progress: 0,
                    status: 'pending',
                    direction: 'download',
                    peerId: conn.peer
                });

                // 重要！恢复发送确认代码 - 必须保留这部分
                try {
                    debug(`发送文件信息确认: ${data.transferId}`);
                    conn.send({ type: 'file-info-received', transferId: data.transferId });
                } catch (error) {
                    console.error('发送确认失败:', error);
                }
            }
            else if (data.type === 'file-chunk') {
                const transferId = data.transferId;

                // 添加数据有效性检查
                if (!data.data) {
                    console.error('收到无效的文件块数据:', { transferId });
                    return;
                }

                try {
                    // 确保 fileChunks 中有这个传输的数组
                    if (!fileChunks.current[transferId]) {
                        fileChunks.current[transferId] = [];
                    }

                    // 检查并记录块大小
                    const chunkSize = data.data instanceof ArrayBuffer
                        ? data.data.byteLength
                        : (data.chunk?.byteLength || 0);  // 兼容旧格式

                    console.log(`收到文件块 ${transferId}, 块大小:`, chunkSize);

                    // 存储到全局引用
                    const chunk = new Uint8Array(
                        data.data instanceof ArrayBuffer ? data.data : data.chunk
                    );

                    // 检查块是否有效
                    if (chunk.byteLength === 0) {
                        console.error('收到空的文件块');
                        return;
                    }

                    fileChunks.current[transferId].push(chunk);

                    // 计算已接收的总大小
                    const receivedSize = fileChunks.current[transferId].reduce(
                        (total, chunk) => total + (chunk?.byteLength || 0), 0
                    );

                    // 确保文件信息存在
                    if (!fileInfo.current[transferId]) {
                        console.error('找不到文件信息:', transferId);
                        // 请求重新发送文件信息
                        conn.send({ type: 'request-file-info', transferId });
                        return;
                    }

                    // 计算进度并更新
                    const progress = Math.min(100, Math.floor((receivedSize / fileInfo.current[transferId].size) * 100));

                    // 更新传输进度
                    updateTransferProgress(transferId, receivedSize, fileInfo.current[transferId].size);

                } catch (error) {
                    console.error('处理文件块时出错:', error);
                    // 通知发送方重试
                    conn.send({
                        type: 'chunk-error',
                        transferId,
                        error: error instanceof Error ? error.message : '未知错误'
                    });
                }
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

                // 创建传输记录
                const transferId = addFileTransfer({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    progress: 0,
                    status: 'pending',
                    direction: 'upload',
                    peerId: conn.peer
                });

                // 分块发送逻辑
                let offset = 0;
                let chunkIndex = 0;
                const totalChunks = Math.ceil(file.size / chunkSize);

                // 使用与接收端相同的进度跟踪结构
                transferTimes.current[transferId] = {
                    lastTime: Date.now(),
                    lastBytes: 0,
                    startTime: Date.now(),
                    totalBytes: 0
                };

                // 发送文件的每个分块
                while (offset < file.size) {
                    const chunk = await readFileChunk(file, offset, chunkSize);

                    // 构建消息
                    conn.send({
                        type: 'file-chunk',
                        transferId,
                        chunk,
                        index: chunkIndex,
                        total: totalChunks
                    });

                    // 更新已发送的字节数
                    offset += chunk.byteLength;
                    chunkIndex++;

                    // 更新发送进度
                    updateUploadProgress(transferId, offset, file.size);

                    // 简单的流量控制 - 可选
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                return transferId;
            } catch (error) {
                console.error('发送文件失败:', error);
                throw error;
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
                updateTransferProgress(transferId, offset, file.size);

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

    // 修改更新传输进度的函数，添加速度计算
    const updateTransferProgress = (transferId: string, bytesReceived: number, fileSize: number) => {
        const progress = Math.min(100, Math.floor((bytesReceived / fileSize) * 100));

        console.log(`传输进度更新: ${transferId}, ${progress}%, ${bytesReceived}/${fileSize} 字节`);

        setTransfers(prev => {
            return prev.map(t => {
                if (t.id === transferId) {
                    return {
                        ...t,
                        progress,
                        status: progress >= 100 ? 'completed' : 'transferring'
                    };
                }
                return t;
            });
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

    // 完善 completeTransfer 函数实现
    const completeTransfer = async (transferId: string) => {
        try {
            const chunks = fileChunks.current[transferId];
            if (!chunks || chunks.length === 0) {
                throw new Error("没有接收到文件块");
            }

            // 过滤出有效的块
            const validChunks = chunks.filter(chunk => chunk && chunk.byteLength);
            if (validChunks.length === 0) {
                throw new Error("所有文件块无效");
            }

            // 计算总大小
            let totalSize = 0;
            validChunks.forEach(chunk => {
                totalSize += chunk.byteLength;
            });

            // 创建一个足够大的缓冲区
            const fileData = new Uint8Array(totalSize);

            // 复制所有块到缓冲区
            let offset = 0;
            for (const chunk of validChunks) {
                fileData.set(chunk, offset);
                offset += chunk.byteLength;
            }

            // 获取文件信息
            const info = fileInfo.current[transferId];
            if (!info) {
                throw new Error("找不到文件信息");
            }

            // 保存文件数据
            try {
                const savedPath = await window.electron.file.saveDownload({
                    fileName: info.name,
                    fileData: Array.from(fileData)
                });

                // 更新传输状态为已完成
                setTransfers(prev =>
                    prev.map(t =>
                        t.id === transferId
                            ? { ...t, progress: 100, status: 'completed', savedPath }
                            : t
                    )
                );

                // 触发事件通知文件传输完成
                window.dispatchEvent(new CustomEvent('file-transfer-complete'));
                console.log(`触发通知事件：file-transfer-complete，ID: ${transferId}`);

            } catch (saveError) {
                console.error("保存文件失败:", saveError);
                throw saveError;
            }

        } catch (error) {
            console.error("完成传输时出错:", error);
            // 更新为错误状态
            setTransfers(prev =>
                prev.map(t =>
                    t.id === transferId
                        ? { ...t, status: 'error' as const }
                        : t
                )
            );
        }
    };

    // 修改添加传输的函数
    const addFileTransfer = (fileInfo: Omit<FileTransfer, 'id'>) => {
        const id = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
        const newTransfer: FileTransfer = { id, ...fileInfo };

        debug("Adding new transfer:", newTransfer);

        // 使用函数式更新确保最新状态
        setTransfers(prev => {
            const newTransfers = [...prev, newTransfer];
            debug("Transfers after adding:", newTransfers);
            return newTransfers;
        });

        return id;
    };

    // 修改接收文件数据的函数以确保进度准确性
    const handleFileChunk = (peerId: string, data: any) => {
        if (data.type === 'file-chunk') {
            const { transferId, chunk, index, total } = data;

            // 检查 chunk 是否有效
            if (!chunk) {
                console.error('收到无效的文件块数据:', { transferId, index, total });
                return;
            }

            // 存储接收到的数据块
            if (!fileChunks.current[transferId]) {
                fileChunks.current[transferId] = [];
            }
            fileChunks.current[transferId][index] = new Uint8Array(chunk);

            // 获取文件信息
            const fileSize = fileInfo.current[transferId]?.size || 0;

            // 计算已接收字节数 - 添加防护检查
            let bytesReceived = 0;
            fileChunks.current[transferId].forEach(chunk => {
                // 添加空值检查
                if (chunk && chunk.byteLength) bytesReceived += chunk.byteLength;
            });

            // 更新接收进度
            updateTransferProgress(transferId, bytesReceived, fileSize);

            // 如果是最后一个块并且所有块都已接收，完成传输
            if (index === total - 1) {
                // 添加有效性检查
                const receivedChunks = fileChunks.current[transferId].filter(c => c && c.byteLength);
                if (receivedChunks.length === total) {
                    completeTransfer(transferId);
                } else {
                    console.warn(`传输未完成: ${receivedChunks.length}/${total} 块已接收`);
                }
            }
        }
    };

    // 添加发送进度更新函数
    const updateUploadProgress = (transferId: string, bytesSent: number, fileSize: number) => {
        const progress = Math.min(100, Math.floor((bytesSent / fileSize) * 100));
        const now = Date.now();

        // 获取时间统计数据
        const timeStat = transferTimes.current[transferId];
        if (!timeStat) return;

        timeStat.totalBytes = bytesSent;

        // 每200ms更新一次UI，避免频繁更新
        if (now - timeStat.lastTime > 200) {
            const bytesDiff = bytesSent - timeStat.lastBytes;
            const timeDiff = (now - timeStat.lastTime) / 1000; // 转为秒
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0; // 字节/秒

            // 更新统计数据
            timeStat.lastTime = now;
            timeStat.lastBytes = bytesSent;

            // 计算剩余时间
            const bytesRemaining = fileSize - bytesSent;
            const timeRemaining = speed > 0 ? bytesRemaining / speed : 0;

            // 更新传输状态
            setTransfers(prev => prev.map(t => {
                if (t.id === transferId) {
                    return {
                        ...t,
                        progress,
                        status: progress >= 100 ? 'completed' : 'transferring',
                        speed,
                        timeRemaining
                    };
                }
                return t;
            }));
        }
    };

    // 文件读取函数 - 添加在 updateUploadProgress 函数之后
    const readFileChunk = (file: File, offset: number, length: number): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = file.slice(offset, offset + length);

            reader.onload = (e) => {
                if (e.target?.result instanceof ArrayBuffer) {
                    resolve(e.target.result);
                } else {
                    reject(new Error('读取文件失败: 无效的ArrayBuffer'));
                }
            };

            reader.onerror = () => reject(new Error('读取文件块时出错'));
            reader.readAsArrayBuffer(blob);
        });
    };

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