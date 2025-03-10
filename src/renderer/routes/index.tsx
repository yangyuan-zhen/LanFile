import React from "react";
import { HomePage } from "../pages/Home/Home";
import { SendPage } from "../pages/Send/Send";
import { ReceivePage } from "../pages/Receive/Receive";
import { StatusPage } from "../pages/Status/Status";
import { SettingsPage } from "../pages/Settings/Settings";
import { createBrowserRouter } from "react-router-dom";

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
