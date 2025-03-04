import React from "react";
import { motion } from "framer-motion";

interface Device {
  name: string;
  distance: number; // 0-100 表示距离中心的百分比
  angle: number; // 0-360 表示设备的角度
}

interface RadarProps {
  devices: Device[];
  currentDevice: string;
}

export const Radar: React.FC<RadarProps> = ({ devices, currentDevice }) => {
  return (
    <div className="relative mx-auto w-full max-w-md aspect-square">
      {/* 波纹动画 */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute inset-0 rounded-full border border-blue-100"
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: index * 1.3,
            ease: "linear",
          }}
        />
      ))}

      {/* 静态圆圈 */}
      <div className="absolute inset-0 rounded-full border border-gray-100" />
      <div className="absolute inset-[25%] rounded-full border border-gray-100" />
      <div className="absolute inset-[50%] rounded-full border border-gray-100" />

      {/* 中心设备 */}
      <div className="absolute inset-[42%] flex items-center justify-center">
        <div className="flex justify-center items-center w-full h-full text-xs text-white bg-blue-500 rounded-full">
          <span className="text-center">当前设备</span>
        </div>
      </div>

      {/* 周围设备 */}
      {devices.map((device) => (
        <div
          key={device.name}
          className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${
              50 + Math.cos((device.angle * Math.PI) / 180) * device.distance
            }%`,
            top: `${
              50 + Math.sin((device.angle * Math.PI) / 180) * device.distance
            }%`,
          }}
        >
          <div className="p-1 text-xs text-center text-gray-600">
            <div className="mx-auto mb-1 w-2 h-2 bg-blue-500 rounded-full" />
            {device.name}
          </div>
        </div>
      ))}

      {/* 扫描中文本 */}
      <div className="absolute right-0 left-0 -bottom-8 text-sm text-center text-gray-500">
        正在扫描设备...
      </div>
    </div>
  );
};
