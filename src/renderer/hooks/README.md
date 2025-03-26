# LanFile_PC Hooks 模块文档

## 1. 模块概述

Hooks 模块是 LanFile_PC 应用的核心功能层，提供了一系列 React 自定义 Hook，用于处理设备通信、文件传输和网络管理等关键功能。该模块基于 React Hooks API 构建，实现了设备发现、WebRTC 通信、文件传输队列管理等功能，为应用提供了完整的局域网文件传输基础设施。

模块主要聚焦于解决以下关键问题：

- 局域网内设备自动发现与状态跟踪
- 建立可靠的点对点连接
- 高效的文件传输机制
- 优雅的错误处理和回退机制

## 2. 目录结构分析

```
src/renderer/hooks/
├── useDeviceInfo.ts        # 管理本地设备信息
├── useFileTransfer.ts      # 文件传输核心逻辑
├── useFileTransfers.ts     # 文件传输队列管理
├── useNetworkDevices.ts    # 网络设备发现与管理
├── useNetworkInfo.ts       # 本地网络信息获取与监控
├── useWebRTC.ts            # WebRTC 连接管理
├── useWebRTCSignaling.ts   # WebRTC 信令服务
└── useWebRTCWithSignaling.ts # WebRTC 与信令整合封装
```

## 3. 核心功能详解

### 3.1 设备信息管理 (useDeviceInfo)

`useDeviceInfo` Hook 用于获取并管理本地设备的基本信息：

```typescript
interface DeviceInfo {
  id: string; // 设备唯一标识符
  name: string; // 设备名称（用户可见）
  ip?: string; // 设备 IP 地址
  port?: number; // 通信端口
}
```

主要功能：

- 从操作系统获取设备名称
- 生成或检索持久化的设备 ID
- 在网络环境变化时自动更新设备信息
- 提供默认值以确保系统稳定性

### 3.2 网络设备发现 (useNetworkDevices)

`useNetworkDevices` 实现了基于 mDNS 的设备发现机制，支持：

- 自动扫描局域网内的可用设备
- 缓存设备信息以提高性能
- 使用心跳检测判断设备在线状态
- 管理自定义设备名称
- 处理设备加入和离开事件

```typescript
interface NetworkDevice {
  name: string; // 设备名称
  type: DeviceType; // 设备类型（如移动设备、笔记本等）
  icon: React.ComponentType; // 设备图标
  status: DeviceStatus; // 设备状态（在线、离线等）
  ip: string; // IP 地址
  port: number; // 通信端口
  lastSeen?: number; // 最后一次检测到的时间戳
  stableConnectionCount?: number; // 稳定连接计数
}
```

核心实现：

- 并发设备状态检查，限制并发数以避免网络拥堵
- 对稳定设备使用动态间隔检查策略，提高效率
- 使用本地存储缓存设备信息

### 3.3 文件传输管理 (useFileTransfer 和 useFileTransfers)

文件传输系统由两个 Hook 组成：

**useFileTransfer**：

- 通过 WebRTC 数据通道发送文件
- 实现自动重连和等待连接建立功能
- 提供基于 IP 的传输回退方案

**useFileTransfers**：

- 管理传输队列和状态
- 跟踪传输进度、速度和剩余时间
- 支持上传和下载方向的传输

```typescript
interface FileTransfer {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  transferredSize: number;
  speed: string;
  direction: "upload" | "download";
  sourceDevice?: string;
  targetDevice?: string;
  progress: number;
  timeRemaining: string;
}
```

### 3.4 WebRTC 通信 (useWebRTC, useWebRTCSignaling 和 useWebRTCWithSignaling)

WebRTC 通信系统由三个相互依赖的 Hook 组成：

**useWebRTCSignaling**：

- 负责初始化和管理信令服务
- 处理设备连接和断开事件
- 发送信令消息（offer、answer、ICE 候选项）

**useWebRTC**：

- 创建和管理 RTCPeerConnection
- 处理数据通道通信
- 实现文件分块传输逻辑

**useWebRTCWithSignaling**：

- 整合信令服务和 WebRTC 功能
- 简化连接建立流程
- 提供更高级的错误处理

关键功能：

- 创建和配置 RTCPeerConnection
- 处理 ICE 候选项收集和交换
- 设置数据通道和传输监听器
- 实现断开连接和资源清理

## 4. 技术实现

### 4.1 设备发现

设备发现采用多层策略：

1. mDNS 自动发现 (首选方法)
2. 缓存设备记录 (快速启动)
3. 心跳检测 (保持设备状态更新)

关键实现：

```typescript
// mDNS 设备发现实现
window.electron
  .invoke("mdns:startDiscovery")
  .then(() => console.log("MDNS发现服务已启动"))
  .catch((err) => console.error("启动MDNS发现服务失败:", err));

// 心跳检测实现
const isOnline = await window.electron.invoke(
  "heartbeat:checkDevice",
  device.ip,
  heartbeatPort
);
```

