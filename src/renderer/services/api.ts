export async function checkStatus(url: string) {
    try {
        const response = await window.electron.http.request({
            url: `${url}/lanfile/status`,
            method: 'GET',
        });
        return response.data;
    } catch (error) {
        console.error('状态检查失败:', error);
        throw error;
    }
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