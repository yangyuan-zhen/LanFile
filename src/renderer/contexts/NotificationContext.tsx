import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { transfers } = useGlobalPeerJS();

  // 计算未读数量
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 监听传输完成事件
  useEffect(() => {
    const completedTransfers = transfers.filter(
      (t) => t.status === "completed"
    );

    completedTransfers.forEach((transfer) => {
      // 检查是否已经为此传输创建了通知
      const transferNotificationExists = notifications.some((n) =>
        n.id.includes(transfer.id)
      );

      if (!transferNotificationExists) {
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
      const transferErrorNotificationExists = notifications.some((n) =>
        n.id.includes(`error-${transfer.id}`)
      );

      if (!transferErrorNotificationExists) {
        addNotification({
          title: "文件传输失败",
          message: `${transfer.name} ${
            transfer.direction === "upload" ? "上传" : "下载"
          }失败`,
          type: "error",
        });
      }
    });
  }, [transfers, notifications]);

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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllAsRead,
        markAsRead,
        clearAll,
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
