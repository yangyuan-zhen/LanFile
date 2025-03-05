import React from "react";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import FileTransfer from "./components/features/FileTransfer/FileTransfer";

const App: React.FC = () => {
  return (
    <MainLayout>
      <div className="container px-6 py-8 mx-auto">
        <FileTransfer
          files={[]}
          onUpload={() => console.log("upload")}
          onDownload={() => console.log("download")}
        />
      </div>
    </MainLayout>
  );
};

export default App;
