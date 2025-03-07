import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

const NetworkSettings = forwardRef((props, ref) => {
  const [heartbeatPort, setHeartbeatPort] = useState(8080);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    // 保存所有网络设置
    saveSettings: async () => {
      return saveHeartbeatSettings();
    },
  }));

  // 加载保存的设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const port = await window.electron.invoke("heartbeat:getPort");
        if (port) {
          setHeartbeatPort(port);
        }
      } catch (error) {
        console.error("获取心跳端口设置失败:", error);
      }
    };

    loadSettings();
  }, []);

  // 保存心跳设置
  const saveHeartbeatSettings = async () => {
    try {
      await window.electron.invoke("heartbeat:setPort", heartbeatPort);
      return true;
    } catch (error) {
      console.error("保存心跳设置失败:", error);
      throw error;
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">网络设置</h3>

      {/* 心跳服务设置 */}
      <div className="mb-6">
        <h4 className="text-base font-medium mb-2">心跳服务</h4>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="heartbeatPort" className="text-sm">
            端口:
          </label>
          <input
            id="heartbeatPort"
            type="number"
            min="1024"
            max="65535"
            value={heartbeatPort}
            onChange={(e) => setHeartbeatPort(Number(e.target.value))}
            className="px-2 py-1 border rounded w-24"
          />
          <button
            onClick={saveHeartbeatSettings}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            应用
          </button>
        </div>
        <p className="text-xs text-gray-500">
          心跳服务用于检测其他设备上的 LanFile 应用是否正在运行
        </p>
      </div>

      {/* 其他网络设置可以在这里添加 */}
    </div>
  );
});

NetworkSettings.displayName = "NetworkSettings";
export default NetworkSettings;
