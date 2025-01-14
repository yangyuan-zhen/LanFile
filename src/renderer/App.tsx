import React, { useState } from "react";
import Header from "./components/layout/Header/Header";
import FileTransfer from "./components/features/FileTransfer/FileTransfer";
import LanDevices from "./components/features/LanDevices/LanDevices";

const App: React.FC = () => {
  const [files] = useState([
    { name: "document.pdf", status: "completed" as const },
    { name: "image.jpg", status: "in-progress" as const },
  ]);

  const [devices] = useState([
    { name: "Living Room PC", status: "online" as const },
    { name: "Kitchen Tablet", status: "offline" as const },
    { name: "Bedroom Laptop", status: "online" as const },
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        currentDevice="Current Device"
        onSettingsClick={() => console.log("Settings clicked")}
        onHelpClick={() => console.log("Help clicked")}
      />

      <main className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <FileTransfer
              files={files}
              onUpload={() => console.log("Upload clicked")}
              onDownload={() => console.log("Download clicked")}
            />
          </div>
          <div>
            <LanDevices
              devices={devices}
              onRefresh={() => console.log("Refresh clicked")}
              onDeviceSelect={(device) =>
                console.log("Selected device:", device)
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
