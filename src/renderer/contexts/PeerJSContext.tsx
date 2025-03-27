import React, { createContext, useContext, ReactNode } from "react";
import { usePeerJS } from "../hooks/usePeerJS";

// 创建上下文
export const PeerJSContext = createContext<
  ReturnType<typeof usePeerJS> | undefined
>(undefined);

// 创建提供者组件
export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const peerJSState = usePeerJS();

  // 添加调试日志，监控状态变化
  React.useEffect(() => {
    console.log("PeerJS状态更新:", peerJSState.transfers);
  }, [peerJSState.transfers]);

  return (
    <PeerJSContext.Provider value={peerJSState}>
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
  return context;
};
