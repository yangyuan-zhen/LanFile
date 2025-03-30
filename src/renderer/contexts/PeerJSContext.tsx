import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { usePeerJS } from "../hooks/usePeerJS";
import type { FileTransfer } from "../hooks/usePeerJS";

// 确保Context包含transfers
export interface PeerJSContextType {
  isReady: boolean;
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  transfers: FileTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<FileTransfer[]>>;
  deviceId: string;
  sendFile: (peerId: string, file: File) => Promise<string>;
  connectToPeer: (peerId: string) => Promise<any>;
  connections: Map<string, any>;
  addFileTransfer: (fileInfo: Omit<FileTransfer, "id">) => string;
  _updateVersion: number;
}

const PeerJSContext = createContext<PeerJSContextType | undefined>(undefined);

// 创建提供者组件
export const PeerJSProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const peerJS = usePeerJS();
  const [forceUpdate, setForceUpdate] = useState(0);

  // 使用 transfers 更新触发强制刷新
  useEffect(() => {
    if (peerJS.transfers.length > 0) {
      // 当传输列表变化时强制更新
      setForceUpdate((prev) => prev + 1);
    }
  }, [peerJS.transfers]);

  // 添加调试日志
  useEffect(() => {
    console.log("[PeerJSContext] PeerJS状态更新:", {
      transfers: peerJS.transfers,
      isReady: peerJS.isReady,
      deviceId: peerJS.deviceId,
      forceUpdate, // 记录强制更新计数
    });
  }, [peerJS.transfers, peerJS.isReady, peerJS.deviceId, forceUpdate]);

  // 创建带有强制更新版本号的值对象
  const contextValue = {
    ...peerJS,
    _updateVersion: forceUpdate, // 添加版本号以触发订阅组件更新
  };

  return (
    <PeerJSContext.Provider value={contextValue}>
      {children}
    </PeerJSContext.Provider>
  );
};

// 创建使用钩子
export const useGlobalPeerJS = () => {
  const context = useContext(PeerJSContext);
  if (context === undefined) {
    throw new Error("useGlobalPeerJS must be used within a PeerJSProvider");
  }

  // 添加调试输出，但减少频率
  useEffect(() => {
    console.log("[useGlobalPeerJS] 当前transfers状态:", {
      count: context.transfers.length,
      items: context.transfers.map((t) => ({
        id: t.id,
        progress: t.progress,
        status: t.status,
      })),
    });
  }, [context.transfers.length, context._updateVersion]);

  return context;
};
