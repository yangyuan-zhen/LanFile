# src/main/services 服务文档

## 概述

`src/main/services` 目录包含 LanFile_PC 应用的 Electron 主进程服务模块。这些服务负责处理系统级别的操作，如网络通信、设备发现、文件操作和日志记录等，通过 IPC（进程间通信）向渲染进程提供功能。

## 服务模块

### api.ts

HTTP 请求处理服务，管理应用中的 HTTP 请求。

**主要功能**:

- HTTP 请求发送与处理 (`http:request`)
- 状态检测请求的特殊处理

### DirectIPService.ts

提供直接 TCP 连接服务，用于设备间的直接通信。

**主要功能**:

- 创建 TCP 服务器
- 管理与远程设备的 TCP 连接
- 通过 TCP 连接发送数据

### HeartbeatService.ts

心跳服务，提供设备状态检测功能。

**主要功能**:

- 创建 HTTP 服务器响应状态检测请求
- 返回设备在线状态和版本信息
- 自动端口冲突处理

### LogService.ts

日志服务，管理应用日志记录。

**主要功能**:

- 替换原生 console.log 和 console.error
- 将日志写入文件系统
- 提供统一的日志记录接口

**日志文件位置**:
日志文件存储在用户数据目录下的 logs 文件夹中，而非项目根目录：

- Windows: `C:\Users\用户名\AppData\Roaming\应用名称\logs`
- macOS: `/Users/用户名/Library/Application Support/应用名称/logs`
- Linux: `~/.config/应用名称/logs`

日志按日期命名（YYYY-MM-DD.log），并自动清理超过指定天数（默认 7 天）的旧日志文件。

### MDNSService.ts

基于 mDNS 协议的设备发现服务。

**主要功能**:

- 发布本地设备服务
- 发现局域网内其他设备
- 管理设备上线和离线事件

### NetworkService.ts

网络服务，处理网络连接和设备可达性检测。

**主要功能**:

- TCP/UDP 端口测试
- 设备可达性检测 (`network:pingDevice`, `device:ping`)
- 发布和发现网络服务

### WebSocketSignalingService.ts

WebSocket 信令服务，用于设备间实时通信和连接协商。

**主要功能**:

- 创建 WebSocket 服务器
- 管理设备连接和消息转发
- 提供设备间的实时通信
- 设备状态监控与重连机制

### ZeroconfService.ts

Zeroconf/Bonjour 协议封装服务。

**主要功能**:

- 局域网设备扫描
- 服务发布与取消

## 使用方式

主进程服务通过 IPC 通道向渲染进程暴露功能。渲染进程通过 `window.electron.invoke` 和 `window.electron.on` 方法调用这些服务：

```typescript
// 调用示例 (渲染进程)
const result = await window.electron.invoke("network:pingDevice", host, port);

// 事件监听示例 (渲染进程)
window.electron.on("zeroconf:deviceFound", (device) => {
  // 处理新发现的设备
});
```

## 服务交互

服务之间的交互关系：

- **HeartbeatService**: 提供设备状态检测接口，供其他设备调用
- **MDNSService**: 使用 Bonjour 服务进行设备发现，同时公开心跳服务端口
- **WebSocketSignalingService**: 为设备间通信建立持久连接
- **DirectIPService**: 提供直接 TCP 连接，用于高带宽数据传输
- **LogService**: 被所有其他服务使用，提供日志记录功能

## 注意事项

1. 所有主进程服务应考虑错误处理和超时机制
2. 网络相关操作应实现适当的重试策略
3. 长时间运行的操作应提供取消机制
4. 服务之间应保持低耦合，便于维护和测试
5. 重要操作应记录日志以便调试

## 开发指南

向主进程服务添加新功能时，请遵循以下步骤：

1. 在适当的服务模块中实现功能
2. 通过 IPC 注册处理程序
3. 在渲染进程服务中添加对应的调用方法
4. 添加适当的错误处理和日志记录
5. 更新此文档，记录新增功能
