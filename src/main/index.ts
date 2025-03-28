import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { NetworkService } from './services/NetworkService';
import MDNSService, { MDNSDevice } from './services/MDNSService';
import { heartbeatService } from './services/HeartbeatService';
import { networkInterfaces, hostname } from 'os';
import wifi from 'node-wifi';
import fetch from 'node-fetch';
import { setupPingHandler } from './network';
import dgram from 'dgram';
import { logService } from './services/LogService';
import { registerNetworkHandlers } from './services/NetworkService';
import { peerDiscoveryService } from './services/PeerDiscoveryService';
import fs from 'fs';
import './ipc-handlers';  // 这里导入包含所有IPC处理程序的文件

// 添加调试日志，确认文件正在加载
console.log('===== main/index.ts 开始执行 =====');
console.log('当前 __dirname:', __dirname);
console.log('预计预加载脚本路径:', path.join(__dirname, '../preload/preload.js'));

// 在应用顶部添加
app.commandLine.appendSwitch('lang', 'zh-CN');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

// 创建配置存储实例
const store = new Store();

// 创建一个用于存储设置的实例
const settingsStore = new Store({
    name: 'settings', // 存储文件名
    defaults: {
        chunkSize: 16384, // 默认分块大小为16KB
        heartbeatPort: 8080,
        downloadPath: app.getPath('downloads')
    }
});

// 初始化变量
let mainWindow: BrowserWindow | null = null;
let networkService: NetworkService | null = null;

// 初始化 wifi 模块
wifi.init({
    iface: null // 使用默认网络接口
});

// 在应用启动时尽早设置
logService.setupConsole();

// 获取设备ID
async function getDeviceId(): Promise<string> {
    try {
        return hostname(); // 已导入的 os.hostname() 函数
    } catch (error) {
        console.error("获取设备ID失败:", error);
        return "unknown-device";
    }
}

