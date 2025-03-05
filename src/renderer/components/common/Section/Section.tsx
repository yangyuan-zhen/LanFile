import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const Section: React.FC<SectionProps> = ({
  title,
  children,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center px-4 py-1 cursor-pointer text-gray-600 hover:text-gray-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 mr-1" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-1" />
        )}
        <span className="text-xs font-medium">{title}</span>
      </div>
      {isExpanded && <div className="space-y-1">{children}</div>}
    </div>
  );
};

export default Section;
