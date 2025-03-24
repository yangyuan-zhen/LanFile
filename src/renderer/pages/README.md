# LanFile_PC 页面模块文档

## 1. 模块概述

LanFile_PC 的页面模块（Pages）构成了应用程序的主要用户界面，提供了文件传输、设备管理和系统设置等核心功能的交互入口。该模块基于 React 和 TypeScript 构建，采用 Tailwind CSS 进行样式设计，实现了响应式布局和现代化的用户体验。

页面模块通过组合各种组件和钩子，为用户提供直观的文件共享功能，包括发送文件、接收文件、监控传输状态以及配置应用参数等。每个页面都针对特定的用户需求设计，共同构成完整的应用功能流程。

## 2. 目录结构分析

```
src/renderer/pages/
├── Home/                    # 主页/仪表盘
│   ├── Home.tsx             # 主页面组件
│   └── index.ts             # 导出文件
├── Receive/                 # 接收文件页面
│   ├── Receive.tsx          # 接收文件组件
│   └── index.ts             # 导出文件
├── Send/                    # 发送文件页面
│   ├── Send.tsx             # 发送文件组件
│   └── index.ts             # 导出文件
├── Settings/                # 设置页面
│   ├── Settings.tsx         # 设置组件
│   └── index.ts             # 导出文件
├── Status/                  # 传输状态页面
│   ├── Status.tsx           # 状态监控组件
│   └── index.ts             # 导出文件
└── index.ts                 # 导出所有页面
```

## 3. 核心功能详解

### 3.1 首页仪表盘 (Home)

`HomePage` 是应用的中心枢纽，整合了四个关键功能区：

- **网络服务状态**：显示当前设备网络状态、连接速度和已连接设备数量
- **当前传输任务**：实时显示正在进行的文件传输，包括进度、速度和剩余时间
- **文件上传工具**：提供文件选择上传界面
- **文件列表展示**：显示可用文件列表，支持文件操作

```typescript
// Home.tsx 关键结构
export const HomePage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">仪表盘</h1>
      </div>
      <NetworkService
        networkInfo={networkInfo}
        getSelectedFiles={getSelectedFiles}
      />
      <CurrentTransfers transfers={transfers} />
      <FileUploader ref={fileUploaderRef} onFileSelect={handleFileSelect} />
      <FileList files={files} />
    </div>
  );
};
```

### 3.2 发送文件 (Send)

`SendPage` 提供了文件选择和发送功能，具有以下特点：

- **设备选择**：选择目标接收设备
- **文件分类标签**：支持按文件类型（全部、图片、视频、文档）过滤
- **文件列表**：显示可选文件列表，包含文件名、大小和类型信息
- **多文件选择**：支持选择多个文件同时发送
- **添加文件**：允许用户添加更多文件到发送列表

```typescript
// Send.tsx 关键结构
export const SendPage: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState("Unknown Device");
  const [activeTab, setActiveTab] = useState<
    "all" | "images" | "videos" | "documents"
  >("all");

  // 文件过滤逻辑
  const filteredFiles = files.filter((file) => {
    if (activeTab === "all") return true;
    return file.type === activeTab.slice(0, -1);
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 设备选择区 */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Sending to:</span>
          <button
            className="text-sm font-medium text-blue-500"
            onClick={() => navigate("/")}
          >
            Change
          </button>
        </div>
        <div className="mt-1 text-base font-medium">{selectedDevice}</div>
      </div>

      {/* 文件类型标签 */}
      <div className="flex p-4 space-x-4 bg-white border-b border-gray-200">
        {/* 标签实现... */}
      </div>

      {/* 文件列表 */}
      <div className="overflow-auto flex-1">{/* 文件列表实现... */}</div>
    </div>
  );
};
```

### 3.3 接收文件 (Receive)

`ReceivePage` 是针对文件接收设计的专用页面，目前提供了基础框架：

- 显示待接收的文件列表
- 提供接收确认选项
- 可以设置保存位置
- 显示传输进度和状态