// 注册所有 IPC 处理器
function setupIpcHandlers() {
    console.log("开始注册 IPC 处理器...");

    // 只注册其他未在 ipc-handlers.ts 中注册的处理程序
    ipcMain.handle('dialog:openDirectory', async () => {
        // 处理打开目录对话框的逻辑
    });

    // 从 main.ts 合并的 IPC 处理器
    // 网络相关处理器
    if (networkService) {
        ipcMain.handle('network:getLocalService', () => {
            return networkService?.getLocalService();
        });

        ipcMain.handle('network:startDiscovery', () => {
            return networkService?.startDiscovery();
        });

        ipcMain.handle('network:stopDiscovery', () => {
            return networkService?.stopDiscovery();
        });
    }

    // 系统信息处理器
    ipcMain.handle("system:getDeviceName", () => {
        console.log("system:getDeviceName 被调用");
        return store.get('deviceName') || store.get('systemDeviceName');
    });

    ipcMain.handle("system:getDeviceId", () => {
        try {
            console.log("system:getDeviceId 被调用");
            const deviceId = hostname();
            console.log("获取到设备ID:", deviceId);
            return deviceId;
        } catch (error) {
            console.error("获取设备ID失败:", error);
            return "";
        }
    });

    ipcMain.handle('system:getNetworkInfo', async () => {
        try {
            // 先尝试获取 WiFi 连接信息
            let wifiConnection = null;
            try {
                const connections = await wifi.getCurrentConnections();
                if (connections && connections.length > 0) {
                    wifiConnection = connections[0];
                    console.log('当前 WiFi 连接:', wifiConnection);
                }
            } catch (err) {
                console.log('获取 WiFi 信息失败:', err);
            }

            const interfaces = networkInterfaces();
            let networkInfo = {
                type: 'none',
                ip: '',
                ipv4: '',
                isConnected: false,
                ssid: wifiConnection?.ssid || '',
                speed: '100 Mbps'
            };

            // 如果有 WiFi 连接，优先使用 WiFi 信息
            if (wifiConnection) {
                console.log('检测到 WiFi 连接，使用 WiFi 信息');
                networkInfo.type = 'wifi';
            }

            // 遍历所有网络接口获取 IP 地址
            for (const [name, nets] of Object.entries(interfaces)) {
                if (name.includes('VMware') ||
                    name.includes('VirtualBox') ||
                    name.includes('Loopback') ||
                    name.includes('lo')) {
                    continue;
                }

                for (const net of nets || []) {
                    if (net.internal ||
                        net.family === 'IPv6' ||
                        net.address === '127.0.0.1') {
                        continue;
                    }

                    if (net.family === 'IPv4' && !net.address.startsWith('169.254.')) {
                        networkInfo = {
                            ...networkInfo,
                            ip: net.address,
                            ipv4: net.address,
                            isConnected: true
                        };

                        // 如果没有 WiFi 连接，则根据接口名称判断类型
                        if (!wifiConnection) {
                            const isWifi = name.toLowerCase().includes('wi-fi') ||
                                name.toLowerCase().includes('wireless') ||
                                name.toLowerCase().includes('wlan');
                            networkInfo.type = isWifi ? 'wifi' : 'ethernet';
                        }

                        console.log('网络连接信息:', networkInfo);
                        return networkInfo;
                    }
                }
            }

            console.log('未找到有效网络连接');
            return networkInfo;
        } catch (error) {
            console.error('获取网络信息失败:', error);
            return {
                type: 'none',
                ip: '',
                ipv4: '',
                isConnected: false,
                ssid: '',
                speed: ''
            };
        }
    });

    // MDNS 相关处理器
    ipcMain.handle('mdns:startDiscovery', () => {
        return MDNSService.startDiscovery();
    });

    ipcMain.handle('mdns:stopDiscovery', () => {
        return MDNSService.stopDiscovery();
    });

    ipcMain.handle('mdns:publishService', () => {
        return MDNSService.publishService();
    });

    ipcMain.handle('mdns:unpublishService', () => {
        return MDNSService.unpublishService();
    });

    // 获取发现的设备
    ipcMain.handle('mdns:getDiscoveredDevices', () => {
        try {
            console.log("获取已发现设备列表");
            const devices = (MDNSService.constructor as any).getDiscoveredDevices();
            console.log("发现的设备:", devices);
            return devices;
        } catch (error) {
            console.error("获取设备列表失败:", error);
            return [];
        }
    });

    // 心跳服务处理器
    ipcMain.handle('heartbeat:start', () => {
        return heartbeatService.start();
    });

    ipcMain.handle('heartbeat:stop', () => {
        heartbeatService.stop();
        return { success: true };
    });

    ipcMain.handle('heartbeat:getPort', () => {
        return heartbeatService.getPort();
    });

    ipcMain.handle('heartbeat:setPort', (_, port: number) => {
        heartbeatService.setPort(port);
        return { success: true };
    });

    // 事件监听和转发
    MDNSService.on('deviceFound', (device: MDNSDevice) => {
        if (!device) {
            console.error('收到空的设备数据，不转发');
            return;
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mdns:deviceFound', device);
        }
    });

    MDNSService.on('deviceLeft', (device: MDNSDevice) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mdns:deviceLeft', device);
        }
    });

    // 处理文件保存
    ipcMain.handle('file:saveDownloadedFile', async (_, data) => {
        console.log('保存下载的文件:', data);
        // 实现文件保存逻辑
        return true;
    });

    // 添加设备信息处理程序
    ipcMain.handle('device:getInfo', async () => {
        try {
            // 获取设备ID和名称
            const deviceId = await getDeviceId();
            const deviceName = hostname(); // 使用计算机名称作为设备名称

            return {
                id: deviceId,
                name: deviceName
            };
        } catch (error) {
            console.error('获取设备信息失败:', error);
            throw error;
        }
    });

    // 注册网络处理程序
    registerNetworkHandlers();

    // 处理文件下载保存
    ipcMain.handle('file:saveDownload', async (_, data) => {
        try {
            const { fileName, fileData } = data;

            // 打开保存对话框
            const { canceled, filePath } = await dialog.showSaveDialog({
                title: '保存文件',
                defaultPath: fileName,
                buttonLabel: '保存'
            });

            if (canceled || !filePath) {
                return { success: false, message: '用户取消了保存操作' };
            }

            // 将 URL 转换为实际的文件数据并保存
            const response = await fetch(fileData);
            const buffer = await response.arrayBuffer();

            fs.writeFileSync(filePath, Buffer.from(buffer));

            return { success: true, filePath };
        } catch (error) {
            console.error('保存下载文件失败:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    console.log("IPC 处理器注册完成");
}

// 创建窗口函数
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    });
    console.log(path.join(__dirname, '路径../preload/preload.js')); // 打印预加载脚本路径

    // 添加更多调试信息
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('页面加载失败:', errorCode, errorDescription);
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
        // 修改端口为 3001，与 Vite 开发服务器端口一致
        mainWindow.loadURL('http://localhost:3001');

        // 添加错误处理
        mainWindow.webContents.on('did-fail-load', () => {
            console.log('尝试重新加载页面...');
            setTimeout(() => {
                mainWindow?.loadURL('http://localhost:3001');
            }, 2000);
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // 创建开发菜单
    const menu = Menu.buildFromTemplate([
        {
            label: '开发',
            submenu: [
                {
                    label: '开发者工具',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
                    click: () => mainWindow?.webContents.toggleDevTools()
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        networkService?.unpublishService();
        mainWindow = null;
    });

    // 保存窗口引用
    (global as any).mainWindow = mainWindow;
};

// 应用初始化
app.whenReady().then(async () => {
    try {
        // 添加此行代码执行防火墙配置
        if (process.platform === 'win32') {
            await configureWindowsFirewall();
        }

        // 设置IPC处理程序
        setupIpcHandlers();

        // 启动心跳服务
        console.log("启动心跳服务...");
        await heartbeatService.start();
        console.log(`心跳服务状态: ${heartbeatService.isRunning ? '已启动' : '未启动'}, 端口: ${heartbeatService.getPort()}`);

        // 添加这行代码启动PeerDiscoveryService
        await peerDiscoveryService.start();
        console.log(`PeerDiscovery服务已启动，端口: ${peerDiscoveryService.getPort()}`);

        // 创建窗口
        if (!mainWindow) {
            createWindow();
        }
    } catch (error) {
        console.error("应用初始化失败:", error);
    }
});

// 应用事件处理
app.on('window-all-closed', () => {
    if (networkService) {
        networkService.stop();
        networkService = null;
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    if (networkService) {
        networkService.stop();
        networkService = null;
    }
    MDNSService.destroy();
    heartbeatService.stop();
    peerDiscoveryService.stop();
});

// 配置Windows防火墙的辅助函数
async function configureWindowsFirewall() {
    // 添加 UDP 心跳端口规则
    addFirewallRule('LanFileHeartbeat', 'UDP', heartbeatService.getPort());

    // 添加 TCP PeerDiscovery 规则
    addFirewallRule('LanFilePeerDiscovery', 'TCP', 8765);

    // 添加 MDNS 规则
    addFirewallRule('LanFileMDNS', 'UDP', 5353);
}

function addFirewallRule(name: string, protocol: string, port: number) {
    const { spawn } = require('child_process');
    const addRule = spawn('netsh', [
        'advfirewall', 'firewall', 'add', 'rule',
        `name=${name}`,
        'dir=in',
        'action=allow',
        'program=any',
        `protocol=${protocol}`,
        `localport=${port}`
    ]);

    addRule.on('close', (code: number | null) => {
        console.log(`添加防火墙规则 ${name} ${protocol}:${port} ${code === 0 ? '成功' : '失败'}`);
    });
} 