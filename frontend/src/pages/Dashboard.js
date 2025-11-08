import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import {
  FaThermometerHalf,
  FaTint,
  FaExclamationTriangle,
  FaWater,
  FaClipboardList,
  FaRegCalendarAlt,
  FaChartBar,
} from "react-icons/fa";
import { MdOutlineHeatPump } from "react-icons/md";
import RealtimeChart from '../components/RealtimeChart';

// Local heat index helper (duplicate of chart util to avoid extra imports)
function computeHeatIndexCelsius(tempC, humidity) {
  const T = tempC * 9 / 5 + 32;
  const R = humidity;

  const HI = -42.379
    + 2.04901523 * T
    + 10.14333127 * R
    - 0.22475541 * T * R
    - 0.00683783 * T * T
    - 0.05481717 * R * R
    + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R
    - 0.00000199 * T * T * R * R;

  const hiC = (HI - 32) * 5 / 9;
  return Number(hiC.toFixed(2));
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [currentMistingLogId, setCurrentMistingLogId] = useState(null);
  const previousPumpStatus = useRef(false);
  
  const userName = localStorage.getItem("userName") || "Jp Macaspac";
  const profilePicture = localStorage.getItem("profilePicture") || "";
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://192.168.1.16:8081";

  useEffect(() => {
    // fetch initial data once; realtime SSE will update after this
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/sensors/latest`);
        setSensorData(res.data);
        if (res.data && res.data.pumpStatus) {
          previousPumpStatus.current = true;
        }
      } catch (err) {
        setSensorData(null);
      }
    };
    fetchData();
    return () => { };
  }, [API_BASE]);

  // SSE realtime subscription (updates sensorData immediately)
  useEffect(() => {
    const streamUrl = `${API_BASE}/api/sensors/stream`;
    let es;
    try {
      es = new EventSource(streamUrl);
    } catch (err) {
      console.warn('EventSource failed to start', err);
      return;
    }

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setSensorData(data);
      } catch (e) {
        // ignore
      }
    };

    es.onerror = (ev) => {
      try { es.close(); } catch (e) { }
    };

    return () => {
      try { es && es.close(); } catch (e) { }
    };
  }, [API_BASE]);

  // Track pump status changes and log misting events
  useEffect(() => {
    if (!sensorData) return;

    const currentPumpStatus = sensorData.pumpStatus;
    const wasPreviouslyOn = previousPumpStatus.current;

    // Pump just turned ON - create a new misting log
    if (currentPumpStatus && !wasPreviouslyOn) {
      const logMistingStart = async () => {
        try {
          console.log('Pump turned ON - Starting misting log');
          const response = await axios.post(`${API_BASE}/api/misting/start`, {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            heatIndex: sensorData.heatIndex,
            waterLevel: sensorData.waterLevel
          });
          setCurrentMistingLogId(response.data.logId);
          console.log('Misting event started, log ID:', response.data.logId);
        } catch (error) {
          console.error('Failed to log misting start:', error);
        }
      };
      logMistingStart();
    }

    // Pump just turned OFF - update the existing misting log
    if (!currentPumpStatus && wasPreviouslyOn && currentMistingLogId) {
      const logMistingEnd = async () => {
        try {
          console.log('Pump turned OFF - Ending misting log');
          await axios.put(`${API_BASE}/api/misting/end/${currentMistingLogId}`, {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            heatIndex: sensorData.heatIndex,
            waterLevel: sensorData.waterLevel
          });
          console.log('Misting event ended, log ID:', currentMistingLogId);
          setCurrentMistingLogId(null);
        } catch (error) {
          console.error('Failed to log misting end:', error);
        }
      };
      logMistingEnd();
    }

    previousPumpStatus.current = currentPumpStatus;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorData?.pumpStatus, currentMistingLogId, API_BASE]);

  return (
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA]">
        <h1 className="text-xl font-bold">AgriCool</h1>

        <div className="relative">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{userName[0]}</span>
              )}
            </div>
            <span className="text-sm">{userName}</span>
          </div>

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
          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Dashboard"
            onClick={() => navigate('/dashboard')}
          >
            <FaChartBar className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Daily Log"
            onClick={() => navigate('/daily-logs')}
          >
            <FaRegCalendarAlt className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Records"
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <div className="flex-1"></div>

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
                <p className="text-lg font-bold">{sensorData && (sensorData.heatIndex !== undefined && sensorData.heatIndex !== null ? sensorData.heatIndex + ' °C' : (sensorData.temperature !== undefined && sensorData.humidity !== undefined ? (computeHeatIndexCelsius(Number(sensorData.temperature), Number(sensorData.humidity)) + ' °C') : '--'))}</p>
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

          {/* Realtime chart — uses live sensorData (keeps a short history) */}
          <div className="mb-6">
            <RealtimeChart sensor={sensorData} />
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