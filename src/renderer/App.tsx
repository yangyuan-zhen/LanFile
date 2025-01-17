import React, { Component } from "react";
import { DeviceList } from "./components/DeviceList/DeviceList";
import { FileTransfer } from "./components/FileTransfer/FileTransfer";

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
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center">
              <img
                src="/logo.png"
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
                Current Device
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ErrorBoundary>
              <FileTransfer />
            </ErrorBoundary>
            <ErrorBoundary>
              <DeviceList />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};
