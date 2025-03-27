import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../../contexts/NotificationContext";
import { FaCheck, FaTrash } from "react-icons/fa";
import { Bell } from "lucide-react";

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, removeNotification } = useNotifications();
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // 检查是否有未读通知
    if (notifications.some((n) => !n.read)) {
      setHasUnread(true);
    }
  }, [notifications]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setHasUnread(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-600 hover:text-gray-800"
        onClick={toggleDropdown}
      >
        <Bell className="w-6 h-6" />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white rounded-md shadow-lg">
          <div className="flex justify-between items-center p-2 border-b">
            <h3 className="font-medium">通知</h3>
            {notifications.length > 0 && (
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() =>
                  notifications.forEach((n) => removeNotification(n.id))
                }
              >
                清除全部
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{notification.title}</p>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">暂无通知</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
