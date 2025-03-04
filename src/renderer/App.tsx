import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header/Header";
import { BottomNav } from "./components/Navigation/BottomNav";
import { useDeviceInfo } from "./hooks/useDeviceInfo";
import { HomePage } from "./pages/Home/Home";
import { SendPage } from "./pages/Send/Send";
import { ReceivePage } from "./pages/Receive/Receive";
import { StatusPage } from "./pages/Status/Status";
import { SettingsPage } from "./pages/Settings/Settings";

const App: React.FC = () => {
  const { currentDevice } = useDeviceInfo();
  const [currentTab, setCurrentTab] = useState("home");

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-50">
        <Header
          currentDevice={currentDevice.name}
          onSettingsClick={() => {}}
          onHelpClick={() => {}}
        />

        <main className="overflow-auto flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/receive" element={<ReceivePage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </BrowserRouter>
  );
};

export default App;
