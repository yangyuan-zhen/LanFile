import React from "react";
import NetworkService from "../../components/features/NetworkService/NetworkService";

const Home: React.FC = () => {
  const networkInfo = {
    currentDevice: "当前在线设备",
    networkStatus: "稳定",
    networkSpeed: "100 Mbps",
    lastUpdate: "2 分钟前",
    connectedDevices: "3/4",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">仪表盘</h1>
      </div>

      <NetworkService networkInfo={networkInfo} />
    </div>
  );
};

export default Home;
