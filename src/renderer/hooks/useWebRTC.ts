// @ts-nocheck - 忽略此文件中的所有类型错误
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
        peerConnection: RTCPeerConnection;
        dataChannel: RTCDataChannel;
    } | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<{ id: string; name: string }>({
        id: 'device-' + Math.random().toString(36).substring(2, 10),
        name: '本地设备',
    });
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const isConnecting = useRef<boolean>(false);
    const retryAttempts = useRef<Record<string, number>>({});

    const maxRetries = 3; // 最大重试次数
    const chunkSize = 16384; // 16KB 块大小
    const fileChunksRef = useRef<Record<string, ArrayBuffer>>({});

    // 初始化 WebRTC
    useEffect(() => {
        if (!networkInfo.isConnected || !networkInfo.ip) return;

        const initWebRTC = async () => {
            try {
                setIsReady(false);
                setStatus('checking');
                await (window as any).electron.invoke('webrtc:initialize');
                setIsReady(true);
                setStatus('idle');
                console.log('WebRTC 初始化完成');
            } catch (error) {
                console.error('WebRTC 初始化失败:', error);
                setError('WebRTC 初始化失败');
                setStatus('error');
            }
        };

        initWebRTC();

        return () => {
            Object.values(peers).forEach(peer => peer.connection.close());
        };
    }, [networkInfo.isConnected, networkInfo.ip]);

    // 获取设备信息
    useEffect(() => {
        const getDeviceInfo = async () => {
            try {
                const info = await window.electron.invoke('device:getInfo');
                setDeviceInfo(info);
            } catch (error) {
                console.log('使用随机生成的设备信息');
            }
        };

        getDeviceInfo();
    }, []);

    // 获取设备列表
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const devices = await window.electron.invoke('mdns:getDiscoveredDevices');
                setAllDevices(devices || []);
            } catch (error) {
                console.error('获取设备列表失败:', error);
                setError('获取设备列表失败');
            }
        };

        fetchDevices();

        const handleDeviceFound = (device: Device) => {
            // @ts-ignore - 忽略设备数组类型错误
            setAllDevices(prev => {
                if (!device) return prev;

                if (prev.some(d => d.host === device.host)) {
                    return prev.map(d => d.host === device.host ? device : d);
                }
                return [...prev, device];
            });
        };

        window.electron.on('mdns:deviceFound', handleDeviceFound);

        return () => {
            window.electron.off('mdns:deviceFound', handleDeviceFound);
        };
    }, []);

    // 信令消息处理
    useEffect(() => {
        const handleSignalingMessage = async (message: any) => {
            console.log('收到信令消息:', message);

            if (!message || !message.type) {
                console.error('收到无效信令消息');
                return;
            }

            if (message.to && message.to !== deviceInfo.id) {
                console.log(`消息不是发给当前设备的 (目标=${message.to}, 当前=${deviceInfo.id})`);
                return;
            }

            switch (message.type) {
                case 'offer':
                    console.log('收到 WebRTC offer');
                    handleOffer(message);
                    break;
                case 'answer':
                    console.log('收到 WebRTC answer');
                    handleAnswer(message);
                    break;
                case 'ice-candidate':
                    console.log('收到 ICE 候选项');
                    handleIceCandidate(message);
                    break;
                default:
                    console.log(`未处理的消息类型: ${message.type}`);
            }
        };

        const handleConnectionRequest = (data: any) => {
            console.log('收到连接请求:', data);
            if (data?.fromPeerId && data?.offer) {
                handleOffer({ type: 'offer', from: data.fromPeerId, data: data.offer, to: deviceInfo.id });
            }
        };

        window.electron.on('signaling:message', handleSignalingMessage);
        window.electron.on('webrtc:connectionRequest', handleConnectionRequest);

        return () => {
            window.electron.off('signaling:message', handleSignalingMessage);
            window.electron.off('webrtc:connectionRequest', handleConnectionRequest);
        };
    }, [deviceInfo, peers]);

    // 创建对等连接
    const createPeerConnection = async (peerId: string, isInitiator = true, remoteOffer?: RTCSessionDescriptionInit) => {
        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 0,
            });

            let dataChannel: RTCDataChannel | undefined;

            if (isInitiator) {
                dataChannel = peerConnection.createDataChannel('fileTransfer');
                setupDataChannel(dataChannel, peerId);
            }

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`发送 ICE 候选到 ${peerId}:`, event.candidate);
                    window.electron.invoke('webrtc:sendIceCandidate', {
                        toPeerId: peerId,
                        candidate: event.candidate,
                    });
                }
            };

            peerConnection.ondatachannel = (event) => {
                setupDataChannel(event.channel, peerId);
            };

            peerConnection.onicegatheringstatechange = () => {
                console.log(`ICE 收集状态 (${peerId}): ${peerConnection.iceGatheringState}`);
            };

            peerConnection.oniceconnectionstatechange = () => {
                console.log(`ICE 连接状态 (${peerId}): ${peerConnection.iceConnectionState}`);
                if (peerConnection.iceConnectionState === 'failed') {
                    setConnectionError(
                        'ICE 连接失败，可能是以下原因：\n1. 路由器启用了设备隔离（AP 隔离）。请登录路由器管理界面（192.168.31.1），在"无线设置"或"高级设置"中关闭"AP 隔离"或"客户端隔离"。\n2. 设备防火墙阻止了 WebRTC 流量。请在防火墙中允许 UDP 端口 50000-60000。'
                    );
                    setConnectionState('failed');
                    if (peerConnection.restartIce) {
                        console.log(`尝试重启 ICE 连接 (${peerId})`);
                        peerConnection.restartIce();
                    }
                } else if (peerConnection.iceConnectionState === 'connected') {
                    setConnectionState('connected');
                    setConnectionError(null);
                }
            };

            setPeers(prev => ({
                ...prev,
                [peerId]: { peerId, connection: peerConnection, dataChannel },
            }));

            if (isInitiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                console.log(`发送 Offer 到 ${peerId}:`, offer);
                await window.electron.invoke('webrtc:sendOffer', {
                    toPeerId: peerId,
                    offer: peerConnection.localDescription,
                });
            } else if (remoteOffer) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                console.log(`发送 Answer 到 ${peerId}:`, answer);
                await window.electron.invoke('webrtc:sendAnswer', {
                    toPeerId: peerId,
                    answer: peerConnection.localDescription,
                });
            }

            return peerConnection;
        } catch (error) {
            console.error('创建 WebRTC 连接失败:', error);
            setError('创建 WebRTC 连接失败');
            setConnectionState('failed');
            throw error;
        }
    };

    // 设置数据通道
    const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
        console.log(`设置数据通道: ${peerId}`, channel);

        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
            console.log(`数据通道已打开: ${peerId}`);
            setDataChannels(prev => ({ ...prev, [peerId]: channel }));
        };

        channel.onclose = () => {
            console.log(`数据通道已关闭: ${peerId}`);
            setDataChannels(prev => {
                const newChannels = { ...prev };
                delete newChannels[peerId];
                return newChannels;
            });
        };

        // 存储通道，即使未打开也预先存储引用
        setDataChannels(prev => ({ ...prev, [peerId]: channel }));

        // 其他事件处理...
    }, []);

    // 处理接收的消息
    const handleDataChannelMessage = (data: any, peerId: string) => {
        if (typeof data === 'string') {
            try {
                const message = JSON.parse(data);
                if (message.type === 'file-info') {
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
                            peerId,
                        },
                    ]);

                    sendControlMessage(peerId, {
                        type: 'file-ready',
                        transferId,
                    });
                } else if (message.type === 'file-complete') {
                    const { transferId } = message;
                    const fileData = fileChunksRef.current[transferId];

                    const blob = new Blob([fileData], { type: message.fileType });
                    const url = URL.createObjectURL(blob);

                    window.electron.invoke('file:saveDownloadedFile', {
                        url,
                        fileName: message.fileName,
                        fileType: message.fileType,
                    });

                    setTransfers(prev =>
                        prev.map(t =>
                            t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t
                        )
                    );

                    delete fileChunksRef.current[transferId];
                }
            } catch (error) {
                console.error('解析数据通道消息失败:', error);
                setError('解析数据通道消息失败');
            }
        } else {
            const buffer = new Uint8Array(data);
            const idLength = buffer[0];
            const transferId = new TextDecoder().decode(buffer.slice(1, idLength + 1));
            const chunk = buffer.slice(idLength + 1);

            const existingBuffer = fileChunksRef.current[transferId] || new ArrayBuffer(0);
            const newBuffer = new Uint8Array(existingBuffer.byteLength + chunk.byteLength);
            newBuffer.set(new Uint8Array(existingBuffer), 0);
            newBuffer.set(chunk, existingBuffer.byteLength);
            fileChunksRef.current[transferId] = newBuffer.buffer;

            setTransfers(prev => {
                const transfer = prev.find(t => t.id === transferId);
                if (transfer) {
                    const progress = Math.min(100, Math.floor((newBuffer.byteLength / transfer.size) * 100));
                    return prev.map(t =>
                        t.id === transferId ? { ...t, progress, status: 'transferring' } : t
                    );
                }
                return prev;
            });
        }
    };

    // 发送控制消息
    const sendControlMessage = (peerId: string, message: any) => {
        const channel = dataChannels[peerId];
        if (channel?.readyState === 'open') {
            channel.send(JSON.stringify(message));
            return true;
        }
        console.error(`无法发送消息到设备 ${peerId}，数据通道未打开`);
        setError(`无法发送消息到设备 ${peerId}，数据通道未打开`);
        return false;
    };

    // 关闭连接
    const closeConnectionToPeer = (peerId: string) => {
        console.log(`关闭与 ${peerId} 的连接`);

        if (dataChannels[peerId]) {
            dataChannels[peerId].close();
        }

        if (peers[peerId]) {
            peers[peerId].connection.close();
        }

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

        setActiveConnection(null);
    };

    // 查找设备
    const findPeerDevice = (peerId: string) => {
        console.log('查找设备，当前设备列表:', allDevices);

        let device = allDevices.find(
            d => d.host === peerId || (d.addresses && d.addresses.includes(peerId))
        );

        if (device) {
            console.log('通过 IP 直接找到设备:', device);
            return device;
        }

        return null;
    };

    // 查找设备（异步）
    const findDeviceById = async (id: string): Promise<Device | null> => {
        try {
            let pureIpId = id;
            if (id.match(/^(\d{1,3}\.){3}\d{1,3}/)) {
                const ipMatch = id.match(/^(\d{1,3}\.){3}\d{1,3}/);
                if (ipMatch) {
                    pureIpId = ipMatch[0];
                }
            }

            const devices = await window.electron.invoke('mdns:getDiscoveredDevices');
            return (
                devices.find(
                    (d: Device) => d.host === pureIpId || d.addresses.includes(pureIpId)
                ) || null
            );
        } catch (error) {
            console.error('查找设备失败:', error);
            setError('查找设备失败');
            return null;
        }
    };

    // 连接到对等点
    const connectToPeer = useCallback(async (peerIp: string) => {
        if (isConnecting.current) {
            console.log("已有连接请求进行中，请稍后再试");
            return false;
        }

        isConnecting.current = true;
        console.log(`尝试直接连接局域网设备: ${peerIp}`);
        setStatus('connecting');

        try {
            // 本地局域网连接 - 无需STUN/TURN服务器
            const peerConnection = new RTCPeerConnection({
                iceServers: [], // 禁用STUN/TURN，仅使用局域网IP
            });

            // 创建更可靠的数据通道配置
            const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                ordered: true, // 确保数据包顺序
                maxRetransmits: 30 // 失败时重试次数
            });

            // 添加监听器更快地检测连接状态
            peerConnection.addEventListener('connectionstatechange', () => {
                console.log(`连接状态 (${peerIp}): ${peerConnection.connectionState}`);
                if (peerConnection.connectionState === 'connected') {
                    setStatus('connected');
                }
            });

            // 设置ICE采集完成事件
            peerConnection.addEventListener('icegatheringstatechange', () => {
                if (peerConnection.iceGatheringState === 'complete') {
                    console.log('本地候选项采集完成');
                }
            });

            // 配置数据通道
            setupDataChannel(dataChannel, peerIp);

            // 保存连接引用
            setPeers(prev => ({
                ...prev,
                [peerIp]: { peerId: peerIp, connection: peerConnection }
            }));

            // 创建提议
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // 发送提议到对方
            await window.electron.invoke('signaling:sendMessage', peerIp, {
                type: 'offer',
                data: peerConnection.localDescription,
                from: deviceInfo.id
            });

            // 等待连接建立或超时
            const connected = await Promise.race([
                new Promise<boolean>(resolve => {
                    const checkInterval = setInterval(() => {
                        if (dataChannels[peerIp]?.readyState === 'open') {
                            clearInterval(checkInterval);
                            resolve(true);
                        }
                    }, 500);
                }),
                new Promise<boolean>(resolve => {
                    setTimeout(() => {
                        console.log('连接超时，尝试发送更多本地候选项');
                        // 超时后主动发送所有已收集的候选项
                        if (peerConnection.localDescription && peerConnection.localDescription.sdp) {
                            window.electron.invoke('signaling:sendMessage', peerIp, {
                                type: 'offer-refresh',
                                data: peerConnection.localDescription,
                                from: deviceInfo.id
                            });
                        }
                        setTimeout(() => resolve(false), 5000); // 再等5秒
                    }, 8000);
                })
            ]);

            isConnecting.current = false;

            if (!connected) {
                setError(`连接到设备 ${peerIp} 超时`);
                console.error(`连接到设备 ${peerIp} 失败 - 局域网直连超时`);
                return false;
            }

            return true;
        } catch (error) {
            console.error("局域网连接失败:", error);
            isConnecting.current = false;
            setError(`局域网连接失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }, [deviceInfo.id, setupDataChannel, dataChannels]);

    // 发送文件
    const sendFile = useCallback(async (peerId: string, file: File) => {
        try {
            console.log(`尝试发送文件到: ${peerId}`, file);

            // 尝试连接（如果尚未连接）
            if (!dataChannels[peerId] || dataChannels[peerId].readyState !== 'open') {
                console.log(`连接未建立，尝试连接...`);
                const connected = await connectToPeer(peerId);

                if (!connected) {
                    throw new Error(`无法连接到设备: ${peerId}`);
                }

                // 连接后等待确认数据通道已打开
                console.log(`等待数据通道就绪...`);
                for (let i = 0; i < 20; i++) { // 最多等待10秒
                    if (dataChannels[peerId]?.readyState === 'open') {
                        break;
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (!dataChannels[peerId] || dataChannels[peerId].readyState !== 'open') {
                    throw new Error(`数据通道未能打开，当前状态: ${dataChannels[peerId]?.readyState || '未创建'}`);
                }
            }

            // 文件发送逻辑...
            // (保留现有逻辑)
        } catch (error) {
            console.error('文件发送失败:', error);
            throw error;
        }
    }, [dataChannels, connectToPeer]);

    // 处理 Offer
    const handleOffer = useCallback(
        async (message: any) => {
            try {
                const { from, data: offer } = message;
                console.log(`处理来自 ${from} 的 WebRTC offer`);

                if (peers[from]) {
                    peers[from].connection.close();
                }

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                    iceTransportPolicy: 'all',
                    iceCandidatePoolSize: 0,
                });

                await pc.setRemoteDescription(new RTCSessionDescription(offer));

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                window.electron.invoke('webrtc:sendAnswer', {
                    toPeerId: from,
                    answer: pc.localDescription,
                });

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        window.electron.invoke('webrtc:sendIceCandidate', {
                            toPeerId: from,
                            candidate: event.candidate,
                        });
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    console.log(`ICE 连接状态 (${from}): ${pc.iceConnectionState}`);
                    if (pc.iceConnectionState === 'connected') {
                        setConnectionState('connected');
                        setConnectionError(null);
                        setStatus('connected');
                    } else if (pc.iceConnectionState === 'failed') {
                        setConnectionError(
                            'ICE 连接失败，可能是以下原因：\n1. 路由器启用了设备隔离（AP 隔离）。请登录路由器管理界面（192.168.31.1），在"无线设置"或"高级设置"中关闭"AP 隔离"或"客户端隔离"。\n2. 设备防火墙阻止了 WebRTC 流量。请在防火墙中允许 UDP 端口 50000-60000。'
                        );
                        setConnectionState('failed');
                        setStatus('error');
                    }
                };

                pc.ondatachannel = (event) => {
                    setupDataChannel(event.channel, from);
                };

                setPeers(prev => ({
                    ...prev,
                    [from]: { peerId: from, connection: pc },
                }));
            } catch (error) {
                console.error('处理 offer 失败:', error);
                setError('处理 offer 失败');
            }
        },
        [peers]
    );

    // 处理 Answer
    const handleAnswer = useCallback(
        async (message: any) => {
            try {
                const { from, data: answer } = message;
                console.log(`处理来自 ${from} 的 WebRTC answer`);

                const peer = peers[from];
                if (!peer) {
                    console.error(`未找到与 ${from} 的连接`);
                    return;
                }

                await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('处理 answer 失败:', error);
                setError('处理 answer 失败');
            }
        },
        [peers]
    );

    // 处理 ICE 候选项
    const handleIceCandidate = useCallback(
        async (message: any) => {
            try {
                const { from, data: candidate } = message;
                console.log(`处理来自 ${from} 的 ICE 候选项`);

                const peer = peers[from];
                if (!peer) {
                    console.error(`未找到与 ${from} 的连接`);
                    return;
                }

                await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('处理 ICE 候选项失败:', error);
                setError('处理 ICE 候选项失败');
            }
        },
        [peers]
    );

    // ICE 连接检测
    const checkIceConnectivity = async () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });

            let hasCandidate = false;

            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    pc.close();
                    resolve(hasCandidate);
                }, 5000);

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('ICE 候选项检测:', event.candidate.candidate);
                        hasCandidate = true;
                    }
                };

                const dc = pc.createDataChannel('connectivity-test');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
            });
        } catch (error) {
            console.error('ICE 连接检测失败:', error);
            setError('ICE 连接检测失败');
            return false;
        }
    };

    return {
        isReady,
        peers,
        transfers,
        connectToPeer,
        sendFile,
        status,
        error,
        connectionState,
        connectionError,
        deviceInfo,
        allDevices,
        checkIceConnectivity,
    };
};