```typescript
// Receive.tsx 基础结构
export const ReceivePage: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">接收文件</h2>
      {/* 接收文件的具体实现 */}
    </div>
  );
};
```

### 3.4 设置页面 (Settings)

`SettingsPage` 用于配置应用的核心参数：

- 网络设置（发现模式、端口配置）
- 文件存储设置（默认保存位置、存储限制）
- 设备信息设置（设备名称、可见性）
- 安全设置（传输加密、设备认证）

```typescript
// Settings.tsx 基础结构
export const SettingsPage: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">设置</h2>
      {/* 设置选项的具体实现 */}
    </div>
  );
};
```

### 3.5 传输状态 (Status)

`StatusPage` 专注于监控和管理文件传输：

- 显示当前和历史传输任务
- 提供传输详情和统计信息
- 支持暂停、恢复和取消传输
- 显示传输错误和诊断信息

```typescript
// Status.tsx 基础结构
export const StatusPage: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-semibold">传输状态</h2>
      {/* 状态监控的具体实现 */}
    </div>
  );
};
```

## 4. 技术实现

### 4.1 React 路由与导航

页面间的导航通过 React Router 实现，关键代码：

```typescript
// Send.tsx 中的导航示例
const navigate = useNavigate();

// 返回导航按钮
<button
  onClick={() => navigate(-1)}
  className="p-2 rounded-full hover:bg-gray-100"
>
  <ChevronLeft className="w-6 h-6 text-gray-600" />
</button>

// 页面跳转
<button
  className="text-sm font-medium text-blue-500"
  onClick={() => navigate("/")}
>
  Change
</button>
```

### 4.2 状态管理

页面内的状态管理使用 React Hooks：

```typescript
// Send.tsx 状态管理示例
const [selectedDevice, setSelectedDevice] = useState("Unknown Device");
const [activeTab, setActiveTab] = useState<
  "all" | "images" | "videos" | "documents"
>("all");

// Home.tsx 引用管理示例
const fileUploaderRef = useRef<HTMLInputElement>(null);
```

### 4.3 UI 组件组合

各页面通过组合不同组件实现复杂功能：

```typescript
// Home.tsx 组件组合示例
<NetworkService
  networkInfo={networkInfo}
  getSelectedFiles={getSelectedFiles}
/>
<CurrentTransfers transfers={transfers} />
<FileUploader
  ref={fileUploaderRef}
  onFileSelect={handleFileSelect}
/>
<FileList files={files} />
```

### 4.4 响应式设计

使用 Tailwind CSS 实现响应式布局：

```typescript
// Send.tsx 响应式布局示例
<div className="flex flex-col h-full bg-gray-50">
  {/* 响应式标签栏 */}
  <div className="flex p-4 space-x-4 bg-white border-b border-gray-200">
    {/* ... */}
  </div>

  {/* 响应式文件列表，占用剩余空间 */}
  <div className="overflow-auto flex-1">{/* ... */}</div>
</div>
```

## 5. 交互关系

### 5.1 与组件模块的交互

页面模块主要通过导入并使用组件模块中的组件来构建界面：

```typescript
// Home.tsx 与组件模块交互
import NetworkService from "../../components/features/NetworkService/NetworkService";
import FileList from "../../components/features/FileList/FileList";
import FileUploader from "../../components/features/FileUploader/FileUploader";
import CurrentTransfers from "../../components/features/CurrentTransfers/CurrentTransfers";
```

### 5.2 与 Hooks 模块的交互

页面模块使用 Hooks 模块提供的自定义钩子管理状态和业务逻辑：

```typescript
// 潜在的 Hook 使用示例（完整实现中）
import { useNetworkDevices } from "../../hooks/useNetworkDevices";
import { useFileTransfers } from "../../hooks/useFileTransfers";

export const HomePage = () => {
  const { devices, scanForDevices } = useNetworkDevices();
  const { transfers, sendFile } = useFileTransfers();

  // 使用这些 Hook 提供的数据和方法
  // ...
};
```

