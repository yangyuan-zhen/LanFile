# 共享模块文档

## 模块概述

共享模块包含了在主进程和渲染进程之间共享的代码，包括类型定义、工具函数、常量和配置等。这些代码需要保持简洁和纯函数特性，避免引入进程相关的依赖。

## 目录结构

```
shared/
├── constants/              # 常量定义
│   ├── events.ts          # 事件常量
│   ├── ipc.ts            # IPC 通道常量
│   └── config.ts         # 配置常量
├── types/                 # 类型定义
│   ├── device.ts         # 设备相关类型
│   ├── file.ts           # 文件相关类型
│   └── transfer.ts       # 传输相关类型
├── utils/                 # 工具函数
│   ├── format.ts         # 格式化工具
│   ├── validation.ts     # 验证工具
│   └── crypto.ts         # 加密工具
└── config/               # 配置文件
    ├── network.ts        # 网络配置
    └── storage.ts        # 存储配置
```

## 类型定义

### 设备类型

```typescript
interface Device {
  id: string; // 设备唯一标识
  name: string; // 设备名称
  ip: string; // IP 地址
  platform: Platform; // 操作系统平台
  version: string; // 应用版本
  status: DeviceStatus; // 设备状态
}

type Platform = "windows" | "macos" | "linux";
type DeviceStatus = "online" | "offline" | "busy";
```

### 传输类型

```typescript
interface TransferTask {
  id: string; // 传输任务 ID
  type: TransferType; // 传输类型
  files: FileInfo[]; // 文件信息
  source: Device; // 源设备
  target: Device; // 目标设备
  status: TransferStatus; // 传输状态
  progress: number; // 传输进度
  speed: number; // 传输速度
  startTime: number; // 开始时间
}

type TransferType = "send" | "receive";
type TransferStatus =
  | "pending"
  | "transferring"
  | "completed"
  | "failed"
  | "cancelled";
```

## 工具函数

### 格式化工具

```typescript
// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 传输速度格式化
export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};
```

### 验证工具

```typescript
// IP 地址验证
export const isValidIP = (ip: string): boolean => {
  const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!pattern.test(ip)) return false;

  return ip.split(".").every((num) => {
    const n = parseInt(num, 10);
    return n >= 0 && n <= 255;
  });
};

// 文件名验证
export const isValidFileName = (name: string): boolean => {
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  return !invalidChars.test(name);
};
```

## 常量定义

### IPC 通道

```typescript
export const IPC_CHANNELS = {
  FILE_TRANSFER: {
    SEND_REQUEST: "file:send-request",
    RECEIVE_REQUEST: "file:receive-request",
    PROGRESS: "file:progress",
    COMPLETE: "file:complete",
    ERROR: "file:error",
  },
  DEVICE: {
    DISCOVER: "device:discover",
    UPDATE: "device:update",
    REMOVE: "device:remove",
  },
} as const;
```

### 配置常量

```typescript
export const CONFIG = {
  NETWORK: {
    DISCOVERY_PORT: 45678,
    TRANSFER_PORT: 45679,
    BROADCAST_INTERVAL: 5000,
    CONNECTION_TIMEOUT: 30000,
  },
  TRANSFER: {
    CHUNK_SIZE: 64 * 1024, // 64KB
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    MAX_CONCURRENT: 3,
  },
} as const;
```

## 最佳实践

1. **类型安全**

   - 使用 TypeScript 的严格模式
   - 为所有导出的函数和变量定义类型
   - 使用常量断言确保类型推断准确

2. **代码复用**

   - 将常用功能抽象为工具函数
   - 保持函数纯净，避免副作用
   - 使用组合优于继承

3. **性能考虑**

   - 优化频繁使用的工具函数
   - 合理使用缓存机制
   - 避免不必要的计算和对象创建

4. **可维护性**
   - 保持代码结构清晰
   - 添加适当的注释和文档
   - 遵循一致的命名规范
