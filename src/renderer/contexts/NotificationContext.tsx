import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useGlobalPeerJS } from "./PeerJSContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  read: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "read" | "timestamp">
  ) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  deleteNotification?: (id: string) => void;
  dismissNotification?: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { transfers } = useGlobalPeerJS();

  // 使用 ref 跟踪已通知的传输
  const notifiedTransfers = useRef<Set<string>>(new Set());
  const notifiedErrors = useRef<Set<string>>(new Set());

  // 计算未读数量
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 监听传输完成事件 - 移除 notifications 依赖
  useEffect(() => {
    const completedTransfers = transfers.filter(
      (t) => t.status === "completed"
    );

    completedTransfers.forEach((transfer) => {
      // 使用 ref 而不是检查通知数组
      if (!notifiedTransfers.current.has(transfer.id)) {
        notifiedTransfers.current.add(transfer.id);

        addNotification({
          title: "文件传输完成",
          message: `${transfer.name} 已${
            transfer.direction === "upload" ? "上传" : "下载"
          }完成`,
          type: "success",
        });
      }
    });

    // 监听传输错误
    const errorTransfers = transfers.filter((t) => t.status === "error");

    errorTransfers.forEach((transfer) => {
      const errorId = `error-${transfer.id}`;

      if (!notifiedErrors.current.has(errorId)) {
        notifiedErrors.current.add(errorId);

        addNotification({
          title: "文件传输失败",
          message: `${transfer.name} ${
            transfer.direction === "upload" ? "上传" : "下载"
          }失败`,
          type: "error",
        });
      }
    });
  }, [transfers]); // 移除 notifications 依赖项

  // 添加通知
  const addNotification = (
    notification: Omit<Notification, "id" | "read" | "timestamp">
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      read: false,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  // 标记全部已读
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  // 标记单个通知已读
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // 清除所有通知
  const clearAll = () => {
    setNotifications([]);
  };

  // 添加 removeNotification 实现
  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllAsRead,
        markAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// 使用钩子
export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }

  return context;
};
