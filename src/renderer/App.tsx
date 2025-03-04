import React, { Component, useState } from "react";
import { BottomNav } from "./components/Navigation/BottomNav";
import { routes } from "./routes";
import icon from "../assets/images/icon.svg";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useDeviceInfo } from "./hooks/useDeviceInfo";

// 错误边界组件
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-4 text-center text-red-500">
          应用出现错误，请刷新页面重试
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState("home");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { deviceName } = useDeviceInfo();

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // 3秒后停止动画
    setTimeout(() => setIsRefreshing(false), 3000);
  };

  const renderContent = () => {
    const route = routes.find((r) => r.key === currentTab);
    const Component = route?.component || routes[0].component;
    return <Component />;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center">
              <img
                src={icon}
                alt="LanFile"
                className="w-8 h-8"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                }}
              />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">
                LanFile
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">当前设备：</span>
              <span className="text-sm font-medium text-gray-900">
                {deviceName}
              </span>
              <motion.button
                className="p-1 text-blue-500 hover:text-blue-600"
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{
                  duration: 2,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                }}
                onClick={handleRefresh}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </header>

        <main className="pb-16">
          <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
            {renderContent()}
          </div>
        </main>

        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </ErrorBoundary>
  );
};
