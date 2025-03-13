import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { initialize } from '@electron/remote/main';

// 创建配置存储实例
const store = new Store();

// 移除初始定义的处理器，只保留在app.whenReady()中的版本
console.log("初始化应用...");

let mainWindow: BrowserWindow | null = null;

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

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
};

app.whenReady().then(() => {
    initialize(); // 初始化remote模块
    createWindow();

    // 简化版的下载路径处理器
    ipcMain.handle('settings:getDownloadPath', () => {
        try {
            console.log("settings:getDownloadPath 被调用");

            // 直接返回系统下载路径，简化问题
            const downloadsPath = app.getPath('downloads');
            console.log("系统下载路径:", downloadsPath);

            return downloadsPath;
        } catch (error) {
            console.error("获取下载路径错误:", error);
            return ""; // 返回空字符串，让渲染进程处理
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
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
}); 