### 5.3 页面间的导航关系

页面之间形成了清晰的导航流：

- **Home** → 提供进入其他所有页面的入口
- **Send** → 可以返回 Home 或进入 Status 查看传输状态
- **Receive** → 可以返回 Home 或进入 Status 查看传输状态
- **Settings** → 可以返回 Home 进行设置调整
- **Status** → 可以返回 Home 或进入特定传输任务的详细信息

## 6. 优化方向

### 6.1 代码组织优化

- **采用页面级组件拆分**：将复杂页面拆分为多个子组件，提高可维护性

  ```typescript
  // SendPage 可拆分为:
  // - DeviceSelector.tsx
  // - FileTypeTabs.tsx
  // - FileSelector.tsx
  ```

- **实现页面加载状态**：添加过渡动画和加载状态

  ```typescript
  const [isLoading, setIsLoading] = useState(true);

  // 使用加载状态控制显示内容
  return <div>{isLoading ? <LoadingSpinner /> : <ActualContent />}</div>;
  ```

### 6.2 功能增强

- **批量操作**：添加文件批量选择和操作功能

  ```typescript
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((file) => file.id));
    }
  };
  ```

- **拖放支持**：实现文件拖放上传和设备拖放选择

  ```typescript
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    // 处理拖放文件
  };
  ```

- **搜索和排序**：添加文件搜索和多种排序选项

  ```typescript
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");

  const sortedAndFilteredFiles = files
    .filter((file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // 排序逻辑
    });
  ```

### 6.3 用户体验改进

- **记住用户选择**：保存用户最近选择的设备和文件夹

  ```typescript
  useEffect(() => {
    // 从本地存储加载上次选择
    const lastDevice = localStorage.getItem("lastSelectedDevice");
    if (lastDevice) {
      setSelectedDevice(lastDevice);
    }
  }, []);

  // 保存用户选择
  useEffect(() => {
    localStorage.setItem("lastSelectedDevice", selectedDevice);
  }, [selectedDevice]);
  ```

- **暗色模式**：添加暗色模式支持

  ```typescript
  // 使用 Tailwind 的暗色模式类
  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
    {/* 内容 */}
  </div>
  ```

- **键盘快捷键**：添加键盘导航和操作支持
  ```typescript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 取消选择或返回
      } else if (e.ctrlKey && e.key === "a") {
        // 全选
        e.preventDefault();
        toggleSelectAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  ```

### 6.4 页面性能优化

- **懒加载**：实现页面的懒加载，减少初始加载时间

  ```typescript
  // App.tsx 中使用 React.lazy
  const SendPage = React.lazy(() => import("./pages/Send"));
  const ReceivePage = React.lazy(() => import("./pages/Receive"));

  // 使用 Suspense 包装路由
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/send" element={<SendPage />} />
      <Route path="/receive" element={<ReceivePage />} />
      {/* 其他路由 */}
    </Routes>
  </Suspense>;
  ```

- **虚拟列表**：对长文件列表使用虚拟化渲染

  ```typescript
  import { FixedSizeList } from "react-window";

  // 在 FileList 中使用虚拟列表
  <FixedSizeList
    height={600}
    width="100%"
    itemCount={files.length}
    itemSize={72}
  >
    {({ index, style }) => (
      <div style={style}>
        {/* 渲染单个文件项 */}
        <FileItem file={files[index]} />
      </div>
    )}
  </FixedSizeList>;
  ```

## 总结

LanFile_PC 的页面模块提供了用户与应用交互的主要界面，涵盖了文件传输、设备管理和应用设置等核心功能。通过合理的组件组合和状态管理，实现了直观且高效的用户体验。

未来的优化方向主要集中在代码组织、功能增强、用户体验改进和性能优化四个方面，旨在提供更流畅、更功能丰富的局域网文件传输体验。随着这些优化的实施，应用将能够更好地满足用户的文件共享需求，并在不同网络环境下保持高效稳定的性能。
