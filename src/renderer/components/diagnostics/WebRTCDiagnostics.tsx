import React, { useState } from "react";

export const WebRTCDiagnostics = () => {
  const [results, setResults] = useState<Record<string, boolean | string>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults({});

    // 结果对象
    const diagnosticResults: Record<string, boolean | string> = {};

    try {
      // 1. 检查WebRTC基础支持
      diagnosticResults["webrtcSupport"] = !!window.RTCPeerConnection;

      // 2. 检查ICE服务器连通性
      const iceServers = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ];

      diagnosticResults["iceServerReachable"] =
        await checkStunServerConnectivity(iceServers[0]);

      // 3. 检查NAT类型
      diagnosticResults["natType"] = await detectNatType();

      // 4. 检查数据通道支持
      diagnosticResults["dataChannelSupport"] =
        !!window.RTCPeerConnection.prototype.createDataChannel;

      // 5. 检查本地信令服务状态
      try {
        const status = await window.electron.invoke("signaling:getStatus");
        diagnosticResults["signalingService"] = status.running
          ? "运行中"
          : "未运行";
        diagnosticResults["signalingPort"] = status.port || "未知";
      } catch (error) {
        diagnosticResults["signalingService"] = "检查失败";
      }
    } catch (error) {
      console.error("诊断过程中发生错误:", error);
      diagnosticResults["error"] =
        error instanceof Error ? error.message : String(error);
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="mb-4 text-lg font-medium">WebRTC网络诊断</h2>

      <button
        onClick={runDiagnostics}
        disabled={isRunning}
        className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isRunning ? "诊断中..." : "开始诊断"}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1 text-sm font-medium">诊断结果:</h3>
          <div className="max-h-[200px] overflow-y-auto pr-2">
            <ul className="space-y-1">
              {Object.entries(results).map(([key, value]) => (
                <li key={key} className="flex py-1 text-sm">
                  <span className="font-medium mr-2 min-w-[120px]">
                    {formatKey(key)}:
                  </span>
                  <span className={getValueClass(value)}>
                    {formatValue(value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// 检查STUN服务器连通性
async function checkStunServerConnectivity(
  stunServer: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunServer }],
      });

      let hasConnectivity = false;
      const timeout = setTimeout(() => {
        if (!hasConnectivity) {
          resolve(false);
        }
      }, 5000);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // 如果收到服务器反射候选，表明STUN服务器工作正常
          if (event.candidate.candidate.includes("srflx")) {
            hasConnectivity = true;
            clearTimeout(timeout);
            pc.close();
            resolve(true);
          }
        }
      };

      // 触发ICE收集
      pc.createDataChannel("connectivity-test");
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    } catch (error) {
      console.error("STUN测试失败:", error);
      resolve(false);
    }
  });
}

// 检测NAT类型
async function detectNatType(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      let natType = "未知";
      const timeout = setTimeout(() => {
        pc.close();
        resolve(natType);
      }, 5000);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;

          if (candidate.includes("srflx")) {
            // 服务器反射候选意味着设备在NAT后面
            const candidateParts = candidate.split(" ");
            const localIP = candidateParts[4];
            const publicIP = candidateParts[5];

            if (localIP === publicIP) {
              natType = "无NAT (开放互联网)";
            } else {
              natType = "NAT后 (类型需进一步测试)";
            }

            clearTimeout(timeout);
            pc.close();
            resolve(natType);
          }
        }
      };

      // 触发ICE收集
      pc.createDataChannel("nat-test");
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    } catch (error) {
      console.error("NAT检测失败:", error);
      resolve("检测失败");
    }
  });
}

// 格式化键名
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    webrtcSupport: "WebRTC基础支持",
    iceServerReachable: "STUN服务器可达",
    natType: "NAT类型",
    dataChannelSupport: "数据通道支持",
    signalingService: "信令服务状态",
    signalingPort: "信令服务端口",
    error: "错误",
  };

  return keyMap[key] || key;
}

// 格式化值
function formatValue(value: boolean | string): string {
  if (typeof value === "boolean") {
    return value ? "✅ 支持" : "❌ 不支持";
  }
  return String(value);
}

// 获取值的样式类
function getValueClass(value: boolean | string): string {
  if (typeof value === "boolean") {
    return value ? "text-green-600" : "text-red-600";
  }
  return "text-gray-700";
}
