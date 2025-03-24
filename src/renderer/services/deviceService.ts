/**
 * 使用TCP连接检测设备在线状态
 */
export async function checkDeviceStatus(deviceIp: string): Promise<{ online: boolean }> {
    try {
        // 直接使用TCP检测
        const result = await window.electron.invoke('device:ping', deviceIp);

        if (result.success) {
            console.log(`设备 ${deviceIp} TCP检测在线`);
            return { online: true };
        } else {
            console.log(`设备 ${deviceIp} TCP检测离线`);
            return { online: false };
        }
    } catch (error) {
        console.warn(`设备 ${deviceIp} 状态检查失败:`, error);
        return { online: false };
    }
} 