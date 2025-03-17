export const useFileTransfer = (dataChannel: RTCDataChannel | null) => {
    // Hook 内部逻辑

    const sendFile = async (file: File, recipientId: string) => {
        try {
            // 检查数据通道状态
            if (!dataChannel || dataChannel.readyState !== 'open') {
                console.error(`数据通道未就绪，当前状态: ${dataChannel?.readyState || '未创建'}`);

                // 尝试等待连接建立 (最多等待5秒)
                if (dataChannel && dataChannel.readyState === 'connecting') {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('等待数据通道打开超时'));
                        }, 5000);

                        dataChannel.onopen = () => {
                            clearTimeout(timeout);
                            resolve(true);
                        };
                    });
                } else {
                    throw new Error(`数据通道未打开，当前状态: ${dataChannel?.readyState || '未创建'}`);
                }
            }

            // 文件传输逻辑...

        } catch (error) {
            console.error('文件发送失败:', error);
            // 错误处理...
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);

            // 使用 errorMessage 进行进一步处理
        }
    };

    // 添加基于IP的直接传输回退方案
    const transferFile = async (peerId: string, file: File, peerIp?: string) => {
        try {
            // 先尝试WebRTC
            await webrtcSendFile(peerId, file);
        } catch (error) {
            console.log('WebRTC传输失败，尝试直接IP连接', error);

            if (peerIp) {
                // 尝试直接IP连接作为备选
                try {
                    await directIpSendFile(peerIp, file);
                } catch (directError) {
                    console.error('所有传输方法均失败', directError);
                    throw new Error('文件传输失败：无法建立任何类型的连接');
                }
            } else {
                throw error;
            }
        }
    };

    return { sendFile, transferFile };
}; 