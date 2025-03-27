import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import { HomePage } from "./pages/Home/Home";
import { CurrentTransfers } from "./components/features/CurrentTransfers/CurrentTransfers";
import { BrowserRouter as Router } from "react-router-dom";
import { PeerJSProvider } from "./contexts/PeerJSContext";

const App: React.FC = () => {
  return (
    <PeerJSProvider>
      <>
        <Router>
          <MainLayout>
            <HomePage />
          </MainLayout>
        </Router>

        <CurrentTransfers />
      </>
    </PeerJSProvider>
  );
};

export default App;
