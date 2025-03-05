import React, { useState } from "react";
import {
  FileText,
  Home,
  Image,
  Archive,
  Globe,
  Trash2,
  Archive as ArchiveIcon,
} from "lucide-react";
import SectionHeader from "../../common/SectionHeader/SectionHeader";

const FileCategories: React.FC = () => {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [networkExpanded, setNetworkExpanded] = useState(true);

  const localFiles = [
    { icon: FileText, name: "工作", count: 12 },
    { icon: Home, name: "个人", count: 16 },
    { icon: Globe, name: "项目", count: 11 },
  ];

  const commonFiles = [
    { icon: FileText, name: "电子表格", count: 18 },
    { icon: Archive, name: "压缩文件", count: 9 },
    { icon: Image, name: "图片", count: 21 },
  ];

  const systemFiles = [
    { icon: Trash2, name: "回收站" },
    { icon: ArchiveIcon, name: "归档" },
  ];

  const renderCategory = (item: any) => (
    <a
      key={item.name}
      href="#"
      className="flex items-center px-6 py-2 text-base text-gray-600 hover:bg-gray-50"
    >
      <item.icon className="mr-3 w-4 h-4 text-gray-400" />
      <span>{item.name}</span>
      {item.count !== null && item.count !== undefined && (
        <span className="ml-auto text-sm text-gray-400">{item.count}</span>
      )}
    </a>
  );

  return (
    <nav className="overflow-y-auto flex-1">
      <div className="space-y-1">
        <div>
          <SectionHeader
            title="本地文件"
            expanded={localExpanded}
            onToggle={() => setLocalExpanded(!localExpanded)}
          />
          {localExpanded && <div>{localFiles.map(renderCategory)}</div>}
        </div>

        <div>
          <SectionHeader
            title="局域网文件"
            expanded={networkExpanded}
            onToggle={() => setNetworkExpanded(!networkExpanded)}
          />
          {networkExpanded && <div>{commonFiles.map(renderCategory)}</div>}
        </div>
      </div>

      <div className="pt-6">{systemFiles.map(renderCategory)}</div>
    </nav>
  );
};

export default FileCategories;
