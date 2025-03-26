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
    const setupDataChannel = (channel: RTCDataChannel, peerId: string) => {
        channel.binaryType = 'arraybuffer';

        channel.onopen = () => {
            console.log(`与设备 ${peerId} 的数据通道已打开`);
            setPeers(prev => ({
                ...prev,
                [peerId]: { ...prev[peerId], dataChannel: channel },
            }));
            setDataChannels(prev => ({
                ...prev,
                [peerId]: channel,
            }));
            setActiveConnection({ peerConnection: peers[peerId].connection, dataChannel: channel });
            setStatus('connected');
        };

        channel.onclose = () => {
            console.log(`与设备 ${peerId} 的数据通道已关闭`);
            setStatus('disconnected');
            closeConnectionToPeer(peerId);
        };

        channel.onerror = (error) => {
            console.error(`与设备 ${peerId} 的数据通道发生错误:`, error);
            setError('数据通道错误');
            setStatus('error');
        };

        channel.onmessage = (event) => {
            handleDataChannelMessage(event.data, peerId);
        };
    };

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
    const connectToPeer = useCallback(
        async (peerId: string) => {
            if (isConnecting.current) {
                console.log('已有连接请求进行中，请稍后再试');
                return false;
            }

            isConnecting.current = true;
            setStatus('connecting');
            console.log(`尝试连接到设备: ${peerId}`);

            try {
                let pureIpId = peerId;
                if (peerId.match(/^(\d{1,3}\.){3}\d{1,3}/)) {
                    const ipMatch = peerId.match(/^(\d{1,3}\.){3}\d{1,3}/);
                    if (ipMatch) {
                        pureIpId = ipMatch[0];
                    }
                }

                let device = findPeerDevice(pureIpId);

                if (!device) {
                    console.log('本地缓存找不到设备，尝试从 mDNS 直接获取');
                    device = await findDeviceById(pureIpId);
                    if (device) {
                        setAllDevices(prev => {
                            if (prev.some(d => d.host === device.host)) {
                                return prev.map(d => d.host === device.host ? device : d);
                            }
                            return [...prev, device] as Device[];
                        });
                    }
                }

                retryAttempts.current[pureIpId] = retryAttempts.current[pureIpId] || 0;

                if (retryAttempts.current[pureIpId] >= maxRetries) {
                    setError(`连接到 ${pureIpId} 失败，已达到最大重试次数 (${maxRetries})`);
                    setStatus('error');
                    isConnecting.current = false;
                    return false;
                }

                if (!device) {
                    console.log(`找不到 IP 为 ${pureIpId} 的设备信息，执行强制连接`);
                    const peerConnection = new RTCPeerConnection({
                        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                        iceTransportPolicy: 'all',
                        iceCandidatePoolSize: 0,
                    });

                    const dataChannel = peerConnection.createDataChannel('fileTransfer');
                    setupDataChannel(dataChannel, pureIpId);

                    setPeers(prev => ({
                        ...prev,
                        [pureIpId]: { peerId: pureIpId, connection: peerConnection, dataChannel },
                    }));

                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    console.log(`强制连接 - 发送 Offer 到 ${pureIpId}:`, offer);

                    await window.electron.invoke('signaling:connectToDevice', pureIpId, pureIpId);

                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate) {
                            window.electron.invoke('signaling:sendMessage', pureIpId, {
                                type: 'ice-candidate',
                                candidate: event.candidate,
                                from: deviceInfo.id,
                            });
                        }
                    };

                    peerConnection.oniceconnectionstatechange = () => {
                        console.log(`强制连接状态变化: ${peerConnection.iceConnectionState}`);
                        if (peerConnection.iceConnectionState === 'connected') {
                            setConnectionState('connected');
                            setConnectionError(null);
                            setStatus('connected');
                        } else if (peerConnection.iceConnectionState === 'failed') {
                            setConnectionError(
                                '强制连接失败，可能是以下原因：\n1. 路由器启用了设备隔离（AP 隔离）。请登录路由器管理界面（192.168.31.1），在"无线设置"或"高级设置"中关闭"AP 隔离"或"客户端隔离"。\n2. 设备防火墙阻止了 WebRTC 流量。请在防火墙中允许 UDP 端口 50000-60000。'
                            );
                            setConnectionState('failed');
                            setStatus('error');
                        }
                    };

                    const connectionTimeout = setTimeout(() => {
                        if (!dataChannels[pureIpId] || dataChannels[pureIpId].readyState !== 'open') {
                            setError(`连接到 ${pureIpId} 超时`);
                            setStatus('error');
                            closeConnectionToPeer(pureIpId);
                            throw new Error('连接超时');
                        }
                    }, 20000);

                    await new Promise<void>((resolve, reject) => {
                        const checkConnection = () => {
                            if (dataChannels[pureIpId]?.readyState === 'open') {
                                clearTimeout(connectionTimeout);
                                resolve();
                            } else if (peerConnection.iceConnectionState === 'failed') {
                                clearTimeout(connectionTimeout);
                                reject(new Error('ICE 连接失败'));
                            } else {
                                setTimeout(checkConnection, 500);
                            }
                        };
                        checkConnection();
                    });

                    isConnecting.current = false;
                    return true;
                }

                console.log('找到设备，准备建立标准连接:', device);
                await createPeerConnection(pureIpId, true);

                isConnecting.current = false;
                return true;
            } catch (error) {
                console.error('连接到对等设备失败:', error);
                retryAttempts.current[peerId] = (retryAttempts.current[peerId] || 0) + 1;
                setError(
                    `连接失败 (${retryAttempts.current[peerId]}/${maxRetries})：${error instanceof Error ? error.message : String(error)}`
                );
                setStatus('error');
                closeConnectionToPeer(peerId);
                if (retryAttempts.current[peerId] < maxRetries) {
                    console.log(`重试连接 (${retryAttempts.current[peerId]}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return connectToPeer(peerId);
                }
                isConnecting.current = false;
                return false;
            }
        },
        [allDevices, deviceInfo.id]
    );

    // 发送文件
    const sendFile = useCallback(
        async (peerId: string, file: File) => {
            try {
                if (!signalingService.isConnected) {
                    throw new Error('信令服务未连接，无法发送文件');
                }

                let pureIpId = peerId;
                if (peerId.match(/^(\d{1,3}\.){3}\d{1,3}/)) {
                    const ipMatch = peerId.match(/^(\d{1,3}\.){3}\d{1,3}/);
                    if (ipMatch) {
                        pureIpId = ipMatch[0];
                    }
                }

                if (!dataChannels[pureIpId] || dataChannels[pureIpId].readyState !== 'open') {
                    console.log('数据通道未打开，尝试连接...');
                    const connected = await connectToPeer(pureIpId);

                    if (!connected) {
                        throw new Error(`无法连接到设备: ${pureIpId}`);
                    }

                    if (!dataChannels[pureIpId] || dataChannels[pureIpId].readyState !== 'open') {
                        console.log('等待数据通道打开...');
                        await new Promise((resolve) => setTimeout(resolve, 1000));

                        if (!dataChannels[pureIpId] || dataChannels[pureIpId].readyState !== 'open') {
                            throw new Error('数据通道未能打开，无法发送文件');
                        }
                    }
                }

                console.log(`开始传输文件: ${file.name} 到设备: ${pureIpId}`);

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
                        peerId: pureIpId,
                    },
                ]);

                sendControlMessage(pureIpId, {
                    type: 'file-info',
                    transferId,
                    name: file.name,
                    size: file.size,
                    fileType: file.type,
                });

                const reader = new FileReader();
                let offset = 0;

                const readSlice = () => {
                    const slice = file.slice(offset, offset + chunkSize);
                    reader.readAsArrayBuffer(slice);
                };

                reader.onload = (event) => {
                    if (!event.target) {
                        console.error('文件读取事件目标为空');
                        return;
                    }
                    const buffer = event.target.result as ArrayBuffer;
                    const idBuffer = new TextEncoder().encode(transferId);
                    const combinedBuffer = new Uint8Array(1 + idBuffer.length + buffer.byteLength);
                    combinedBuffer[0] = idBuffer.length;
                    combinedBuffer.set(idBuffer, 1);
                    combinedBuffer.set(new Uint8Array(buffer), 1 + idBuffer.length);

                    dataChannels[pureIpId].send(combinedBuffer);
                    offset += buffer.byteLength;

                    setTransfers(prev => {
                        const transfer = prev.find(t => t.id === transferId);
                        if (transfer) {
                            const progress = Math.min(100, Math.floor((offset / transfer.size) * 100));
                            return prev.map(t =>
                                t.id === transferId ? { ...t, progress, status: 'transferring' } : t
                            );
                        }
                        return prev;
                    });

                    if (offset < file.size) {
                        readSlice();
                    } else {
                        sendControlMessage(pureIpId, {
                            type: 'file-complete',
                            transferId,
                            fileName: file.name,
                            fileType: file.type,
                        });
                        setTransfers(prev =>
                            prev.map(t =>
                                t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t
                            )
                        );
                    }
                };

                reader.onerror = (error) => {
                    console.error('文件读取失败:', error);
                    setError('文件读取失败');
                    setTransfers(prev =>
                        prev.map(t => (t.id === transferId ? { ...t, status: 'error' } : t))
                    );
                };

                readSlice();
            } catch (error) {
                console.error('文件发送失败:', error);
                setError(`文件发送失败: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        },
        [dataChannels, connectToPeer, signalingService]
    );

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