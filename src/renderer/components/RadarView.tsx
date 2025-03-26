import { useWebRTC } from "@/hooks/useWebRTC";

const RadarView = () => {
  // 获取WebRTC相关功能
  const { connectToPeer } = useWebRTC();

  const handleTransferConfirm = async (
    deviceIp: string,
    deviceName: string
  ) => {
    try {
      // 使用纯IP地址作为设备ID
      const connected = await connectToPeer(deviceIp);

      if (!connected) {
        console.error(`无法连接到设备: ${deviceIp}`);
        // 使用简单的alert替代toast
        alert(`连接失败: 无法连接到"${deviceName}"，请确保设备在线`);
        return false;
      }

      // 其他传输代码...
    } catch (error) {
      console.error("处理传输确认时出错:", error);
      return false;
    }
  };
};
