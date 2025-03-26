# LanFile_PC 主进程服务模块文档

## 1. 模块概述

`src/main/services` 目录包含了 LanFile_PC 应用的核心服务模块集合，这些服务运行在 Electron 主进程中，负责处理网络通信、设备发现、文件传输和系统集成等关键功能。服务模块采用模块化设计，每个服务专注于特定功能领域，通过事件驱动模式和进程间通信（IPC）与渲染进程交互，为应用提供强大的后端支持。

这些服务共同构成了 LanFile_PC 的网络功能基础架构，使应用能够在局域网环境中自动发现设备、建立点对点连接、传输文件，并提供可靠的错误处理和日志记录机制。

## 2. 目录结构分析

### 2.1 核心服务文件

| 文件名                             | 主要功能                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| **`api.ts`**                       | HTTP 请求处理服务，管理应用中的网络请求                  |
| **`DirectIPService.ts`**           | 提供直接 TCP 连接服务，用于设备间高效数据传输            |
| **`HeartbeatService.ts`**          | 心跳检测服务，负责设备状态监控和可用性检测               |
| **`LogService.ts`**                | 日志服务，提供统一的日志记录和管理功能                   |
| **`MDNSService.ts`**               | 基于 Bonjour/mDNS 的设备发现服务，用于自动发现局域网设备 |
| **`NetworkService.ts`**            | 网络服务，提供网络连接测试和设备可达性检测               |
| **`WebSocketSignalingService.ts`** | WebSocket 信令服务，实现设备间实时通信和连接协商         |
| **`ZeroconfService.ts`**           | Zeroconf 协议封装服务，简化零配置网络服务发现            |

### 2.2 接口和类型定义

各服务模块定义了多个接口类型，如：

- `MDNSDevice` - mDNS 发现的设备信息
- `NetworkDevice` - 网络设备信息
- `SignalingMessage` - WebSocket 信令消息格式

## 3. 核心功能详解

### 3.1 设备发现机制

LanFile_PC 实现了多重设备发现机制，确保在不同网络环境下都能可靠发现设备：

#### mDNS/Bonjour 服务发现 (`MDNSService.ts`)

```typescript
// 发布本地服务，使其他设备可发现
publishService(): void {
    this.service = this.bonjour.publish({
        name: deviceName,
        type: this.SERVICE_TYPE,
        port: this.SERVICE_PORT,
        txt: {
            appVersion: app.getVersion(),
            deviceType: 'desktop',
            os: process.platform,
            heartbeatPort: heartbeatService.getPort().toString()
        }
    });
}

// 发现其他设备
startDiscovery(): void {
    this.browser = this.bonjour.find({ type: this.SERVICE_TYPE });

    this.browser.on('up', (service: any) => {
        // 处理新发现的设备
        this.emit('deviceFound', device);
    });
}
```

#### 网络广播发现 (`NetworkService.ts`)

```typescript
public startDiscovery(): void {
    const message = Buffer.from(JSON.stringify({
        type: 'lanfile-discover'
    }));

    this.socket?.setBroadcast(true);
    this.socket?.send(message, 0, message.length, this.servicePort, '255.255.255.255');
}
```

### 3.2 设备状态检测

#### 心跳服务 (`HeartbeatService.ts`)

提供 HTTP 端点，响应设备状态查询请求：

```typescript
this.server = createServer((req, res) => {
  if (req.url === "/lanfile/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "online",
        version: process.env.APP_VERSION || "1.0.0",
        timestamp: Date.now(),
      })
    );
  }
});
```

#### TCP 端口检测 (`NetworkService.ts`)

```typescript
async function checkTcpConnection(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = require("net").Socket();
    socket.setTimeout(2000);

    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, ip);
  });
}
```

### 3.3 实时通信功能

#### WebSocket 信令服务 (`WebSocketSignalingService.ts`)

提供设备间的实时通信通道：

