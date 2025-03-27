import React, { useState } from "react";
import { ChevronLeft, Image, FileVideo, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileTransferButton } from "../../components/FileTransfer";

interface FileItem {
  id: string;
  name: string;
  size: string;
  type: "image" | "video" | "document";
}

export const SendPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDevice, setSelectedDevice] = useState<{
    id: string;
    name: string;
    ip: string;
  }>({
    id: "unknown",
    name: "未知设备",
    ip: "127.0.0.1",
  });
  const [activeTab, setActiveTab] = useState<
    "all" | "images" | "videos" | "documents"
  >("all");

  const files: FileItem[] = [
    { id: "1", name: "Vacation Photo.jpg", size: "2.4 MB", type: "image" },
    {
      id: "2",
      name: "Project Presentation.pdf",
      size: "3.8 MB",
      type: "document",
    },
    { id: "3", name: "Family Video.mp4", size: "18.2 MB", type: "video" },
    { id: "4", name: "Meeting Notes.docx", size: "1.2 MB", type: "document" },
    { id: "5", name: "Screenshot.png", size: "1.8 MB", type: "image" },
    { id: "6", name: "Resume.pdf", size: "0.9 MB", type: "document" },
    { id: "7", name: "Birthday Party.mp4", size: "25.6 MB", type: "video" },
  ];

  const filteredFiles = files.filter((file) => {
    if (activeTab === "all") return true;
    return file.type === activeTab.slice(0, -1); // Remove 's' from end
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-8 h-8 text-blue-500" />;
      case "video":
        return <FileVideo className="w-8 h-8 text-blue-500" />;
      case "document":
        return <FileText className="w-8 h-8 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold">Send Files</h1>
        </div>
      </div>

      {/* Device Selection */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Sending to:</span>
          <button
            className="text-sm font-medium text-blue-500"
            onClick={() => navigate("/")}
          >
            Change
          </button>
        </div>
        <div className="mt-1 text-base font-medium">{selectedDevice.name}</div>
      </div>

      {/* Tabs */}
      <div className="flex p-4 space-x-4 bg-white border-b border-gray-200">
        {["All", "Images", "Videos", "Documents"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === tab.toLowerCase()
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(tab.toLowerCase() as any)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* File List */}
      <div className="overflow-auto flex-1">
        <div className="p-4 space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center p-4 bg-white rounded-lg border border-gray-200"
            >
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="ml-4">{getFileIcon(file.type)}</div>
              <div className="flex-1 ml-4">
                <div className="font-medium text-gray-900">{file.name}</div>
                <div className="text-sm text-gray-500">{file.size}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Files Button */}
      <div className="p-4 bg-white">
        <button className="flex justify-center items-center p-3 w-full text-blue-500 rounded-lg border-2 border-blue-500 border-dashed transition-colors hover:bg-blue-50">
          <Plus className="mr-2 w-6 h-6" />
          <span className="font-medium">Add Files</span>
        </button>
      </div>

      <FileTransferButton targetDevice={selectedDevice.name} />
    </div>
  );
};
