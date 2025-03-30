import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { usePeerJS } from "../hooks/usePeerJS";
import type { FileTransfer } from "../hooks/usePeerJS";

// 确保Context包含transfers
interface PeerJSContextType {
  isReady: boolean;
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  transfers: FileTransfer[];
  deviceId: string;
  sendFile: (peerId: string, file: File) => Promise<string>;
  connectToPeer: (peerId: string) => Promise<any>;
  connections: Map<string, any>;
  addFileTransfer: (fileInfo: Omit<FileTransfer, "id">) => string;
}

const PeerJSContext = createContext<PeerJSContextType | undefined>(undefined);

// 创建提供者组件
export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const peerJS = usePeerJS();

  // 添加这行代码查看完整的 peerJS 对象结构
  console.log("[PeerJSProvider] 完整的peerJS对象:", Object.keys(peerJS));

  // 添加调试日志
  useEffect(() => {
    console.log("[PeerJSContext] PeerJS状态更新:", {
      transfers: peerJS.transfers,
      isReady: peerJS.isReady,
      deviceId: peerJS.deviceId,
    });
  }, [peerJS.transfers, peerJS.isReady, peerJS.deviceId]);

  return (
    <PeerJSContext.Provider value={peerJS}>{children}</PeerJSContext.Provider>
  );
};

// 创建使用钩子
export const useGlobalPeerJS = () => {
  const context = useContext(PeerJSContext);
  if (context === undefined) {
    throw new Error("useGlobalPeerJS must be used within a PeerJSProvider");
  }

  // 添加调试输出
  console.log("[useGlobalPeerJS] 当前context:", context);
  return context;
};
