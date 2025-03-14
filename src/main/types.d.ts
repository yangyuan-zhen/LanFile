import { BrowserWindow } from 'electron';

declare global {
    namespace NodeJS {
        interface Global {
            mainWindow?: BrowserWindow;
        }
    }
} 