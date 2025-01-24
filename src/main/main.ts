import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { NetworkService } from './services/NetworkService';

let mainWindow: BrowserWindow | null = null;
let networkService: NetworkService | null = null;

function setupIpcHandlers() {
    if (!networkService) return;

    // 移除可能存在的旧处理程序
    ipcMain.removeHandler('network:getLocalService');
    ipcMain.removeHandler('network:startDiscovery');
    ipcMain.removeHandler('network:stopDiscovery');

    // 注册新的处理程序
    ipcMain.handle('network:getLocalService', () => {
        console.log('Handling getLocalService request');
        return networkService?.getLocalService();
    });

    ipcMain.handle('network:startDiscovery', () => {
        console.log('Handling startDiscovery request');
        return networkService?.startDiscovery();
    });

    ipcMain.handle('network:stopDiscovery', () => {
        console.log('Handling stopDiscovery request');
        return networkService?.stopDiscovery();
    });

    // 设置设备发现事件监听
    networkService.on('deviceFound', (device) => {
        console.log('Device found:', device);
        mainWindow?.webContents.send('network:deviceFound', device);
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

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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