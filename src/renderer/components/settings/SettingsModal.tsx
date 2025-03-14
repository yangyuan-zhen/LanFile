import React, { useState } from "react";

// 在组件顶部添加状态变量
const SettingsModal = () => {
  const [heartbeatPort, setHeartbeatPort] = useState(32199); // 设置默认值

  const handleSave = async () => {
    // 添加调试日志
    console.log("保存端口设置:", heartbeatPort);

    // 确保正确保存设置
    await window.electron.invoke("settings:setPort", heartbeatPort);

    // 其他保存逻辑...
  };

  // 组件其余部分...
};
