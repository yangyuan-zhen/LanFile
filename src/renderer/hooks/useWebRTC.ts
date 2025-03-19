import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkInfo } from './useNetworkInfo';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { Device } from '../services/ZeroconfService';

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
    const [status, setStatus] = useState<'idle' | 'checking' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [activeConnection, setActiveConnection] = useState<{
        peerConnection: RTCPeerConnection,
        dataChannel: RTCDataChannel
    } | null>(null);
    const [peerConnections, setPeerConnections] = useState<Record<string, {
        pc: RTCPeerConnection,
        dataChannel: RTCDataChannel
    }>>({});

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
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ],
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 5
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

            // 添加ICE候选收集完成日志
            peerConnection.onicegatheringstatechange = () => {
                console.log(`ICE收集状态: ${peerConnection.iceGatheringState}`);
                if (peerConnection.iceGatheringState === 'complete') {
                    console.log('ICE候选收集完成，检查候选项类型');
                    // 此时应该有局域网直连候选项
                }
            };

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
    const connectToPeer = useCallback(async (peerInfoOrId: Device | string) => {
        try {
            setStatus('connecting');

            // 如果传入的是字符串ID，转换为设备对象
            let peerInfo: Device;
            if (typeof peerInfoOrId === 'string') {
                // 查找设备信息
                const devices = await window.electron.invoke('mdns:getDiscoveredDevices');
                const device = devices.find((d: Device) => d.host === peerInfoOrId);
                if (!device) {
                    throw new Error(`找不到ID为 ${peerInfoOrId} 的设备信息`);
                }
                peerInfo = device;
            } else {
                peerInfo = peerInfoOrId;
            }

            // 添加详细日志
            console.log(`开始连接到设备: ${peerInfo.name} (${peerInfo.host})`);

            // 创建新的RTCPeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ],
                // 添加ICE传输策略，优先使用UDP
                iceTransportPolicy: 'all',
                // 增加ICE收集超时时间
                iceCandidatePoolSize: 10
            });

            // 设置断开连接的超时时间
            const connectionTimeout = setTimeout(() => {
                console.log(`连接到 ${peerInfo.name} 超时`);
                pc.close();
                setStatus('error');
                setError('连接超时 - 检查网络环境和防火墙设置');
                throw new Error('连接超时 - 检查网络环境和防火墙设置');
            }, 30000); // 增加超时时间为30秒

            // 更详细的连接状态监控
            pc.oniceconnectionstatechange = () => {
                console.log(`ICE连接状态: ${pc.iceConnectionState}`);

                if (pc.iceConnectionState === 'failed') {
                    clearTimeout(connectionTimeout);
                    pc.close();
                    setStatus('error');
                    setError('ICE连接失败 - 可能是NAT穿透问题');
                } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    console.log('ICE连接已建立！');
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log(`ICE收集状态: ${pc.iceGatheringState}`);
            };

            pc.onsignalingstatechange = () => {
                console.log(`信令状态: ${pc.signalingState}`);
            };

            pc.onconnectionstatechange = () => {
                console.log(`连接状态: ${pc.connectionState}`);

                if (pc.connectionState === 'connected') {
                    clearTimeout(connectionTimeout);
                    console.log('WebRTC连接成功建立！');
                    setStatus('connected');
                } else if (pc.connectionState === 'failed') {
                    clearTimeout(connectionTimeout);
                    pc.close();
                    setStatus('error');
                    setError('连接失败 - 检查网络和防火墙设置');
                }
            };

            // 监听ICE候选项
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('收集到ICE候选项:', event.candidate.candidate);

                    // 发送ICE候选项到对方设备
                    window.electron.invoke('signaling:sendMessage', peerInfo.host, {
                        type: 'ice-candidate',
                        from: deviceInfo.id,
                        to: peerInfo.host,
                        data: event.candidate,
                        timestamp: Date.now()
                    });
                } else {
                    console.log('ICE候选项收集完成');
                }
            };

            // 创建数据通道
            const dataChannel = pc.createDataChannel('fileTransfer', {
                ordered: true,
            });

            // 更详细的数据通道状态监控
            dataChannel.onopen = () => {
                console.log('数据通道已打开');
                clearTimeout(connectionTimeout);
                setStatus('connected');
                setActiveConnection({ peerConnection: pc, dataChannel });
            };

            dataChannel.onclose = () => {
                console.log('数据通道已关闭');
                setStatus('disconnected');
            };

            dataChannel.onerror = (error) => {
                console.error('数据通道错误:', error);
                setStatus('error');
                setError(`数据通道错误: ${error}`);
            };

            // 创建并发送offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log('发送WebRTC offer到:', peerInfo.host);
            window.electron.invoke('signaling:sendMessage', peerInfo.host, {
                type: 'offer',
                from: deviceInfo.id,
                to: peerInfo.host,
                data: offer,
                timestamp: Date.now()
            });

            // 保存连接信息
            setPeerConnections(prev => ({
                ...prev,
                [peerInfo.host]: { pc, dataChannel }
            }));

            return true;
        } catch (error) {
            console.error('建立WebRTC连接失败:', error);
            setStatus('error');
            setError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }, [deviceInfo]);

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
                // 查找设备信息后再连接
                const deviceInfo = await findDeviceById(peerId);
                if (!deviceInfo) {
                    throw new Error(`找不到ID为 ${peerId} 的设备信息`);
                }
                await connectToPeer(deviceInfo);
            }

            // 文件传输逻辑...
        } catch (error) {
            console.error('文件发送失败:', error);
            throw error;
        }
    }, [dataChannels, connectToPeer, signalingService]);

    // 添加一个辅助函数来查找设备
    const findDeviceById = async (id: string): Promise<Device | null> => {
        // 可以从全局状态或通过API获取设备信息
        try {
            const devices = await window.electron.invoke('mdns:getDiscoveredDevices');
            return devices.find((d: Device) => d.host === id) || null;
        } catch (error) {
            console.error('查找设备失败:', error);
            return null;
        }
    };

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

    // 将这些处理函数移到这里（checkIceConnectivity 函数之后，useEffect 之前）
    const handleOffer = useCallback(async (message: any) => {
        try {
            const { from, data: offer } = message;
            console.log(`处理来自 ${from} 的 WebRTC offer`);

            // 如果已有与此对等方的连接，先关闭
            if (peerConnections[from]) {
                peerConnections[from].pc.close();
            }

            // 创建新的RTCPeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // 设置远程描述
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // 创建应答
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // 发送应答到对等方
            window.electron.invoke('signaling:sendMessage', from, {
                type: 'answer',
                from: deviceInfo.id,
                to: from,
                data: answer,
                timestamp: Date.now()
            });

            // 处理ICE候选项
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.electron.invoke('signaling:sendMessage', from, {
                        type: 'ice-candidate',
                        from: deviceInfo.id,
                        to: from,
                        data: event.candidate,
                        timestamp: Date.now()
                    });
                }
            };

            // 保存连接
            setPeerConnections(prev => ({
                ...prev,
                [from]: { pc, dataChannel: null as any }
            }));
        } catch (error) {
            console.error('处理offer失败:', error);
        }
    }, [deviceInfo, peerConnections]);

    const handleAnswer = useCallback(async (message: any) => {
        try {
            const { from, data: answer } = message;
            console.log(`处理来自 ${from} 的 WebRTC answer`);

            // 获取对应的对等连接
            const peerConnection = peerConnections[from]?.pc;
            if (!peerConnection) {
                console.error(`未找到与 ${from} 的连接`);
                return;
            }

            // 设置远程描述
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('处理answer失败:', error);
        }
    }, [peerConnections]);

    const handleIceCandidate = useCallback(async (message: any) => {
        try {
            const { from, data: candidate } = message;
            console.log(`处理来自 ${from} 的 ICE候选项`);

            // 获取对应的对等连接
            const peerConnection = peerConnections[from]?.pc;
            if (!peerConnection) {
                console.error(`未找到与 ${from} 的连接`);
                return;
            }

            // 添加ICE候选项
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('处理ICE候选项失败:', error);
        }
    }, [peerConnections]);

    // 在useEffect中处理信令消息
    useEffect(() => {
        const handleSignalingMessage = async (message: any) => {
            console.log('收到信令消息:', message);

            if (!message || !message.type) {
                console.error('收到无效信令消息');
                return;
            }

            // 确保消息是发给本设备的
            if (message.to && message.to !== deviceInfo.id) {
                console.log(`消息不是发给当前设备的 (目标=${message.to}, 当前=${deviceInfo.id})`);
                return;
            }

            switch (message.type) {
                case 'offer':
                    console.log('收到WebRTC offer');
                    handleOffer(message);
                    break;

                case 'answer':
                    console.log('收到WebRTC answer');
                    handleAnswer(message);
                    break;

                case 'ice-candidate':
                    console.log('收到ICE候选项');
                    handleIceCandidate(message);
                    break;

                default:
                    console.log(`未处理的消息类型: ${message.type}`);
            }
        };

        // 添加信令消息监听器
        window.electron.on('signaling:message', handleSignalingMessage);

        return () => {
            window.electron.off('signaling:message', handleSignalingMessage);
        };
    }, [deviceInfo, handleOffer, handleAnswer, handleIceCandidate]);

    // 在连接前进行ICE检测
    const checkIceConnectivity = async () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            let hasCandidate = false;

            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    pc.close();
                    resolve(hasCandidate);
                }, 5000);

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('ICE候选项检测:', event.candidate.candidate);
                        hasCandidate = true;
                    }
                };

                const dc = pc.createDataChannel('connectivity-test');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
            });
        } catch (error) {
            console.error('ICE连接检测失败:', error);
            return false;
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