```typescript
// 建立 WebSocket 服务器
const server = new WebSocketServer({
    port,
    perMessageDeflate: {
        // 压缩配置...
    },
    maxPayload: 50 * 1024 * 1024
});

// 消息转发
public sendToDevice(deviceId: string, message: SignalingMessage): boolean {
    if (!this.connections.has(deviceId)) {
        return false;
    }

    const connection = this.connections.get(deviceId);
    connection?.send(JSON.stringify(message));
    return true;
}
```

### 3.4 文件操作与传输

#### 直接 TCP 连接 (`DirectIPService.ts`)

提供设备间的直接 TCP 连接，用于高效数据传输：

```typescript
public start(): Promise<number> {
    return new Promise((resolve, reject) => {
        this.server = net.createServer((socket) => {
            // 处理新连接
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            resolve(this.port);
        });
    });
}
```

### 3.5 日志系统

#### 日志服务 (`LogService.ts`)

提供统一的日志记录接口，覆盖原生 console 方法：

```typescript
setupConsole() {
    const originalConsoleLog = console.log;

    console.log = (...args) => {
        // 原始输出
        originalConsoleLog.apply(console, args);
        // 写入文件日志
        this.writeLog('info', args);
    };

    // 同样处理 console.error 和 console.warn
}

private writeLog(level: string, args: any[]) {
    const logFile = path.join(this.logPath, `${new Date().toISOString().split('T')[0]}.log`);
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    fs.appendFileSync(
        logFile,
        `[${timestamp}] [${level.toUpperCase()}] ${message}\n`,
        { encoding: 'utf8' }
    );
}
```

## 4. 技术实现

### 4.1 事件驱动架构

服务模块广泛采用 Node.js 的 `EventEmitter` 模式，实现松耦合的组件通信：

```typescript
export class MDNSService {
  private eventListeners: { [key: string]: Function[] } = {};

  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  private emit(event: string, ...args: any[]): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((callback) => callback(...args));
  }
}
```

### 4.2 单例模式

大多数服务使用单例模式，确保全局只有一个服务实例：

```typescript
// HeartbeatService.ts
export const heartbeatService = new HeartbeatService();
export default heartbeatService;

// WebSocketSignalingService.ts
export const webSocketSignalingService = new WebSocketSignalingService();

// ZeroconfService.ts
export const zeroconfService = ZeroconfService.getInstance();
```

### 4.3 自动端口管理

服务模块实现了智能端口管理，自动处理端口冲突：

```typescript
// 在 HeartbeatService 中
this.server.on("error", (error: any) => {
  if (error.code === "EADDRINUSE") {
    console.log(`端口 ${this.port} 已被占用，尝试使用 ${this.port + 1}`);
    this.port++;
    this.setupServer(); // 尝试使用下一个端口
  }
});

// 在 WebSocketSignalingService 中
if (error.code === "EADDRINUSE") {
  logService.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
  // 递增端口并重试
  tryStartServer(port + 1, maxRetries, retryCount + 1);
}
```

### 4.4 错误处理与重试机制

服务实现了健壮的错误处理和自动重连机制：

```typescript
// 在 WebSocketSignalingService 中
private setupAutoReconnect(): void {
    this.on('deviceDisconnected', (deviceId: string) => {
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(deviceId) && this.serverInitiatedConnections.has(deviceId)) {
            console.log(`服务器初始连接的设备 ${deviceId} 断开，尝试重连...`);
            // 重连逻辑...
        }
    });
}

private shouldAttemptReconnect(deviceId: string): boolean {
    const status = this.connectionStatus.get(deviceId);
    if (!status) return true;

    // 如果30秒内已经尝试了3次以上，暂停重连
    if (status.reconnectAttempts > 3 &&
        (Date.now() - status.lastConnected) < 30000) {
        return false;
    }

    return true;
}
```

## 5. 交互关系

### 5.1 服务间交互

