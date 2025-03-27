import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { usePeerJS } from "../hooks/usePeerJS";

// 创建上下文
export const PeerJSContext = createContext<
  ReturnType<typeof usePeerJS> | undefined
>(undefined);

// 创建提供者组件
export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const peer = usePeerJS();

  // 添加调试日志
  useEffect(() => {
    console.log("PeerJSContext 传输状态更新:", peer.transfers);
  }, [peer.transfers]);

  return (
    <PeerJSContext.Provider value={peer}>{children}</PeerJSContext.Provider>
  );
};

// 创建使用钩子
export const useGlobalPeerJS = () => {
  const context = useContext(PeerJSContext);
  if (context === undefined) {
    throw new Error("useGlobalPeerJS must be used within a PeerJSProvider");
  }
  return context;
};
