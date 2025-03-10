import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { NetworkService } from './services/NetworkService';
import { zeroconfService } from './services/ZeroconfService';
import os from "os";
import { networkInterfaces } from 'os';
import wifi from 'node-wifi';
import store from './store/index';
import MDNSService, { MDNSDevice } from './services/MDNSService';
import { heartbeatService } from './services/HeartbeatService';

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
        return store.get('deviceName') || store.get('systemDeviceName');
    });

    ipcMain.handle('system:getNetworkInfo', async () => {
        try {
            const interfaces = networkInterfaces();
            console.log('所有网络接口:', JSON.stringify(interfaces));

            for (const name of Object.keys(interfaces)) {
                console.log(`检查接口: ${name}`);
                for (const iface of interfaces[name] || []) {
                    if (!iface.internal && iface.family === 'IPv4') {
                        console.log(`找到非内部IPv4接口: ${name}, IP: ${iface.address}`);

                        // 检查是否是WiFi接口
                        if (name.toLowerCase().includes('wi-fi') ||
                            name.toLowerCase().includes('wlan') ||
                            name.toLowerCase().includes('wireless')) {

                            console.log('识别为WiFi接口，尝试获取SSID');

                            // 尝试使用node-wifi库获取SSID
                            try {
                                console.log('调用wifi.getCurrentConnections()');
                                const connections = await wifi.getCurrentConnections();
                                console.log('WiFi连接列表:', connections);

                                if (connections && connections.length > 0) {
                                    console.log('成功获取到WiFi SSID:', connections[0].ssid);
                                    return {
                                        type: 'wifi',
                                        ssid: connections[0].ssid,
                                        ip: iface.address
                                    };
                                } else {
                                    console.log('获取到的WiFi连接列表为空');
                                }
                            } catch (wifiError) {
                                console.error('获取WiFi SSID失败，详细错误:', wifiError);

                                // 尝试使用平台特定方法获取SSID
                                try {
                                    let ssid = '';
                                    if (process.platform === 'win32') {
                                        // Windows平台使用netsh命令
                                        const { execSync } = require('child_process');
                                        const stdout = execSync('netsh wlan show interfaces').toString();
                                        const ssidMatch = /^\s*SSID\s*: (.+)$/gm.exec(stdout);
                                        if (ssidMatch && ssidMatch[1]) {
                                            ssid = ssidMatch[1].trim();
                                            console.log('通过netsh获取到SSID:', ssid);
                                        }
                                    } else if (process.platform === 'darwin') {
                                        // macOS平台
                                        const { execSync } = require('child_process');
                                        const stdout = execSync('/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -I').toString();
                                        const ssidMatch = / SSID: (.+)$/m.exec(stdout);
                                        if (ssidMatch && ssidMatch[1]) {
                                            ssid = ssidMatch[1].trim();
                                            console.log('通过airport获取到SSID:', ssid);
                                        }
                                    } else if (process.platform === 'linux') {
                                        // Linux平台
                                        const { execSync } = require('child_process');
                                        const stdout = execSync('iwgetid -r').toString();
                                        if (stdout.trim()) {
                                            ssid = stdout.trim();
                                            console.log('通过iwgetid获取到SSID:', ssid);
                                        }
                                    }

                                    if (ssid) {
                                        return {
                                            type: 'wifi',
                                            ssid: ssid,
                                            ip: iface.address
                                        };
                                    }
                                } catch (cmdError) {
                                    console.error('通过命令行获取SSID失败:', cmdError);
                                }
                            }

                            // 如果无法获取SSID，仍然返回wifi类型
                            console.log('无法获取SSID，返回基本WiFi信息');
                            return {
                                type: 'wifi',
                                ip: iface.address
                            };
                        }

                        // 有线网络
                        else if (name.toLowerCase().includes('ethernet') ||
                            name.toLowerCase().includes('eth')) {
                            console.log('识别为有线网络');
                            return {
                                type: 'ethernet',
                                ip: iface.address
                            };
                        }
                    }
                }
            }

            console.log('未找到有效网络接口');
            return { type: 'none' };
        } catch (error) {
            console.error('获取网络信息失败，详细错误:', error);
            return { type: 'none' };
        }
    });

    // 处理设备名称更新
    ipcMain.handle('system:setDeviceName', async (_, { deviceIp, oldName, newName }) => {
        try {
            console.log(`更新设备名称请求 - IP: ${deviceIp}, 原名称: ${oldName}, 新名称: ${newName}`);

            // 获取本机IP地址
            const localIP = MDNSService.getLocalIP();

            // 只有当修改的是本机设备时，才更新存储的设备名称
            if (deviceIp === localIP) {
                console.log(`更新本机(${localIP})设备名称: ${oldName} -> ${newName}`);
                store.set('deviceName', newName);

                // 重新发布 mDNS 服务以更新名称
                MDNSService.unpublishService();
                MDNSService.publishService();

                // 通知渲染进程本机名称已更新
                mainWindow?.webContents.send('system:deviceNameChanged', {
                    deviceIp: localIP,
                    oldName,
                    newName
                });
            } else {
                // 如果不是本机，仅通知渲染进程进行UI更新
                console.log(`更新远程设备(${deviceIp})名称: ${oldName} -> ${newName}`);
                mainWindow?.webContents.send('system:remoteDeviceNameChanged', {
                    deviceIp,
                    oldName,
                    newName
                });
            }

            return true;
        } catch (error) {
            console.error('更新设备名称失败:', error);
            return false;
        }
    });

    // 更新设备名称
    ipcMain.handle('system:updateDeviceName', async (_event, { oldName, newName }) => {
        try {
            // 通知所有窗口设备名称已更新
            mainWindow?.webContents.send('device:nameUpdated', { oldName, newName });
            return true;
        } catch (error) {
            console.error('Failed to update device name:', error);
            throw error;
        }
    });

    // 在 registerIpcHandlers 函数中添加
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

    // 添加 mdns 事件转发
    MDNSService.on('deviceFound', (device: MDNSDevice) => {
        // 防御性检查确保设备数据不为空
        if (!device) {
            console.error('收到空的设备数据，不转发');
            return;
        }

        console.log('main 进程转发设备，完整数据:', JSON.stringify(device, null, 2));
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mdns:deviceFound', device);
        }
    });

    MDNSService.on('deviceLeft', (device: MDNSDevice) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mdns:deviceLeft', device);
        }
    });

    // 添加 ping 设备的功能
    ipcMain.handle('network:pingDevice', async (_, deviceInfo) => {
        try {
            const { ip, port } = deviceInfo;
            console.log(`尝试连接设备: ${ip}:${port}`);

            // 简单的设备可用性检查
            // 注意：在实际应用中，你可能需要使用更可靠的方法
            // 例如使用 tcp-ping 或类似的库

            // 这里实现一个简单的检查
            // 如果设备有有效的IP，则可能在线
            if (ip && ip.split('.').length === 4) {
                // 为了避免真实的网络请求，这里返回模拟结果
                // 在实际应用中，应该替换为真正的网络检测逻辑
                const isAlive = true; // 固定返回在线状态

                console.log(`设备 ${ip} 检测结果: ${isAlive ? '在线' : '离线'}`);
                return isAlive;
            }

            return false;
        } catch (error) {
            console.error('检测设备状态失败:', error);
            return false; // 出错时返回离线状态
        }
    });

    // 心跳服务相关的处理程序
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

    // 设备信息相关的处理程序
    ipcMain.handle('system:getDeviceInfo', () => {
        return {
            name: store.get('deviceName'),
            id: require('os').hostname() // 使用主机名作为临时ID
        };
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

app.whenReady().then(() => {
    createWindow();

    // 启动MDNS服务
    MDNSService.publishService();

    // 启动心跳服务
    heartbeatService.start();

    // 可选: 自动开始发现设备
    // MDNSService.startDiscovery();
});

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