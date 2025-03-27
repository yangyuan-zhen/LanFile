import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import { HomePage } from "./pages/Home/Home";
import { CurrentTransfers } from "./components/features/CurrentTransfers/CurrentTransfers";

const App: React.FC = () => {
  return (
    <MainLayout>
      <HomePage />
      <CurrentTransfers />
    </MainLayout>
  );
};

export default App;
