import { app, BrowserWindow } from 'electron';
import path from 'path';
import { NetworkService } from './services/NetworkService';

let mainWindow: BrowserWindow | null = null;
let networkService: NetworkService | null = null;

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
    networkService.start();

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