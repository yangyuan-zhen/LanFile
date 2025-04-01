# CurrentTransfers 模块文档

## 模块概述

CurrentTransfers 模块是 LanFile_PC 应用程序中的核心组件，负责展示和管理本地网络中的文件传输任务。该模块提供了实时的文件传输进度监控、传输状态显示和交互功能，支持上传和下载操作，并能够直观地展示传输速度、剩余时间等信息。作为用户与文件传输系统交互的主要界面，该模块在应用程序中扮演着至关重要的角色。

## 目录结构分析

```
src/renderer/components/features/CurrentTransfers/
├── CurrentTransfers.tsx  // 主组件，管理文件传输列表
├── TransferItem.tsx      // 子组件，渲染单个传输项
└── ... (可能包含其他辅助组件)
```

### 文件功能说明

- **CurrentTransfers.tsx**: 负责管理整体传输列表，处理传输事件监听，合并传输数据，过滤和排序传输任务，提供传输统计信息。
- **TransferItem.tsx**: 负责单个传输项的渲染，包括进度条显示、传输速度和状态更新，以及提供文件操作功能（如打开文件、打开文件夹等）。

## 核心功能详解

### 1. 传输监控与显示

- **实时进度监控**: 通过定期刷新和事件监听机制实时更新传输进度。
- **传输状态显示**: 清晰展示传输状态（准备中、传输中、已完成、失败）。
- **传输统计**: 显示活动传输和已完成传输的数量统计。

### 2. 传输项管理

- **传输列表过滤**: 支持显示/隐藏已完成的传输任务。
- **智能排序**: 根据传输状态和时间智能排序，优先显示活动传输任务。
- **重复传输处理**: 对于同名文件的传输，优先显示最新的传输记录。

### 3. 文件操作功能

- **打开文件**: 支持直接打开已完成下载的文件。
- **打开文件夹**: 可以打开已下载文件所在的文件夹。
- **清除记录**: 允许清除已完成的传输记录，保持界面整洁。

### 4. 传输信息展示

- **文件元信息**: 显示文件名、大小等基本信息。
- **传输指标**: 实时展示传输速度、已传输大小和总大小。
- **时间估算**: 提供传输剩余时间的估算。
- **设备信息**: 显示传输对端设备名称或 IP 地址。

## 技术实现

### 事件系统集成

模块通过多种方式监听传输事件：

```typescript
// 使用自定义事件监听传输更新
window.addEventListener(
  "file-transfer-update",
  handleTransferUpdate as EventListener
);

// 使用自定义钩子获取传输事件
const { transfers: eventTransfers } = useTransferEvents();
```

### 状态管理与更新策略

采用多层次的状态更新机制确保 UI 的实时性和准确性：

1. **事件驱动更新**: 监听传输事件实时更新状态
2. **定时刷新**: 通过定时器强制刷新活动传输状态
3. **合并策略**: 智能合并来自不同源的传输数据

### 进度条实现

使用 CSS 和动态样式实现平滑的进度条效果：

```jsx
<div
  style={{
    width: `${progress}%`,
    height: "100%",
    backgroundColor: transfer.direction === "upload" ? "#38A169" : "#3182CE",
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: "4px",
    transition: "width 0.1s linear",
  }}
/>
```

### 文件操作集成

通过 Electron IPC 通道与主进程通信，实现文件系统操作：

```typescript
const result = await window.electron.invoke("file:openFile", filePath);
const result = await window.electron.invoke("file:openFolder", filePath);
```

## 交互关系

### 与 PeerJS 上下文的集成

模块依赖于全局 PeerJS 上下文获取和更新传输数据：

```typescript
const peerContext = useGlobalPeerJS();
const { transfers, setTransfers } = peerContext;
```

### 与传输事件系统的交互

通过`useTransferEvents`钩子和自定义事件监听器获取传输更新：

```typescript
const { transfers: eventTransfers } = useTransferEvents();

window.addEventListener(
  "file-transfer-update",
  handleTransferUpdate as EventListener
);
```

### 与 Electron 主进程的通信

通过 IPC 调用与 Electron 主进程通信，实现文件系统操作：

```typescript
const result = await window.electron.invoke("file:openFile", filePath);
```

## 优化方向

### 性能优化

1. **减少重渲染**: 当前多个定时器可能导致过多重渲染，可以合并更新逻辑减少渲染次数。
2. **虚拟列表**: 对于大量传输任务，可以实现虚拟列表，只渲染可见区域内的项目。
3. **批量更新**: 将多个传输更新合并为一次状态更新，减少 React 渲染周期。

### 功能扩展

1. **批量操作**: 添加批量清除、暂停/恢复等功能。
2. **拖放支持**: 实现拖放功能，允许直接将文件拖放到传输列表。
3. **传输历史**: 添加传输历史记录功能，允许查看和搜索历史传输。
4. **传输优先级**: 实现传输任务优先级设置，允许用户调整传输顺序。

### 用户体验改进

1. **状态通知**: 添加系统通知，在传输完成或失败时通知用户。
2. **传输图表**: 添加传输速度和进度的图表显示，提供更直观的视觉反馈。
3. **错误恢复**: 提供传输失败后的重试机制和更详细的错误信息。
4. **自定义设置**: 允许用户自定义显示选项，如排序方式、自动清除规则等。

## 总结

CurrentTransfers 模块是 LanFile_PC 应用的关键组件，为用户提供了直观、实时的文件传输管理界面。通过结合 React 的状态管理和 Electron 的跨平台能力，该模块成功实现了高效的文件传输监控和交互功能。未来的优化方向主要集中在性能提升、功能扩展和用户体验改进上，以满足更多样化的使用场景需求。
