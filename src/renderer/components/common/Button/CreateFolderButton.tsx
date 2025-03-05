import React from "react";
import { Plus } from "lucide-react";

const CreateFolderButton: React.FC = () => {
  return (
    <div className="px-4 mb-4">
      <button className="flex items-center justify-center w-full px-4 py-3 text-white bg-[#4F46E5] rounded-lg hover:bg-[#3730A3] transition-colors">
        <Plus className="mr-2 w-5 h-5" />
        创建新文件夹
      </button>
    </div>
  );
};

export default CreateFolderButton;