服务模块之间存在多种依赖和交互关系：

- **`HeartbeatService` → `MDNSService`**：心跳服务提供端口给 MDNSService 公布
- **`LogService` → 所有其他服务**：所有服务使用统一的日志功能
- **`NetworkService` → `WebSocketSignalingService`**：网络服务检测设备连接状态，为信令服务提供支持
- **`DirectIPService` ↔ `WebSocketSignalingService`**：信令服务可用于协商建立直接 TCP 连接

### 5.2 与渲染进程的交互

服务通过 Electron 的 IPC 机制与渲染进程交互：

```typescript
// api.ts
export function setupHttpHandlers() {
  ipcMain.handle("http:request", async (_, options) => {
    // 处理 HTTP 请求
  });
}

// NetworkService.ts
export const registerNetworkHandlers = () => {
  ipcMain.handle("network:pingDevice", async (_event, ip, port) => {
    // 处理设备检测请求
  });

  ipcMain.handle("device:ping", async (_event, ip, port) => {
    // 处理设备状态检查
  });
};
```

### 5.3 与外部系统的交互

服务与外部系统和网络资源交互：

- **网络协议**：TCP、UDP、HTTP、WebSocket
- **系统资源**：文件系统（日志文件）、网络接口
- **第三方库**：Bonjour、WebSocket、Node.js 核心模块

## 6. 优化方向

### 6.1 性能优化

- **消息处理效率**：优化 WebSocket 消息处理，减少 JSON 解析/序列化开销
- **连接池管理**：实现更高效的连接池机制，减少连接建立开销
- **资源使用优化**：优化内存使用，避免大文件传输时的内存溢出问题

### 6.2 可靠性提升

- **连接恢复机制**：增强断线重连机制，支持会话恢复
- **传输验证**：添加文件传输完整性验证
- **NAT 穿透**：改进 P2P 连接的 NAT 穿透能力，特别是在复杂网络环境中

### 6.3 安全性增强

- **传输加密**：实现端到端加密传输，保护数据安全
- **设备认证**：添加设备互相认证机制，防止未授权设备连接
- **安全日志**：增强日志系统的安全性，敏感信息脱敏处理

### 6.4 功能扩展

- **多通道传输**：支持多通道并行传输，提高传输速度
- **断点续传**：实现大文件断点续传功能
- **带宽控制**：添加传输速度限制功能，避免影响其他网络应用
- **传输队列**：实现优先级传输队列，支持重要文件优先传输

### 6.5 测试和监控

- **服务健康监控**：添加服务状态监控和统计功能
- **自动化测试**：增加自动化测试覆盖，提高代码质量
- **性能分析**：实现性能指标收集和分析，辅助优化决策

## 7. 设备标识规范

为确保设备识别的一致性和可靠性，LanFile_PC 采用以下设备标识规范：

### 7.1 设备 ID 格式

- **主要标识符**: 设备 IP 地址（格式: `x.x.x.x`）
- **辅助标识符**: 设备名称（用于显示，不用于内部识别）
- **复合显示**: 在 UI 中可显示为"设备名称 (IP 地址)"

### 7.2 标识符使用规范

- **连接建立**: 仅使用 IP 地址作为连接标识符
- **设备查询**: 优先使用 IP 地址进行设备查询
- **设备存储**: 设备缓存使用 IP 地址作为主键
- **设备展示**: 使用设备名称+IP 地址的方式友好展示

这种规范确保了设备识别的唯一性和连接的可靠性，避免了因混合使用不同标识符而导致的连接问题。

## 总结

LanFile_PC 的服务模块构成了应用的核心后端功能，通过多种网络技术和精心设计的架构，实现了高效、可靠的局域网文件传输能力。这些模块采用事件驱动和模块化设计，具有良好的可维护性和扩展性。未来的优化方向主要集中在性能、可靠性、安全性和功能扩展方面，以提供更优质的用户体验。
