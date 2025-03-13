import React, { useState, forwardRef } from "react";
import { FolderUp, X } from "lucide-react";

interface FileUploaderProps {
  onFileSelect?: (files: FileList) => void;
}

interface PreviewFile {
  id: string;
  file: File;
  preview?: string;
}

const FileUploader = forwardRef<HTMLInputElement, FileUploaderProps>(
  ({ onFileSelect }, ref) => {
    // 添加状态来跟踪已选择的文件
    const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);

    // 处理文件上传
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        console.log("选择了文件:", files);

        // 将FileList转换为数组并创建预览
        const newFiles = Array.from(files).map((file) => ({
          id: `${file.name}-${Date.now()}`,
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        // 如果有提供回调函数，则调用它
        if (onFileSelect) {
          onFileSelect(files);
        }
      }
    };

    // 处理拖放文件
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        console.log("拖放了文件:", files);

        // 将FileList转换为数组并创建预览
        const newFiles = Array.from(files).map((file) => ({
          id: `${file.name}-${Date.now()}`,
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        // 如果有提供回调函数，则调用它
        if (onFileSelect) {
          onFileSelect(files);
        }
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // 删除文件
    const handleRemoveFile = (id: string) => {
      setSelectedFiles((prev) => {
        // 找到要删除的文件
        const fileToRemove = prev.find((f) => f.id === id);

        // 如果有预览URL，需要释放
        if (fileToRemove?.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }

        return prev.filter((f) => f.id !== id);
      });
    };

    // 清理组件卸载时的预览URL
    React.useEffect(() => {
      return () => {
        selectedFiles.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, []);

    // 获取文件图标
    const getFileTypeIcon = (fileName: string) => {
      const extension = fileName.split(".").pop()?.toLowerCase();

      switch (extension) {
        case "pdf":
          return (
            <div className="flex justify-center items-center w-8 h-8 bg-red-100 rounded-lg">
              <span className="text-xs font-bold text-red-500">PDF</span>
            </div>
          );
        case "doc":
        case "docx":
          return (
            <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-500">DOC</span>
            </div>
          );
        case "xls":
        case "xlsx":
          return (
            <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg">
              <span className="text-xs font-bold text-green-500">XLS</span>
            </div>
          );
        default:
          return (
            <div className="flex justify-center items-center w-8 h-8 bg-gray-100 rounded-lg">
              <span className="text-xs font-bold text-gray-500">文件</span>
            </div>
          );
      }
    };

    return (
      <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
        <div className="text-center">
          <h3 className="mb-1 text-lg font-semibold text-gray-800">
            上传您的文件
          </h3>
          <p className="mb-6 text-sm text-gray-500">
            拖放文件到此区域或点击选择
          </p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* 左侧上传区域 */}
          <div className="flex-1 min-w-0">
            <div
              className="flex flex-col justify-center items-center p-10 w-full h-full rounded-lg border-2 border-gray-200 border-dashed transition-colors cursor-pointer hover:border-blue-300"
              onClick={() => document.getElementById("file-upload")?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="p-4 mb-4 bg-blue-50 rounded-full">
                <FolderUp size={40} className="text-blue-500" />
              </div>
              <p className="text-sm text-gray-500">拖放文件至此处</p>
              <input
                id="file-upload"
                type="file"
                ref={ref}
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* 右侧预览区域 */}
          <div className="flex-1 min-w-0">
            <div
              className="overflow-y-auto p-4 h-full rounded-lg border border-gray-200"
              style={{ maxHeight: "300px" }}
            >
              <h4 className="mb-3 font-medium text-gray-700">已选择的文件</h4>

              {selectedFiles.length === 0 ? (
                <div className="flex justify-center items-center h-32 text-gray-400">
                  暂无选择的文件
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedFiles.map((fileItem) => (
                    <li
                      key={fileItem.id}
                      className="flex justify-between items-center p-2 rounded-lg border border-gray-100"
                    >
                      <div className="flex overflow-hidden items-center">
                        {fileItem.preview ? (
                          <img
                            src={fileItem.preview}
                            alt={fileItem.file.name}
                            className="object-cover mr-2 w-8 h-8 rounded"
                          />
                        ) : (
                          <div className="mr-2">
                            {getFileTypeIcon(fileItem.file.name)}
                          </div>
                        )}
                        <span className="text-sm truncate">
                          {fileItem.file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(fileItem.id)}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default FileUploader;
