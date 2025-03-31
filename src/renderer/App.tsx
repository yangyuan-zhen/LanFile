import React from "react";
import { HashRouter } from "react-router-dom";
import { PeerJSProvider } from "./contexts/PeerJSContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { CurrentTransfers } from "./components/features/CurrentTransfers/CurrentTransfers";
import { FirewallAlert } from "./components/common/FirewallAlert/FirewallAlert";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import { HomePage } from "./pages/Home/Home";

const App: React.FC = () => {
  return (
    <HashRouter>
      <PeerJSProvider>
        <NotificationProvider>
          <MainLayout>
            <HomePage />
          </MainLayout>
          <CurrentTransfers />
          <FirewallAlert />
        </NotificationProvider>
      </PeerJSProvider>
    </HashRouter>
  );
};

export default App;
