# LanFile_PC 项目主进程模块分析

## 主进程目录结构分析

`src/main` 目录包含了 Electron 应用的主进程代码，主要负责与操作系统交互、管理窗口以及提供 IPC 通信功能。以下是主要文件及其功能分析：

### 核心文件

#### `index.ts`

- **主入口文件**：初始化应用、创建主窗口、设置 IPC 处理程序
- **应用生命周期管理**：处理应用启动、关闭等事件
- **全局服务初始化**：启动网络服务、信令服务等核心服务

#### 网络通信相关文件

- **`network.ts`**：处理网络连接测试、UDP 通信等底层网络功能
- **`signaling.ts`**：实现 WebSocket 信令服务，处理设备间通信和连接初始化
- **`webrtc.ts`**：处理 WebRTC 相关功能，实现点对点文件传输
- **`mdns.ts`**：负责局域网内设备的自动发现

### 服务模块 (`services` 目录)

#### 核心服务

- **`MDNSService.ts`**：基于 Bonjour 的服务发现，用于自动发现局域网内的设备
- **`WebSocketSignalingService.ts`**：实现信令服务器功能，处理设备之间的消息传递
- **`HeartbeatService.ts`**：心跳检测服务，维持设备之间的连接状态
- **`NetworkService.ts`**：提供网络层通信功能，支持 UDP 广播发现等功能

#### 辅助服务

- **`LogService.ts`**：日志服务，记录应用运行时信息
- **`DirectIPService.ts`**：直接 IP 连接服务，提供 TCP 连接功能
- **`ZeroconfService.ts`**：零配置网络服务，简化设备发现
- **`api.ts`**：HTTP 请求处理服务

### 其他辅助文件

- **`store/index.ts`**：应用配置存储，基于 electron-store
- **`types/global.d.ts`** 和 **`types.d.ts`**：全局类型定义

## 主进程核心功能

### 1. 设备发现机制

应用使用多种方式实现设备发现：

- **MDNS/Bonjour**：零配置网络服务发现协议
- **UDP 广播**：通过网络广播发现设备
- **WebSocket 信令服务器**：维护连接的设备列表

### 2. 文件传输实现

- **WebRTC 数据通道**：点对点高效传输
- **直接 TCP/IP 连接**：作为备选传输方式
- **分块传输**：支持大文件的分块传输

### 3. 连接管理

- **心跳检测**：定期检查设备在线状态
- **自动重连**：断线自动重连机制
- **防火墙配置**：自动处理端口访问权限

### 4. 安全性考虑

- 实现了端口动态分配，避免端口冲突
- 在文件传输前进行连接检测
- 提供设备验证机制

## 技术栈优势

- **WebRTC**：点对点直接传输，减少服务器依赖
- **多重发现机制**：增强设备发现的稳健性
- **可配置架构**：支持多种传输方式和配置选项

## 潜在优化方向

1. 增强设备离线检测的精确性
2. 优化大文件传输的内存使用
3. 改进信令服务的鲁棒性，处理更多边缘情况
4. 添加数据加密层，提高传输安全性
5. 实现传输速度自适应算法

## 性能优化策略

### 1. 文件传输优化

- **流式传输**：

  ```typescript
  const streamFile = async (filePath: string) => {
    const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
    // 使用合适的缓冲区大小，避免内存占用过高
  };
  ```

- **并行传输控制**：
  ```typescript
  const MAX_CONCURRENT_TRANSFERS = 3;
  const transferQueue = new TransferQueue(MAX_CONCURRENT_TRANSFERS);
  ```

### 2. 内存管理

- **资源释放机制**：及时清理不再使用的连接和监听器
- **垃圾回收优化**：避免频繁的小对象创建
- **缓存策略**：实现智能缓存机制，避免重复计算

### 3. 网络优化

- **连接池管理**：

  ```typescript
  interface ConnectionPool {
    maxConnections: number;
    idleTimeout: number;
    retryStrategy: RetryStrategy;
  }
  ```

- **自适应传输速率**：根据网络状况动态调整传输速率
- **断点续传支持**：支持传输中断后的续传功能

## 错误处理机制

### 1. 全局错误捕获

```typescript
process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常:", error);
  // 执行清理操作
  cleanup();
});

process.on("unhandledRejection", (reason) => {
  logger.error("未处理的 Promise 拒绝:", reason);
});
```

### 2. 错误恢复策略

- **自动重试机制**：网络错误自动重试
- **优雅降级**：在某些功能不可用时提供备选方案
- **状态恢复**：应用重启后恢复之前的传输任务

## 监控与日志

### 1. 性能监控

- CPU 和内存使用情况
- 网络连接状态
- 文件传输速度和成功率

### 2. 日志记录

```typescript
interface LogConfig {
  level: "debug" | "info" | "warn" | "error";
  rotation: {
    maxSize: string;
    maxFiles: number;
  };
  format: LogFormat;
}
```

## 未来规划

1. **传输协议优化**

   - 实现自定义传输协议
   - 支持更多传输方式（如 QUIC）

2. **安全增强**

   - 端到端加密
   - 设备认证机制升级
   - 传输完整性校验

3. **用户体验改进**

   - 传输队列管理优化
   - 更直观的传输进度展示
   - 智能传输模式选择

4. **跨平台兼容性**
   - 改进在不同操作系统上的性能
   - 统一的用户体验
