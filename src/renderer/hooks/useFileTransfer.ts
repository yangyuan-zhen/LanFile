import { usePeerJS } from './usePeerJS';

// 类型定义
interface FileTransferHook {
    sendFile: (peerId: string, file: File) => Promise<string>;
    handleFileChunk: (peerId: string, data: any) => void;
    handleFileComplete: (transferId: string) => Promise<void>;
}

export const useFileTransfer = (): FileTransferHook => {
    const { sendFile, deviceId } = usePeerJS();

    return {
        sendFile,
        handleFileChunk: () => console.log("请使用 usePeerJS 中的方法"),
        handleFileComplete: async () => console.log("请使用 usePeerJS 中的方法")
    };
}; 