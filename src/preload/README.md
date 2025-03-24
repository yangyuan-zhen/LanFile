# src/preload/README.md

## 概述

`src/preload` 目录包含 LanFile_PC 应用的 Electron 预加载脚本。预加载脚本在渲染进程加载之前执行，可以安全地访问 Node.js API 和 Electron API，同时为渲染进程提供功能而不暴露完整的 Node.js 环境。

## 目录结构

- **index.ts**: 主预加载脚本，暴露 API 给渲染进程
- **api/**: 包含各种 API 模块的目录
- **types/**: TypeScript 类型定义

## 技术原理

预加载脚本运行在具有以下特性的环境中：

- 可以访问 Node.js API
- 可以访问有限的 Electron API
- 通过上下文隔离提供安全的 API 暴露
- 使用 `contextBridge` 安全地将功能暴露给渲染进程

## 暴露的 API

预加载脚本通过 `contextBridge` 将以下 API 暴露给渲染进程：

### `window.electron`

```typescript
interface ElectronAPI {
  // IPC 通信
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;

  // 应用信息
  getAppVersion: () => string;
  getPlatform: () => string;

  // 系统功能
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => void;
  openPath: (path: string) => Promise<string>;
}
```

## IPC 通信

渲染进程通过预加载脚本提供的 API 与主进程通信：

```typescript
// 调用主进程方法
const result = await window.electron.invoke("channel-name", ...args);

// 监听主进程事件
window.electron.on("event-name", (event, ...args) => {
  // 处理事件
});

// 移除事件监听
window.electron.off("event-name", listener);
```

## 安全考虑

预加载脚本实现了以下安全措施：

1. **上下文隔离**: 通过 `contextIsolation: true` 确保预加载脚本和渲染进程使用不同的 JavaScript 上下文
2. **IPC 通道验证**: 验证所有 IPC 通道名称以防止注入攻击
3. **有限的 API 暴露**: 只暴露必要的功能，避免过度暴露系统能力
4. **沙盒化**: 支持渲染进程的沙盒化，限制能力

## 开发指南

### 添加新的 API

要向渲染进程添加新的 API，请遵循以下步骤：

1. 在 `src/preload/api` 目录中创建新的 API 模块
2. 在 `index.ts` 中导入并通过 `contextBridge` 暴露该 API
3. 更新 TypeScript 类型定义以反映新的 API
4. 在渲染进程中通过 `window.electron` 使用新 API

### 调试预加载脚本

1. 在开发模式下运行应用 (`npm run dev`)
2. 使用 Chrome DevTools 的 "Console" 标签页查看预加载脚本的日志
3. 可以在预加载脚本中设置断点进行调试

## 常见问题

1. **Q: 为什么我的 API 在渲染进程中不可用？**
   A: 确保 API 已通过 `contextBridge.exposeInMainWorld` 正确暴露，并且渲染进程中的类型定义正确。

2. **Q: 如何安全地暴露事件 API？**
   A: 使用通道名称验证和回调包装，防止恶意输入和内存泄漏。

3. **Q: 渲染进程为什么不能直接访问 Node.js API？**
   A: 这是 Electron 的安全模型设计，目的是防止恶意内容访问系统资源。预加载脚本提供了受控的 API 访问方式。

## 参考资源

- [Electron 预加载脚本文档](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
- [上下文隔离说明](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [安全建议](https://www.electronjs.org/docs/latest/tutorial/security)
