import React from "react";

interface ProgressProps {
  value: number;
  max: number;
  className?: string;
  color?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max,
  className = "",
  color = "bg-blue-500",
}) => {
  // 确保值在有效范围内
  const safeValue = Math.max(0, Math.min(value, max));
  const percentage = (safeValue / max) * 100;

  return (
    <div
      className={`overflow-hidden w-full h-2 bg-gray-200 rounded-full ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ease-in-out ${color}`}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={max}
      ></div>
    </div>
  );
};
