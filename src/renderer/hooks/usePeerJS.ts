import { useState, useEffect, useCallback, useRef } from 'react';
import Peer from 'peerjs';

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

export const usePeerJS = () => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [connections, setConnections] = useState<Record<string, any>>({});
    const [isReady, setIsReady] = useState(false);
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [deviceId, setDeviceId] = useState<string>('');
    const isConnecting = useRef<boolean>(false);

    // 初始化PeerJS
    useEffect(() => {
        const initPeer = async () => {
            try {
                setStatus('connecting');

                // 获取设备信息，但生成更唯一的 ID
                const deviceInfo = await window.electron.invoke('device:getInfo');
                const randomSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                const peerId = `lanfile-${deviceInfo.id.substring(0, 8)}-${randomSuffix}`;

                console.log("生成的唯一 PeerJS ID:", peerId);
                setDeviceId(peerId);

                // 创建 Peer 实例
                const newPeer = new Peer(peerId, {
                    config: {
                        iceServers: [] // 局域网中不需要 STUN/TURN 服务器
                    }
                });

                // 当PeerJS连接成功后，启动发现服务
                newPeer.on('open', async (id) => {
                    console.log(`PeerJS已连接，ID: ${id}`);
                    // 启动ID发现服务
                    await window.electron.invoke('peer:startDiscovery', id);
                    setIsReady(true);
                    setStatus('idle');
                });

                newPeer.on('connection', (conn) => {
                    handleIncomingConnection(conn);
                });

                newPeer.on('error', (err) => {
                    console.error('PeerJS错误:', err);
                    setError(`PeerJS错误: ${err.message}`);
                    setStatus('error');
                });

                setPeer(newPeer);
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
            setConnections(prev => ({ ...prev, [conn.peer]: conn }));
        });

        conn.on('data', (data: any) => {
            // 处理接收到的数据
            if (data.type === 'file-info') {
                // 处理文件信息
                console.log('收到文件信息:', data);

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

                // 确认文件信息接收
                conn.send({ type: 'file-info-received', transferId: data.transferId });
            }
            else if (data.type === 'file-chunk') {
                // 处理文件块
                // 更新传输进度
            }
            else if (data.type === 'file-complete') {
                // 文件传输完成
            }
        });

        conn.on('close', () => {
            console.log(`与 ${conn.peer} 的连接已关闭`);
            setConnections(prev => {
                const newConnections = { ...prev };
                delete newConnections[conn.peer];
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
            return false;
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

            return new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('连接超时');
                    conn.close();
                    isConnecting.current = false;
                    setStatus('error');
                    setError(`连接到 ${peerIp} 超时`);
                    resolve(false);
                }, 10000);

                conn.on('open', () => {
                    console.log(`成功连接到 ${remotePeerId}`);
                    clearTimeout(timeout);
                    setConnections(prev => ({ ...prev, [remotePeerId]: conn }));
                    isConnecting.current = false;
                    setStatus('connected');
                    resolve(true);
                });

                conn.on('error', (err) => {
                    console.error(`连接失败:`, err);
                    clearTimeout(timeout);
                    isConnecting.current = false;
                    setStatus('error');
                    setError(`连接失败: ${err.message}`);
                    resolve(false);
                });
            });
        } catch (error) {
            console.error('连接失败:', error);
            isConnecting.current = false;
            setStatus('error');
            setError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }, [peer, isReady]);

    // 发送文件方法
    const sendFile = useCallback(async (peerIp: string, file: File) => {
        try {
            // 获取或建立连接
            let conn = null;

            // 查找现有连接
            for (const [id, connection] of Object.entries(connections)) {
                if (id.includes(peerIp)) {
                    conn = connection;
                    break;
                }
            }

            // 如果没有连接，尝试建立连接
            if (!conn) {
                const connected = await connectToPeer(peerIp);
                if (!connected) {
                    throw new Error(`无法连接到设备 ${peerIp}`);
                }

                // 重新获取连接
                for (const [id, connection] of Object.entries(connections)) {
                    if (id.includes(peerIp)) {
                        conn = connection;
                        break;
                    }
                }
            }

            if (!conn) {
                throw new Error('连接已建立但无法获取数据通道');
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

            // 开始文件传输
            await sendFileChunks(conn, file, transferId);

            return transferId;
        } catch (error) {
            console.error('发送文件失败:', error);
            setError(`发送文件失败: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }, [connections, connectToPeer]);

    // 辅助函数：发送文件块
    const sendFileChunks = async (conn: any, file: File, transferId: string) => {
        const chunkSize = 16384; // 16KB
        const fileReader = new FileReader();
        let offset = 0;

        setTransfers(prev =>
            prev.map(t => t.id === transferId ? { ...t, status: 'transferring' } : t)
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
                offset += chunkSize;
                const progress = Math.min(100, Math.floor((offset / file.size) * 100));

                setTransfers(prev =>
                    prev.map(t => t.id === transferId ? { ...t, progress } : t)
                );

                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    // 文件发送完成
                    setTransfers(prev =>
                        prev.map(t => t.id === transferId ?
                            { ...t, progress: 100, status: 'completed' } : t)
                    );
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