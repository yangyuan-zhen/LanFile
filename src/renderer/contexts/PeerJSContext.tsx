import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { usePeerJS } from "../hooks/usePeerJS";
import type { FileTransfer } from "../hooks/usePeerJS";

// 创建上下文
export const PeerJSContext = createContext<
  ReturnType<typeof usePeerJS> | undefined
>(undefined);

// 创建提供者组件
export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const peerState = usePeerJS();
  const [, forceUpdate] = useState({});

  // 添加调试日志和强制更新
  useEffect(() => {
    console.log("[PeerJSContext] 传输状态更新:", peerState.transfers);

    // 每当transfers变化时，强制组件树重新渲染
    const timer = setTimeout(() => {
      forceUpdate({});
    }, 100);

    return () => clearTimeout(timer);
  }, [peerState.transfers]);

  return (
    <PeerJSContext.Provider value={peerState}>
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
