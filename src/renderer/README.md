# LanFile_PC 渲染器模块文档

## 1. 模块概述

渲染器模块（renderer）是 LanFile_PC 应用的核心前端部分，负责构建用户界面并与 Electron 主进程交互。该模块基于 React 和 TypeScript 构建，采用 Tailwind CSS 进行样式设计，实现了局域网内设备发现、文件传输、WebRTC 点对点通信等关键功能。渲染器模块通过组件化设计提供直观友好的用户体验，使用户能够轻松地在局域网内共享和传输文件。

## 2. 目录结构分析

```
src/renderer/
├── @types/                  # TypeScript 类型定义
│   └── electron.d.ts        # Electron API 接口定义
├── components/              # UI 组件
│   ├── common/              # 通用组件
│   │   ├── Button/          # 按钮组件
│   │   ├── Card/            # 卡片组件
│   │   ├── Dropdown/        # 下拉菜单组件
│   │   ├── Input/           # 输入框组件
│   │   ├── Logo/            # 徽标组件
│   │   ├── Modal/           # 模态框组件
│   │   ├── Progress/        # 进度条组件
│   │   ├── SearchBar/       # 搜索栏组件
│   │   ├── Section/         # 分区组件
│   │   └── SectionHeader/   # 分区标题组件
│   ├── DeviceScanner/       # 设备扫描相关组件
│   ├── diagnostics/         # 诊断工具组件
│   └── features/            # 功能性组件
│       └── CurrentTransfers/# 当前传输组件
├── hooks/                   # 自定义 React Hooks
├── pages/                   # 应用页面
│   └── Home/                # 主页面
└── App.tsx                  # 应用入口组件
```

## 3. 核心功能详解

### 3.1 设备扫描与发现

设备扫描功能通过 `DeviceScanner` 和 `RadarView` 组件实现，利用多种网络技术实现局域网内设备的自动发现：

- **雷达扫描效果**：通过 Canvas 实现视觉化的设备扫描界面，包括波纹动画和设备显示
- **设备列表管理**：自动发现局域网内的设备并显示其状态（在线/离线）
- **多视图模式**：支持雷达视图和列表视图两种设备展示方式
- **设备识别**：自动识别设备类型并显示对应图标（手机、平板、电脑等）

```typescript
const DeviceScanner: React.FC<DeviceScannerProps> = ({
  onDeviceFound,
  isScanning,
  onScanningChange,
}) => {
  // 设备扫描实现...
};
```

### 3.2 WebRTC 点对点通信

通过 WebRTC 技术实现设备间的直接通信：

- **连接建立**：支持 ICE 协商、信令交换，建立点对点连接
- **数据通道**：使用 WebRTC 数据通道传输文件和消息
- **连接诊断**：提供 WebRTC 连接诊断工具，检测 NAT 类型、STUN 服务器可达性等

```typescript
export const WebRTCDiagnostics = () => {
  // 提供 WebRTC 网络连接诊断功能...
};
```

### 3.3 文件传输功能

支持通过 WebRTC 数据通道实现设备间的直接文件传输：

- **传输进度显示**：实时显示文件传输进度、速度和剩余时间
- **多文件管理**：支持同时进行多个文件传输并显示各自状态
- **传输类型区分**：区分上传和下载任务，提供差异化显示

```typescript
export const CurrentTransfers: React.FC<CurrentTransfersProps> = ({
  transfers,
}) => {
  // 当前传输文件管理和显示...
};
```

### 3.4 用户界面组件

提供一系列通用 UI 组件，确保界面一致性和良好的用户体验：

- **基础控件**：按钮、输入框、卡片、进度条等
- **交互组件**：模态框、下拉菜单等
- **导航元素**：部分和分区组件

```typescript
const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  className = "",
}) => {
  // 按钮实现...
};
```

## 4. 技术实现

### 4.1 React 与 TypeScript

