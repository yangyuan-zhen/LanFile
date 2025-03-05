import Store from 'electron-store';

interface StoreSchema {
    deviceName: string;
}

const store = new Store<StoreSchema>({
    defaults: {
        deviceName: 'Windows 10 设备'
    }
});

export default store; 