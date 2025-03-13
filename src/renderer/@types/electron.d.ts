export interface IElectronAPI {
    invoke(channel: 'heartbeat:getPort'): Promise<number>;
    invoke(channel: 'heartbeat:setPort', port: number): Promise<void>;
    invoke(channel: 'settings:getDownloadPath'): Promise<string>;
    invoke(channel: 'settings:setDownloadPath', path: string): Promise<void>;
    invoke(channel: 'dialog:openDirectory'): Promise<Electron.OpenDialogReturnValue>;
}

export interface IElectronRemote {
    dialog: {
        showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>;
    };
}

declare global {
    interface Window {
        electron: IElectronAPI;
        electronRemote: IElectronRemote;
    }
} 