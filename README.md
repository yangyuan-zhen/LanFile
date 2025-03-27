# LanFile_PC

> 一个现代化的局域网文件传输解决方案，基于 Electron 和 React 构建。

## ✨ 主要特性

- 📡 智能设备发现 - 自动检测并连接局域网内的设备
- 📂 文件传输 - 支持拖拽上传和快速下载
- 📊 实时状态监控 - 显示传输进度、速度和状态
- 🔔 通知系统 - 传输完成自动通知
- 🚀 高效传输 - 采用点对点传输技术，速度更快
- 💻 全平台支持 - 完整支持 Windows、计划支持 macOS 和 Linux
- 🎨 精美界面 - 现代化 UI 设计，支持多种主题

## 已实现功能

- ✅ 局域网自动设备发现
- ✅ 文件拖拽上传与下载
- ✅ 实时传输进度和速度显示
- ✅ 传输完成通知系统
- ✅ 文件传输分块大小设置
- ✅ 多文件队列传输
- ✅ 传输历史与状态管理

## 🚀 计划中的功能

- 📱 移动设备支持
- 🔐 加密传输
- 🔄 断点续传
- 📊 传输统计和分析

## 🛠️ 技术栈

- **框架**: Electron + React
- **语言**: TypeScript
- **UI 组件**: Chakra UI
- **样式**: TailwindCSS
- **状态管理**: React Context API
- **通信**: PeerJS

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

1. 克隆项目
   ```
   git clone https://github.com/yangyuan-zhen/LanFile.git
   ```
2. 进入项目目录
   ```
   cd lanfile-pc
   ```
3. 安装依赖
   ```
   npm install
   ```
4. 启动开发环境
   ```
   npm run dev
   ```
5. 构建应用
   ```
   npm run build
   ```

## 项目目录结构

```
LanFile_PC/
├── src/
│   ├── main/         # Electron 主进程
│   ├── renderer/     # React 渲染进程
│   │   ├── components/  # UI组件
│   │   ├── contexts/    # React上下文
│   │   ├── hooks/       # 自定义钩子
│   │   └── pages/       # 页面组件
│   └── preload/      # 预加载脚本
├── build/           # 构建配置
└── dist/            # 构建输出目录
```

## 开发指南

### 代码规范

- 使用 TypeScript 编写所有新代码
- 遵循 Airbnb React/JSX 风格指南
- 使用 2 空格缩进
- 最大行长度为 100 字符

### 组件开发

- 使用函数式组件和 React Hooks
- 为所有变量和函数定义适当的 TypeScript 类型
- 使用 TailwindCSS 和 Chakra UI 实现响应式设计

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

- Email：yhrsc30@gmail.com

## 致谢

感谢所有为这个项目做出贡献的开发者！
