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

    return { sendFile };
}; 