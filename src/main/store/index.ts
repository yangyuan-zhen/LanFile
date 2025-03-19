import Store from 'electron-store';

interface StoreSchema {
    deviceName: string;
    signalingPort: number;
}

const store = new Store<StoreSchema>({
    defaults: {
        deviceName: 'Windows 10 设备',
        signalingPort: 8092
    }
});

export default store; 