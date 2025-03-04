import React from "react";
import { HomePage } from "../pages/Home/Home";
import { SendPage } from "../pages/Send/Send";
import { ReceivePage } from "../pages/Receive/Receive";
import { StatusPage } from "../pages/Status/Status";
import { SettingsPage } from "../pages/Settings/Settings";
import { createBrowserRouter } from "react-router-dom";

export interface Route {
  key: string;
  label: string;
  path: string;
  component: React.FC;
}

// 这个数组用于生成底部导航
export const routes: Route[] = [
  {
    key: "home",
    label: "主页",
    path: "/",
    component: HomePage,
  },
  {
    key: "send",
    label: "发送",
    path: "/send",
    component: SendPage,
  },
  {
    key: "receive",
    label: "接收",
    path: "/receive",
    component: ReceivePage,
  },
  {
    key: "status",
    label: "状态",
    path: "/status",
    component: StatusPage,
  },
  {
    key: "settings",
    label: "设置",
    path: "/settings",
    component: SettingsPage,
  },
];

// 创建路由配置
export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/send",
    element: <SendPage />,
  },
  {
    path: "/receive",
    element: <ReceivePage />,
  },
  {
    path: "/status",
    element: <StatusPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
]);
