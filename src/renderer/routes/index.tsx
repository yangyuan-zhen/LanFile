import React from "react";
import { HomePage } from "../pages/Home/Home";
import { createBrowserRouter } from "react-router-dom";

// 创建路由配置
export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
]);
