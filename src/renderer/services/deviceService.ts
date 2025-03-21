/**
 * 使用WebSocket信令检测设备在线状态
 */
export async function checkDeviceStatus(deviceIp: string): Promise<{ online: boolean }> {
    try {
        // 使用WebSocket信令ping设备
        const result = await window.electron.invoke('device:ping', deviceIp);

        if (result.success) {
            console.log(`设备 ${deviceIp} 在线`);
            return { online: true };
        } else {
            console.log(`设备 ${deviceIp} 离线`);
            return { online: false };
        }
    } catch (error) {
        console.warn(`设备 ${deviceIp} 状态检查失败:`, error);
        return { online: false };
    }
} 