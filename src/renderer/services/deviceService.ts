export async function checkDeviceStatus(deviceIp: string) {
    try {
        // 通过信令系统发送ping消息
        const result = await window.electron.invoke('signaling:sendMessage', deviceIp, {
            type: 'ping',
            from: await window.electron.invoke('device:getId'),
            to: deviceIp,
            timestamp: Date.now()
        });

        return { online: result.success };
    } catch (error) {
        console.warn(`设备 ${deviceIp} 状态检查失败:`, error);
        return { online: false };
    }
} 