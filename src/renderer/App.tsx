import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { NotificationProvider } from "./contexts/NotificationContext";
import { PeerJSProvider } from "./contexts/PeerJSContext";
import { CurrentTransfers } from "./components/features/CurrentTransfers/CurrentTransfers";
import { FirewallAlert } from "./components/common/FirewallAlert/FirewallAlert";
import MainLayout from "./components/layout/MainLayout/MainLayout";

const App: React.FC = () => {
  return (
    <PeerJSProvider>
      <NotificationProvider>
        <MainLayout>
          <RouterProvider router={router} />
        </MainLayout>

        <CurrentTransfers />
        <FirewallAlert />
      </NotificationProvider>
    </PeerJSProvider>
  );
};

export default App;
