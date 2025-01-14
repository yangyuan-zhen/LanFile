import { app, BrowserWindow } from 'electron';
import path from 'path';
import { WebSocketServer } from './services/WebSocketServer';

let mainWindow: BrowserWindow | null = null;
let wsServer: WebSocketServer | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3001');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // 初始化WebSocket服务器
    wsServer = new WebSocketServer(mainWindow);

    // 将服务器信息发送给渲染进程
    const serverInfo = {
        port: wsServer.getPort(),
        addresses: wsServer.getLocalIPs()
    };
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('server-info', serverInfo);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (wsServer) {
            wsServer.close();
            wsServer = null;
        }
    });
}

app.whenReady().then(createWindow);

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