### 4.2 WebRTC 通信

WebRTC 连接建立流程：

1. 通过信令服务交换 offer/answer
2. 收集并交换 ICE 候选项
3. 建立对等连接
4. 创建和配置数据通道

```typescript
// 创建并发送 offer
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
await window.electron.invoke("webrtc:sendOffer", {
  toPeerId: peerId,
  offer: peerConnection.localDescription,
});

// 处理 answer
await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
```

### 4.3 文件传输

文件传输实现了分块策略：

1. 将文件拆分成适当大小的块
2. 每个块前附加传输标识
3. 通过数据通道传输
4. 接收端重组文件数据

```typescript
// 文件分块处理示例
const buffer = new Uint8Array(data);
const idLength = buffer[0];
const transferId = new TextDecoder().decode(buffer.slice(1, idLength + 1));
const chunk = buffer.slice(idLength + 1);

// 追加到文件缓冲区
const existingBuffer = fileChunksRef.current[transferId] || new ArrayBuffer(0);
const newBuffer = new Uint8Array(existingBuffer.byteLength + chunk.byteLength);
newBuffer.set(new Uint8Array(existingBuffer), 0);
newBuffer.set(chunk, existingBuffer.byteLength);
fileChunksRef.current[transferId] = newBuffer.buffer;
```

## 5. 交互关系

### 5.1 与 Electron 主进程交互

Hooks 通过 `window.electron` API 与 Electron 主进程通信：

```typescript
// 示例：获取设备名称
const name = await window.electron.invoke("system:getDeviceName");

// 示例：启动 mDNS 发现
await window.electron.invoke("mdns:startDiscovery");

// 示例：监听设备发现事件
window.electron.on("mdns:deviceFound", handleDeviceFound);
```

### 5.2 Hook 之间的关系

Hooks 之间存在明确的依赖关系：

- `useWebRTCWithSignaling` 依赖 `useWebRTCSignaling` 和 `useDeviceInfo`
- `useNetworkDevices` 依赖 `useNetworkInfo` 和 `useDeviceInfo`
- `useFileTransfer` 依赖于数据通道建立

### 5.3 与组件层的关系

Hooks 为组件提供数据和方法：

- 组件通过 Hook 获取设备列表
- 组件通过 Hook 提供的方法发起文件传输
- Hook 维护状态，组件负责渲染用户界面

## 6. 优化方向

### 6.1 性能优化

- **并发控制**：优化并发设备扫描，减轻网络负担

  ```typescript
  // 当前实现有限制并发数为5
  const concurrentCheck = async (devices, concurrency = 5) => {
    // ...
  };
  ```

- **缓存策略**：改进设备信息缓存，减少不必要的扫描
  ```typescript
  // 可以改进缓存策略，例如增加失效时间判断
  const loadCachedDevices = () => {
    // 添加时间检查，仅加载最近的缓存
  };
  ```

### 6.2 可靠性增强

- **连接恢复机制**：添加自动重连逻辑

  ```typescript
  // 检测连接断开时自动尝试重连
  const reconnectToPeer = (peerId) => {
    // 实现重连逻辑
  };
  ```

- **传输失败恢复**：增加断点续传功能
  ```typescript
  // 传输恢复功能
  const resumeTransfer = (transferId, offset) => {
    // 实现从指定位置恢复传输
  };
  ```

### 6.3 功能扩展

- **设备分组**：添加设备分组和标签功能
- **传输优先级**：实现传输任务优先级队列
- **加密传输**：添加端到端加密选项
- **多路径传输**：实现同时使用多种传输方式提高速率

### 6.4 代码质量改进

- **错误处理**：完善错误捕获、日志和恢复流程
- **类型安全**：增强类型定义，特别是对 WebRTC 相关类型
- **测试覆盖**：添加单元测试和集成测试

以上优化方向将进一步提高 LanFile_PC 应用的稳定性、性能和用户体验。

# Hooks 说明

## usePeerJS

此 hook 使用 PeerJS 库提供 WebRTC 文件传输功能，替代了之前自定义的 WebRTC 实现。

### 主要特性

- 简化的 P2P 连接建立
- 文件发送和接收
- 传输进度跟踪
- 错误处理

### 使用方法

```typescript
import { usePeerJS } from "../hooks/usePeerJS";

// 在组件中
const { isReady, connectToPeer, sendFile, transfers } = usePeerJS();

// 连接到设备
await connectToPeer(deviceIp);

// 发送文件
await sendFile(deviceIp, fileObject);
```

### 配置说明

当前配置为纯局域网 P2P 模式，无需中央服务器。如需更改，可修改`usePeerJS.ts`中的 Peer 实例创建部分。
