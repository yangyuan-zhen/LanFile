import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import { HomePage } from "./pages/Home/Home";

const App: React.FC = () => {
  return (
    <MainLayout>
      <HomePage />
    </MainLayout>
  );
};

export default App;
