import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { NetworkService } from './services/NetworkService';
import MDNSService, { MDNSDevice } from './services/MDNSService';
import { heartbeatService } from './services/HeartbeatService';
import { networkInterfaces, hostname } from 'os';
import wifi from 'node-wifi';
import fetch from 'node-fetch';
import { setupWebRTCHandlers } from './webrtc';
import { setupPingHandler } from './network';

// 创建配置存储实例
const store = new Store();

// 初始化变量
let mainWindow: BrowserWindow | null = null;
let networkService: NetworkService | null = null;

// 初始化 wifi 模块
wifi.init({
    iface: null // 使用默认网络接口
});

// 注册所有 IPC 处理器
function setupIpcHandlers() {
    console.log("开始注册 IPC 处理器...");

    // 设置相关处理器
    ipcMain.handle('settings:getDownloadPath', () => {
        try {
            console.log("settings:getDownloadPath 被调用");
            const downloadsPath = app.getPath('downloads');
            console.log("系统下载路径:", downloadsPath);
            return downloadsPath;
        } catch (error) {
            console.error("获取下载路径错误:", error);
            return "";
        }
    });

    ipcMain.handle('settings:setDownloadPath', (_, path: string) => {
        try {
            console.log("settings:setDownloadPath 被调用", path);
            store.set('downloadPath', path);
            return true;
        } catch (error) {
            console.error("设置下载路径错误:", error);
            return false;
        }
    });

    ipcMain.handle('settings:setPort', (_, port: number) => {
        try {
            console.log("设置端口:", port);
            store.set('servicePort', port);

            // 重要：通知网络服务更新端口
            if (networkService) {
                networkService.updateServicePort(port);
            }

            return true;
        } catch (error) {
            console.error("设置端口错误:", error);
            return false;
        }
    });

    // 文件对话框处理器
    ipcMain.handle('dialog:openDirectory', async () => {
        try {
            console.log("dialog:openDirectory 被调用");
            const savedPath = store.get('downloadPath');
            const defaultPath = typeof savedPath === 'string' && savedPath
                ? savedPath
                : app.getPath('downloads');

            const result = await dialog.showSaveDialog({
                title: '选择文件保存位置',
                defaultPath,
                buttonLabel: '保存',
                filters: [
                    { name: '所有文件', extensions: ['*'] }
                ]
            });

            console.log('文件保存路径选择结果:', result);
            return result;
        } catch (error) {
            console.error('选择文件保存路径失败:', error);
            throw error;
        }
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

    // HTTP 请求处理器
    ipcMain.handle('http:request', async (_, options: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: any;
    }) => {
        try {
            console.log(`发起HTTP请求: ${options.method || 'GET'} ${options.url}`);

            const response = await fetch(options.url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body ? JSON.stringify(options.body) : undefined,
            });

            const data = await response.json();
            return {
                ok: response.ok,
                status: response.status,
                data,
            };
        } catch (error) {
            console.error('HTTP请求失败:', error);
            throw error;
        }
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

    // 处理WebRTC初始化
    ipcMain.handle('webrtc:initialize', async () => {
        console.log('WebRTC初始化');
        return true;
    });

    // 处理发送提议
    ipcMain.handle('webrtc:sendOffer', async (_, data) => {
        console.log('发送WebRTC提议:', data);
        // 这里应添加实际的信令服务器通信代码
        return true;
    });

    // 处理发送应答
    ipcMain.handle('webrtc:sendAnswer', async (_, data) => {
        console.log('发送WebRTC应答:', data);
        // 这里应添加实际的信令服务器通信代码
        return true;
    });

    // 处理ICE候选
    ipcMain.handle('webrtc:sendIceCandidate', async (_, data) => {
        console.log('发送ICE候选:', data);
        // 这里应添加实际的信令服务器通信代码
        return true;
    });

    // 处理文件保存
    ipcMain.handle('file:saveDownloadedFile', async (_, data) => {
        console.log('保存下载的文件:', data);
        // 实现文件保存逻辑
        return true;
    });

    // 注册ping设备处理程序
    setupPingHandler();

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

    setupWebRTCHandlers(mainWindow);
};

// 应用初始化
app.whenReady().then(async () => {
    try {
        console.log("应用准备就绪，开始初始化...");

        // 先注册 IPC 处理器
        setupIpcHandlers();
        console.log("IPC 处理器设置完成");

        // 初始化网络服务
        networkService = new NetworkService();
        console.log("网络服务初始化完成");

        // 创建窗口
        createWindow();
        console.log("主窗口创建完成");

        // 启动服务
        await MDNSService.publishService();
        await heartbeatService.start();
        console.log("所有服务启动完成");

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
}); 