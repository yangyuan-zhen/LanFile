import React, { useState, useEffect } from "react";

export const FirewallAlert: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 检查是否是第一次运行
    const isFirstRun = localStorage.getItem("firstRun") !== "false";
    if (isFirstRun) {
      setShow(true);
      localStorage.setItem("firstRun", "false");
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="p-6 max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="text-xl font-bold mb-4">网络权限提示</h3>
        <p className="mb-4">
          LanFile
          需要网络权限才能发现局域网设备并传输文件。如果看到防火墙提示，请选择"允许访问"。
        </p>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShow(false)}
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
