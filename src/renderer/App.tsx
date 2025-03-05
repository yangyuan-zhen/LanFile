import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import Home from "./pages/Home/Home";

const App: React.FC = () => {
  return (
    <MainLayout>
      <Home />
    </MainLayout>
  );
};

export default App;
