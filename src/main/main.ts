import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { NetworkService } from './services/NetworkService';
import { zeroconfService } from './services/ZeroconfService';
import os from "os";
import { networkInterfaces } from 'os';
import wifi from 'node-wifi';

let mainWindow: BrowserWindow | null = null;
let networkService: NetworkService | null = null;

// 初始化 wifi 模块
wifi.init({
    iface: null // 使用默认网络接口
});

function setupIpcHandlers() {
    // 网络相关的处理程序需要 networkService
    if (networkService) {
        // 移除可能存在的旧处理程序
        ipcMain.removeHandler('network:getLocalService');
        ipcMain.removeHandler('network:startDiscovery');
        ipcMain.removeHandler('network:stopDiscovery');

        // 注册网络相关的处理程序
        ipcMain.handle('network:getLocalService', () => {
            return networkService?.getLocalService();
        });

        ipcMain.handle('network:startDiscovery', () => {
            return networkService?.startDiscovery();
        });

        ipcMain.handle('network:stopDiscovery', () => {
            return networkService?.stopDiscovery();
        });

        // Zeroconf 相关的 IPC 处理
        ipcMain.handle('zeroconf:startScan', () => {
            networkService?.startDiscovery();
        });

        ipcMain.handle('zeroconf:stopScan', () => {
            networkService?.stopDiscovery();
        });

        ipcMain.handle('zeroconf:publishService', (_, port: number) => {
            networkService?.publishService(port);
        });

        ipcMain.handle('zeroconf:unpublishService', () => {
            networkService?.unpublishService();
        });

        // 当发现设备时发送到渲染进程
        networkService?.on('deviceFound', (device) => {
            mainWindow?.webContents.send('zeroconf:deviceFound', device);
        });
    }

    // 系统相关的处理程序不需要依赖 networkService
    ipcMain.handle("system:getDeviceName", () => {
        try {
            const platform = os.platform();
            const release = os.release();

            // 对于 Windows，只显示系统类型
            if (platform === 'win32') {
                if (release.startsWith('10.')) {
                    return 'Windows 10 设备';
                } else if (release.startsWith('6.3')) {
                    return 'Windows 8.1 设备';
                } else if (release.startsWith('6.2')) {
                    return 'Windows 8 设备';
                } else if (release.startsWith('6.1')) {
                    return 'Windows 7 设备';
                }
            }

            return '未知设备';
        } catch (error) {
            console.error('Error getting device name:', error);
            return "未知设备";
        }
    });

    ipcMain.handle('system:getNetworkInfo', async () => {
        try {
            const interfaces = networkInterfaces();
            let networkInfo: { type: string; ssid?: string; ip?: string } = {
                type: 'none'
            };

            // 遍历网络接口
            for (const [name, addrs] of Object.entries(interfaces)) {
                if (!addrs) continue;

                for (const addr of addrs) {
                    // 跳过内部地址和IPv6
                    if (addr.internal || addr.family === 'IPv6') continue;

                    // 检查是否是 WLAN/WiFi 接口
                    if (name.toLowerCase().includes('wlan') || name.toLowerCase().includes('wi-fi')) {
                        try {
                            // 获取当前 WiFi 连接信息
                            const connections = await wifi.getCurrentConnections();
                            const currentConnection = connections[0];

                            networkInfo = {
                                type: 'wifi',
                                ip: addr.address,
                                ssid: currentConnection?.ssid || '未知网络'
                            };
                            break;
                        } catch (wifiError) {
                            console.error('Error getting WiFi info:', wifiError);
                            networkInfo = {
                                type: 'wifi',
                                ip: addr.address,
                                ssid: '未知网络'
                            };
                        }
                    }
                    // 检查是否是以太网接口
                    else if (name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('eth')) {
                        networkInfo = {
                            type: 'ethernet',
                            ip: addr.address
                        };
                    }
                }
                if (networkInfo.type !== 'none') break;
            }

            console.log('Network info:', networkInfo); // 添加调试日志
            return networkInfo;
        } catch (error) {
            console.error('Error getting network info:', error);
            return { type: 'none' };
        }
    });
}

function createWindow() {
    console.log('Creating window...');
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('Preload path:', preloadPath);

    mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: preloadPath,
            sandbox: false,
            webSecurity: false
        },
    });

    // 自动打开开发者工具
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    networkService = new NetworkService();
    setupIpcHandlers();

    if (process.env.NODE_ENV === 'development') {
        console.log('Loading development URL...');
        mainWindow.loadURL('http://localhost:3001');
    } else {
        console.log('Loading production file...');
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // 发布 mDNS 服务
    const servicePort = 12345;
    networkService.publishService(servicePort);

    mainWindow.on('closed', () => {
        networkService?.unpublishService();
        mainWindow = null;
    });

    // 创建菜单
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
}

app.whenReady().then(createWindow);

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