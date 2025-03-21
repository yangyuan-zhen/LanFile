export async function checkStatus(url: string, retries = 2) {
    let lastError;

    for (let i = 0; i <= retries; i++) {
        try {
            const response = await window.electron.http.request({
                url: `${url}/lanfile/status`,
                method: 'GET',
                timeout: 3000 // 设置超时时间
            });
            return response.data;
        } catch (error) {
            console.log(`状态检查失败 (尝试 ${i + 1}/${retries + 1}):`, error);
            lastError = error;
            // 如果不是最后一次尝试，等待一段时间再重试
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    throw lastError;
}

// 添加UDP连接测试API
export const testUdpConnection = async (targetIp: string, port: number = 19302): Promise<boolean> => {
    try {
        const result = await window.electron.invoke('network:testUdpPort', targetIp, port);
        return result.success;
    } catch (error) {
        console.error('UDP连接测试失败:', error);
        return false;
    }
}; 