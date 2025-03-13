import React from "react";

interface FileItem {
  id: string;
  name: string;
  type: string; // 文件类型，如'pdf', 'xlsx', 'html'等
  uploadDate: string;
  lastModified: string;
  size: string;
}

interface FileListProps {
  files: FileItem[];
}

const FileList: React.FC<FileListProps> = ({
  files = [
    {
      id: "1",
      name: "年度报告-Q4-2023.pdf",
      type: "pdf",
      uploadDate: "2023-12-02",
      lastModified: "1小时前",
      size: "1.3 MB",
    },
    {
      id: "2",
      name: "客户满意度调查结果.xlsx",
      type: "xlsx",
      uploadDate: "2023-12-02",
      lastModified: "1小时前",
      size: "2.1 MB",
    },
    {
      id: "3",
      name: "销售演示模板.html",
      type: "html",
      uploadDate: "2023-12-03",
      lastModified: "15分钟前",
      size: "0.8 MB",
    },
  ],
}) => {
  // 文件类型图标映射
  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return (
          <div className="flex justify-center items-center w-8 h-8 bg-red-100 rounded-lg">
            <span className="text-xs font-bold text-red-500">PDF</span>
          </div>
        );
      case "xlsx":
        return (
          <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg">
            <span className="text-xs font-bold text-green-500">XLS</span>
          </div>
        );
      case "html":
        return (
          <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
            <span className="text-xs font-bold text-blue-500">HTML</span>
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

  // 处理文件操作
  const handleFileAction = (action: string, fileId: string) => {
    console.log(`对文件 ${fileId} 执行操作: ${action}`);
    // TODO: 实现文件操作逻辑
  };

  return (
    <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">全部文件</h3>
      <p className="mb-4 text-sm text-gray-500">
        您存储的所有文件都会在这里显示。
      </p>

      <div className="relative">
        <div className="w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="text-xs text-gray-700 uppercase border-b">
              <tr>
                <th scope="col" className="p-4">
                  <div className="flex items-center">
                    <input
                      id="checkbox-all"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="checkbox-all" className="sr-only">
                      checkbox
                    </label>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3">
                  文件名
                </th>
                <th scope="col" className="px-6 py-3">
                  上传日期
                </th>
                <th scope="col" className="px-6 py-3">
                  最后更新
                </th>
                <th scope="col" className="px-6 py-3">
                  大小
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="p-4 w-4">
                    <div className="flex items-center">
                      <input
                        id={`checkbox-${file.id}`}
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`checkbox-${file.id}`}
                        className="sr-only"
                      >
                        checkbox
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getFileIcon(file.type)}
                      <span className="ml-2 font-medium text-gray-900">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{file.uploadDate}</td>
                  <td className="px-6 py-4">{file.lastModified}</td>
                  <td className="px-6 py-4">{file.size}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleFileAction("download", file.id)}
                        className="p-1 text-blue-500 rounded hover:bg-blue-50"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          ></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleFileAction("share", file.id)}
                        className="p-1 text-green-500 rounded hover:bg-green-50"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          ></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleFileAction("more", file.id)}
                        className="p-1 text-gray-500 rounded hover:bg-gray-100"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FileList;
