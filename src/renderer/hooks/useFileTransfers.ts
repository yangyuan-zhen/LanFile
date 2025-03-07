import { useState } from "react";

export interface FileTransfer {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    transferredSize: number;
    speed: string;
    direction: "upload" | "download";
    sourceDevice?: string;
    targetDevice?: string;
    progress: number;
    timeRemaining: string;
}

export const useFileTransfers = () => {
    // 临时使用模拟数据，实际应从服务获取
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);

    return { transfers, setTransfers };
}; 