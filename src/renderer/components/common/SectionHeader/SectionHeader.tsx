import React from "react";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  expanded,
  onToggle,
}) => {
  return (
    <div
      className="flex justify-between items-center px-6 py-2 cursor-pointer hover:bg-gray-50"
      onClick={onToggle}
    >
      <span className="text-base text-gray-500">{title}</span>
      <ChevronRight
        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
          expanded ? "rotate-90" : ""
        }`}
      />
    </div>
  );
};

export default SectionHeader;
