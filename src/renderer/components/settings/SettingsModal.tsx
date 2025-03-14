import React, { useState, useEffect } from "react";

// 在组件顶部添加状态变量
const SettingsModal = () => {
  const [heartbeatPort, setHeartbeatPort] = useState(8080);
  const [isOpen, setIsOpen] = useState(false);

  // 组件加载时获取当前设置
  useEffect(() => {
    if (isOpen) {
      // 获取心跳端口设置
      window.electron
        .invoke("heartbeat:getPort")
        .then((port: number) => {
          setHeartbeatPort(port || 8080);
        })
        .catch((error: Error) => {
          console.error("获取心跳端口设置失败:", error);
        });
    }
  }, [isOpen]);

  const handleSave = async () => {
    // 添加调试日志
    console.log("保存端口设置:", heartbeatPort);

    // 确保正确保存设置
    await window.electron.invoke("settings:setPort", heartbeatPort);

    // 其他保存逻辑...
  };

  // 组件其余部分...

  // 添加诊断按钮
  <button
    onClick={async () => {
      const status = await window.electron.invoke("heartbeat:checkStatus");
      alert(
        `心跳服务状态: ${status.running ? "运行中" : "未运行"}\n端口: ${
          status.port
        }`
      );
    }}
    className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
  >
    诊断
  </button>;
};
