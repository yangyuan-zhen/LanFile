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