// 简化的全局类型声明
declare global {
    namespace NodeJS {
        interface Global {
            webSocketSignalingService: any;
            deviceInfo: any;
            mainWindow: any;
            mdnsService: any;
        }
    }

    var webSocketSignalingService: any;
    var deviceInfo: any;
    var mainWindow: any;
    var mdnsService: any;
}

export { }; // 确保此文件被视为模块 