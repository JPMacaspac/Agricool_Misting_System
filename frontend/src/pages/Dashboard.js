import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaThermometerHalf,
  FaTint,
  FaExclamationTriangle,
  FaWater,
  FaClipboardList,
  FaRegCalendarAlt,
} from "react-icons/fa";
import { MdOutlineHeatPump } from "react-icons/md";

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const userName = localStorage.getItem("userName") || "Jp Macaspac";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/sensors/latest");
        setSensorData(res.data);
      } catch (err) {
        setSensorData(null);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Always render dashboard layout
  return (
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA]">
        <h1 className="text-xl font-bold">AgriCool</h1>

        <div className="relative">
          {/* Clickable user info */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-xs">{userName[0]}</span>
            </div>
            <span className="text-sm">{userName}</span>
          </div>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-md shadow-lg p-2 z-10">
              <button
                onClick={() => (window.location.href = "/profile")}
                className="block w-full text-left px-3 py-1 hover:bg-gray-700 rounded"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="block w-full text-left px-3 py-1 hover:bg-gray-700 rounded text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar + Dashboard */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="bg-gray-900 w-20 flex flex-col items-center p-4 gap-6 border-r-2 border-[#A1F1FA]">
          {/* Daily Log Icon */}
          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Daily Log"
          >
            <FaRegCalendarAlt className="text-2xl" />
          </button>

          {/* Records Icon */}
          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Records"
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <div className="flex-1"></div> {/* Spacer for bottom icons */}

          {/* Placeholder bottom icons */}
          <div className="w-6 h-6 bg-gray-600 rounded-md"></div>
        </aside>

        {/* Main Dashboard */}
        <main className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-6 text-[#A1F1FA]">
            Dashboard
          </h2>

          {/* Sensor Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
              <FaThermometerHalf className="text-red-400 text-2xl" />
              <div>
                <p className="text-sm">Temperature</p>
                <p className="text-lg font-bold">{sensorData && sensorData.temperature !== undefined ? sensorData.temperature + ' °C' : '--'}</p>
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
              <FaTint className="text-blue-400 text-2xl" />
              <div>
                <p className="text-sm">Humidity</p>
                <p className="text-lg font-bold">{sensorData && sensorData.humidity !== undefined ? sensorData.humidity + ' %' : '--'}</p>
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
              <MdOutlineHeatPump className="text-orange-400 text-2xl" />
              <div>
                <p className="text-sm">Heat Index</p>
                <p className="text-lg font-bold">{sensorData && sensorData.heatIndex !== undefined ? sensorData.heatIndex + ' °C' : '--'}</p>
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
              <FaWater className="text-cyan-400 text-2xl" />
              <div>
                <p className="text-sm">Water Level</p>
                <p className="text-lg font-bold">{sensorData && sensorData.waterLevel !== undefined ? sensorData.waterLevel + ' %' : '--'}</p>
              </div>
            </div>
          </div>

          {/* Date, Time, Pump */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg shadow-md">
              <p className="font-semibold">Date: {sensorData && sensorData.createdAt ? new Date(sensorData.createdAt).toLocaleDateString() : '--'}</p>
              <p className="font-semibold">Time: {sensorData && sensorData.createdAt ? new Date(sensorData.createdAt).toLocaleTimeString() : '--'}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
              <MdOutlineHeatPump className="text-blue-400 text-3xl" />
              <p className="text-lg font-semibold">
                Pump Status: <span className={sensorData && sensorData.pumpStatus ? "text-green-400" : "text-red-400"}>{sensorData && sensorData.pumpStatus ? "ON" : "OFF"}</span>
              </p>
            </div>
          </div>

          {/* Alert */}
          {sensorData && sensorData.pumpStatus && (
            <div className="bg-red-600 p-4 rounded-lg shadow-md flex items-center gap-2">
              <FaExclamationTriangle className="text-white text-xl" />
              <p className="font-semibold">
                ALERT: Heat Stress Detected - Cooling in Progress
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