- **函数式组件**：采用 React 函数式组件和 Hooks 为主的开发模式
- **TypeScript 类型安全**：为所有组件、props 和 API 定义明确的接口类型
- **状态管理**：使用 React Hooks（useState, useEffect, useRef）管理组件状态

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}
```

### 4.2 Electron IPC 通信

通过预定义的 IPC 通道与 Electron 主进程进行通信：

- **API 调用**：调用主进程提供的各种功能，如文件系统操作、网络操作等
- **事件监听**：接收主进程触发的事件，如设备发现、文件传输进度等

```typescript
export interface IElectronAPI {
  invoke(channel: "heartbeat:getPort"): Promise<number>;
  invoke(channel: "settings:getDownloadPath"): Promise<string>;
  // 更多 IPC 方法...
  on(channel: string, listener: (...args: any[]) => void): void;
  off(channel: string, listener: (...args: any[]) => void): void;
}
```

### 4.3 WebRTC 实现

实现设备间的点对点通信和文件传输：

- **连接建立**：创建 RTCPeerConnection，交换 SDP 和 ICE 候选信息
- **数据通道**：使用 RTCDataChannel 进行设备间的数据传输
- **文件传输**：实现文件分块、发送、接收和重组等功能

```typescript
const sendFileViaWebRTC = async (file: File, peerId: string) => {
  try {
    let dataChannel = webrtc.dataChannels[peerId];
    if (!dataChannel) {
      const targetDevice = webrtc.connectedDevices.find(
        (device) => device.id === peerId
      );
      if (!targetDevice) {
        throw new Error("未找到目标设备");
      }
      dataChannel = await webrtc.connectToPeer(
        peerId,
        targetDevice.ip,
        targetDevice.port
      );
    }

    // 文件传输逻辑...
  } catch (error) {
    console.error("文件传输错误:", error);
  }
};
```

### 4.4 HTML5 Canvas 可视化

使用 Canvas API 实现设备扫描雷达视图的可视化效果：

- **动画效果**：使用 requestAnimationFrame 实现流畅的雷达扫描动画
- **设备显示**：以图形方式展示检测到的网络设备
- **交互响应**：支持设备点击和选择操作

```typescript
const drawRadar = (timestamp: number) => {
  // 计算旋转角度 - 每3秒完成一次完整旋转
  const angle = (elapsedTime / 3000) * (Math.PI * 2);

  drawRadarBackground(ctx, width, height);
  drawScanLine(ctx, width, height, angle);
  drawDevices(ctx, width, height, angle);

  // 动画循环...
};
```

## 5. 交互关系

### 5.1 与 Electron 主进程的交互

- **文件操作**：调用主进程的文件系统 API 进行文件读写操作
- **网络服务**：通过主进程的网络服务进行设备发现、心跳检测等
- **系统信息**：获取主进程提供的系统和网络信息

```typescript
await window.electron.invoke("file:saveDownloadedFile", {
  url: string,
  fileName: string,
  fileType: string,
});
```

### 5.2 与其他设备的交互

- **设备发现**：通过 mDNS 和 UDP 广播发现局域网内的设备
- **连接建立**：通过 WebRTC 与其他设备建立点对点连接
- **数据传输**：通过 WebRTC 数据通道进行文件和消息的传输

```typescript
const handleDeviceFound = (device: Device) => {
  setFoundDevices((prev) => {
    if (prev.some((d) => d.id === device.id)) return prev;
    return [...prev, device];
  });
  onDeviceFound?.(device);
};
```

## 6. 优化方向

### 6.1 性能优化

- **大文件传输**：优化大文件传输性能，实现分块传输和断点续传
- **设备扫描**：改进设备扫描算法，减少网络负载和提高扫描速度
- **资源占用**：优化 Canvas 渲染和动画效果，降低 CPU 使用率

### 6.2 用户体验改进

- **界面优化**：改进文件传输进度显示，提供更直观的传输状态反馈
- **多设备选择**：支持同时向多个设备发送文件
- **拖放支持**：实现文件拖放上传功能

### 6.3 功能扩展

- **文件预览**：添加常见文件类型的预览功能
- **文件夹传输**：支持整个文件夹的传输
- **传输历史**：记录并显示文件传输历史
- **设备分组**：支持设备分组和自定义设备名称

### 6.4 安全性提升

- **端到端加密**：为文件传输添加端到端加密功能
- **传输验证**：添加设备验证和传输确认机制
- **权限控制**：实现更细粒度的文件共享权限控制

---

## 总结

LanFile_PC 的渲染器模块是一个功能丰富的前端界面，通过 React 和 Electron 技术栈实现了直观、高效的局域网文件共享功能。它不仅提供了美观的用户界面，还通过 WebRTC 技术实现了高效的点对点文件传输。未来的优化方向主要集中在性能提升、用户体验改进和功能扩展上，以满足更多样化的文件共享需求。
