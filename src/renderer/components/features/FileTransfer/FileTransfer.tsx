import React from "react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import Button from "../../common/Button";
import Card from "../../common/Card";

interface FileItem {
  name: string;
  status: "completed" | "in-progress";
}

interface FileTransferProps {
  files: FileItem[];
  onUpload: () => void;
  onDownload: () => void;
}

const FileTransfer: React.FC<FileTransferProps> = ({
  files,
  onUpload,
  onDownload,
}) => {
  return (
    <Card className="mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">文件传输</h2>
        <div className="flex space-x-4">
          <Button onClick={onUpload} className="flex items-center">
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            上传
          </Button>
          <Button
            variant="secondary"
            onClick={onDownload}
            className="flex items-center"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            下载
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-md"
          >
            <span className="text-gray-900">{file.name}</span>
            <span
              className={`text-sm ${
                file.status === "completed" ? "text-green-600" : "text-blue-600"
              }`}
            >
              {file.status === "completed" ? "已完成" : "传输中"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FileTransfer;
