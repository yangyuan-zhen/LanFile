import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import { HomePage } from "./pages/Home/Home";
import { CurrentTransfers } from "./components/features/CurrentTransfers/CurrentTransfers";
import { BrowserRouter as Router } from "react-router-dom";
import { PeerJSProvider } from "./contexts/PeerJSContext";
import { NotificationProvider } from "./contexts/NotificationContext";

const App: React.FC = () => {
  return (
    <PeerJSProvider>
      <NotificationProvider>
        <>
          <Router>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </Router>

          <CurrentTransfers />
        </>
      </NotificationProvider>
    </PeerJSProvider>
  );
};

export default App;
