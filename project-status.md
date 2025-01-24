# LanFile_PC 项目状态报告

## 当前进展

- 完成了基础项目设置
- 完成了 Electron 主进程和渲染进程的配置
- 完成了主题系统的搭建
- 实现了基础 UI 组件的响应式布局
- 集成了文件选择功能
- 选择了 MDNS 作为局域网设备发现方案
- 安装了 MDNS 依赖 (multicast-dns)
- 配置完成 TailwindCSS 和 PostCSS

## 下一步计划

- 实现 HTTP 服务器
- 配置 MDNS 服务广播
- 开发设备发现功能

## 技术栈

- Electron
- React
- TypeScript
- TailwindCSS
- Headless UI
- MDNS (multicast-dns)
- WebRTC (计划中)
- WebTorrent (计划中)

## 技术方案

### 1. 前端架构

- **UI 框架**: React + TypeScript

  - 使用函数式组件和 Hooks
  - 严格的类型检查
  - 组件按功能模块化组织

- **样式方案**: TailwindCSS

  - 使用 PostCSS 处理器
  - 自定义主题配置
  - 组件级样式封装
  - 响应式设计支持

- **构建工具**: Webpack
  - 多目标构建配置（主进程、渲染进程、预加载脚本）
  - 热重载开发环境
  - 资源优化和代码分割

### 2. 桌面端实现

- **框架选择**: Electron

  - 主进程负责系统 API 调用
  - 渲染进程处理 UI 交互
  - IPC 通信处理跨进程操作

- **文件系统集成**:
  - 使用 Electron 的 dialog API 处理文件选择
  - Node.js fs 模块处理文件读写
  - 支持拖拽操作

### 3. 网络传输

- **设备发现**: MDNS (Multicast DNS)

  - 使用 multicast-dns 包实现
  - 自动服务发现和注册
  - 零配置网络实现

- **文件传输**:
  - HTTP 服务器处理文件传输（计划中）
  - WebRTC 实现点对点传输（计划中）
  - WebTorrent 支持大文件传输（计划中）

### 4. 安全性

- **IPC 通信安全**:

  - contextBridge 严格限制暴露 API
  - 类型安全的 IPC 接口
  - 输入验证和清理

- **文件传输安全**:
  - 传输过程加密（计划中）
  - 文件完整性校验（计划中）
  - 访问控制和认证（计划中）

## 开发指南

### 1. 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### 2. 项目设置

```bash
# 克隆项目
git clone [项目地址]

# 进入项目目录
cd LanFile_PC

# 安装依赖
npm install
```

### 3. 开发模式

```bash
# 启动开发服务器
npm run dev

# 这个命令会：
# 1. 启动 webpack-dev-server（渲染进程）
# 2. 启动 electron（主进程）
# 3. 启动热重载
```

### 4. 构建项目

```bash
# 构建生产版本
npm run build

# 这个命令会：
# 1. 构建渲染进程
# 2. 构建主进程
# 3. 构建预加载脚本
```

### 5. 常见问题

1. **端口占用问题**

   - 默认使用 3001 端口
   - 如果端口被占用，可以修改 `webpack.config.ts` 中的端口配置

2. **热重载不生效**

   - 检查 webpack-dev-server 是否正常运行
   - 确认 webpack 配置中的 hot 选项已启用

3. **样式不生效**
   - 确保 PostCSS 配置正确
   - 检查 TailwindCSS 配置文件是否正确
   - 确认样式文件正确导入

### 6. 开发工具推荐

- VS Code 扩展：
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)
  - Error Lens

## 问题解决记录

### 1. UI 组件系统搭建

- 问题: 需要高度可定制且无障碍的 UI 组件
- 解决: 使用 Headless UI + TailwindCSS 组合
- 实现: 封装了 Button、Card 等基础组件

### 2. Electron 渲染进程通信

- 问题: 主进程和渲染进程之间的通信配置
- 解决: 通过 contextBridge 配置预加载脚本,暴露安全的 API

### 3. 文件选择实现

- 问题: 需要实现跨平台的文件选择功能
- 解决: 使用 Electron 的 dialog API
- 步骤: 通过 IPC 在渲染进程中调用主进程的文件选择功能

### 4. 样式优化

- 问题: 样式管理和响应式设计
- 解决: 使用 TailwindCSS 实现统一的样式系统
- 创建统一的主题系统，包含颜色、间距和排版规范
- 解决了 TailwindCSS 的 @apply 和 @tailwind 指令问题
- 配置了 PostCSS 以支持 TailwindCSS 的所有功能

### 5. 设备发现方案选择

- 问题: 需要在局域网内实现自动设备发现
- 解决: 选择 MDNS (Multicast DNS) 协议
- 实现: 使用 multicast-dns 包实现 MDNS 服务
- 原因:
  - 无需中心服务器，完全点对点
  - 原生支持局域网服务发现
  - 跨平台兼容性好
  - 低延迟，实时性强
