import React from "react";
import { HomePage } from "../pages/Home/Home";
import { SendPage } from "../pages/Send/Send";
import { ReceivePage } from "../pages/Receive/Receive";
import { StatusPage } from "../pages/Status/Status";
import { SettingsPage } from "../pages/Settings/Settings";

export interface Route {
  key: string;
  label: string;
  path: string;
  component: React.FC;
}

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
