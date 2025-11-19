import React, { useState, useEffect, useRef } from "react";
import DashboardAnalytics from '../components/DashboardAnalytics';
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
  FaPowerOff,
  FaPlay,
  FaRedo,
  FaClock,
  FaFire,
  FaSnowflake,
} from "react-icons/fa";
import { MdOutlineHeatPump } from "react-icons/md";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

// Local heat index helper
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

// Realtime Chart Component (Fixed - no external plugin needed)
function RealtimeChart({ sensor }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!sensor) return;
    const t = sensor.createdAt || new Date().toISOString();
    const temp = sensor.temperature ?? null;
    const hum = sensor.humidity ?? null;
    const heatIndex = sensor.heatIndex !== undefined && sensor.heatIndex !== null
      ? sensor.heatIndex
      : (temp !== null && hum !== null ? computeHeatIndexCelsius(Number(temp), Number(hum)) : null);

    setHistory((h) => {
      const next = [...h, { t, temp, hum, heatIndex }];
      if (next.length > 30) next.shift();
      return next;
    });
  }, [sensor]);

  const labels = history.map((p) => {
    try {
      return new Date(p.t).toLocaleTimeString();
    } catch (e) {
      return p.t;
    }
  });

  // Create danger zone dataset (horizontal line at 35°C)
  const dangerLineData = labels.map(() => 35);

  const data = {
    labels,
    datasets: [
      {
        label: 'Danger Zone (35°C)',
        data: dangerLineData,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
        tension: 0,
      },
      {
        label: 'Temperature (°C)',
        data: history.map((p) => (p.temp !== null ? Number(p.temp) : null)),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255,107,107,0.2)',
        tension: 0.3,
        spanGaps: true,
        borderWidth: 2,
      },
      {
        label: 'Humidity (%)',
        data: history.map((p) => (p.hum !== null ? Number(p.hum) : null)),
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        tension: 0.3,
        spanGaps: true,
        borderWidth: 2,
      },
      {
        label: 'Heat Index (°C)',
        data: history.map((p) => (p.heatIndex !== null ? Number(p.heatIndex) : null)),
        borderColor: '#F6C85F',
        backgroundColor: 'rgba(246,200,95,0.12)',
        tension: 0.3,
        spanGaps: true,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        labels: { color: '#cbd5e1' },
        position: 'top',
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { 
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      y: { 
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
    },
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-md h-64">
      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-2">Realtime Monitor (Last 30 readings)</h4>
      <div className="w-full h-[200px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

// Analytics Component
function MistingAnalytics({ apiBase, sensorData }) {
  const [analytics, setAnalytics] = useState({
    todayMistingCount: 0,
    todayMistingDuration: 0,
    avgTemperature: 0,
    avgHumidity: 0,
    peakTemperature: 0,
    lowestTemperature: 0,
    totalRuntime: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all misting logs (we'll filter for today on frontend)
        const response = await axios.get(`${apiBase}/api/misting/logs`);
        const allLogs = response.data;

        // Filter for today's logs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const logs = allLogs.filter(log => {
          const logDate = new Date(log.startTime);
          return logDate >= today;
        });

        if (logs && logs.length > 0) {
          // Calculate total duration
          const totalDuration = logs.reduce((sum, log) => {
            if (log.startTime && log.endTime) {
              const duration = (new Date(log.endTime) - new Date(log.startTime)) / 1000 / 60; // minutes
              return sum + duration;
            }
            return sum;
          }, 0);

          // Calculate avg temp and humidity
          const validLogs = logs.filter(log => log.startTemperature && log.startHumidity);
          const avgTemp = validLogs.length > 0 
            ? validLogs.reduce((sum, log) => sum + (log.startTemperature || 0), 0) / validLogs.length 
            : 0;
          const avgHum = validLogs.length > 0 
            ? validLogs.reduce((sum, log) => sum + (log.startHumidity || 0), 0) / validLogs.length 
            : 0;

          // Find peak and lowest temp
          const temps = logs.map(log => log.startTemperature || 0).filter(t => t > 0);
          const peakTemp = temps.length > 0 ? Math.max(...temps) : 0;
          const lowestTemp = temps.length > 0 ? Math.min(...temps) : 0;

          setAnalytics({
            todayMistingCount: logs.length,
            todayMistingDuration: totalDuration,
            avgTemperature: avgTemp,
            avgHumidity: avgHum,
            peakTemperature: peakTemp,
            lowestTemperature: lowestTemp,
            totalRuntime: totalDuration,
          });
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [apiBase]);

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-bold text-[#A1F1FA] mb-4">Today's Analytics</h3>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Misting Count */}
        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <MdOutlineHeatPump className="text-blue-400 text-xl" />
            <p className="text-sm text-gray-400">Misting Events</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.todayMistingCount}</p>
          <p className="text-xs text-gray-500 mt-1">activations today</p>
        </div>

        {/* Total Runtime */}
        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <FaClock className="text-green-400 text-xl" />
            <p className="text-sm text-gray-400">Total Runtime</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.todayMistingDuration.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">minutes active</p>
        </div>

        {/* Peak Temperature */}
        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <FaFire className="text-red-400 text-xl" />
            <p className="text-sm text-gray-400">Peak Temp</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.peakTemperature.toFixed(1)}°C</p>
          <p className="text-xs text-gray-500 mt-1">highest today</p>
        </div>

        {/* Average Temperature */}
        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-center gap-2 mb-2">
            <FaThermometerHalf className="text-orange-400 text-xl" />
            <p className="text-sm text-gray-400">Avg Temp</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.avgTemperature > 0 ? analytics.avgTemperature.toFixed(1) + '°C' : '0.0°C'}</p>
          <p className="text-xs text-gray-500 mt-1">during misting</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Avg Humidity</p>
          <p className="text-lg font-bold text-blue-300">{analytics.avgHumidity > 0 ? analytics.avgHumidity.toFixed(1) + '%' : '0.0%'}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Lowest Temp</p>
          <p className="text-lg font-bold text-cyan-300">{analytics.lowestTemperature.toFixed(1)}°C</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Current Water</p>
          <p className="text-lg font-bold text-teal-300">{sensorData?.waterLevel || 0}%</p>
        </div>
      </div>
    </div>
  );
}

// Notification Panel Component (Simple Bell Icon)
function NotificationPanel({ apiBase }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${apiBase}/api/notifications/recent`);
        setNotifications(response.data || []);
      } catch (error) {
        console.log('Notifications not available');
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [apiBase]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-gray-700 rounded-full transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl p-4 z-20 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-lg mb-3 text-[#A1F1FA]">Notifications</h3>
          {notifications.length > 0 ? (
            notifications.slice(0, 5).map((notif, idx) => (
              <div key={idx} className="p-3 bg-gray-700 rounded mb-2 text-sm">
                <p className="text-white">{notif.message || 'System notification'}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Recent'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No new notifications</p>
          )}
        </div>
      )}
    </div>
  );
}

// System Status Component
function SystemStatus({ sensorData, pumpMode }) {
  const getStatusColor = () => {
    if (!sensorData) return 'bg-gray-600';
    const temp = sensorData.temperature;
    if (temp >= 35) return 'bg-red-600';
    if (temp >= 30) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getStatusText = () => {
    if (!sensorData) return 'No Data';
    const temp = sensorData.temperature;
    if (temp >= 35) return 'Critical - Misting Active';
    if (temp >= 30) return 'Warning - Approaching Threshold';
    return 'Normal - System Standby';
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-md mb-6 border-2 border-[#A1F1FA]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${getStatusColor()} animate-pulse`}></div>
          <div>
            <p className="text-sm text-gray-400">System Status</p>
            <p className="text-lg font-bold text-white">{getStatusText()}</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {/* Date and Time */}
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Date & Time</p>
            <div className="flex gap-2 items-center">
              <p className="font-bold text-[#A1F1FA] text-sm">
                {sensorData?.createdAt ? new Date(sensorData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
              </p>
              <span className="text-gray-500">|</span>
              <p className="font-semibold text-gray-300 text-sm">
                {sensorData?.createdAt ? new Date(sensorData.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
              </p>
            </div>
          </div>
          {/* Mode */}
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <p className="text-xs text-gray-400">Mode</p>
            <p className="font-bold text-[#A1F1FA]">{pumpMode.toUpperCase()}</p>
          </div>
          {/* Pump Status */}
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <p className="text-xs text-gray-400">Pump</p>
            <p className={`font-bold ${sensorData?.pumpStatus ? 'text-green-400' : 'text-red-400'}`}>
              {sensorData?.pumpStatus ? 'ON' : 'OFF'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [currentMistingLogId, setCurrentMistingLogId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pumpMode, setPumpMode] = useState('auto');
  const [lastCommand, setLastCommand] = useState('');
  const [profilePicture, setProfilePicture] = useState(localStorage.getItem("profilePicture") || "");
  const previousPumpStatus = useRef(false);

  const userName = localStorage.getItem("userName") || "Marc Andrei Toledo";
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8081";

  // Profile picture sync
  useEffect(() => {
    const handleStorageChange = () => {
      setProfilePicture(localStorage.getItem("profilePicture") || "");
    };

    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const currentPic = localStorage.getItem("profilePicture") || "";
      if (currentPic !== profilePicture) {
        setProfilePicture(currentPic);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [profilePicture]);

  // Initial data fetch
  useEffect(() => {
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
  }, [API_BASE]);

  // SSE realtime subscription
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

    es.onerror = () => {
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

    if (currentPumpStatus !== wasPreviouslyOn) {
      if (currentPumpStatus && !currentMistingLogId) {
        const logMistingStart = async () => {
          try {
            const response = await axios.post(`${API_BASE}/api/misting/start`, {
              temperature: sensorData.temperature,
              humidity: sensorData.humidity,
              heatIndex: sensorData.heatIndex,
              waterLevel: sensorData.waterLevel,
              mistingType: pumpMode.toUpperCase()
            });
            setCurrentMistingLogId(response.data.logId);
          } catch (error) {
            console.error('Failed to log misting start:', error);
          }
        };
        logMistingStart();
      }

      if (!currentPumpStatus && currentMistingLogId) {
        const logMistingEnd = async () => {
          try {
            await axios.put(`${API_BASE}/api/misting/end/${currentMistingLogId}`, {
              temperature: sensorData.temperature,
              humidity: sensorData.humidity,
              heatIndex: sensorData.heatIndex,
              waterLevel: sensorData.waterLevel
            });
            setCurrentMistingLogId(null);
          } catch (error) {
            console.error('Failed to log misting end:', error);
          }
        };
        logMistingEnd();
      }

      previousPumpStatus.current = currentPumpStatus;
    }
  }, [sensorData, currentMistingLogId, API_BASE, pumpMode]);

  // Manual control functions
  const handleManualOn = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/api/sensors/pump/manual`, { action: 'on' });
      setPumpMode('manual');
      setLastCommand(`✅ Pump turned ON at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setLastCommand(''), 5000);
    } catch (error) {
      setLastCommand('❌ Failed to turn pump ON');
      setTimeout(() => setLastCommand(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualOff = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/api/sensors/pump/manual`, { action: 'off' });
      setPumpMode('manual');
      setLastCommand(`✅ Pump turned OFF at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setLastCommand(''), 5000);
    } catch (error) {
      setLastCommand('❌ Failed to turn pump OFF');
      setTimeout(() => setLastCommand(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoMode = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/api/sensors/pump/auto`);
      setPumpMode('auto');
      setLastCommand(`✅ Switched to AUTO mode at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setLastCommand(''), 5000);
    } catch (error) {
      setLastCommand('❌ Failed to switch to AUTO mode');
      setTimeout(() => setLastCommand(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 h-screen text-white font-sans flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA] z-20">
        <h1 className="text-xl font-bold">AgriCool</h1>

        <div className="flex items-center gap-4">
          {/* Notification Panel */}
          <NotificationPanel apiBase={API_BASE} />

          {/* User Menu */}
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
                  onClick={() => navigate('/profile')}
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
        </div>
      </header>

      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <aside className="bg-gray-900 w-20 flex flex-col items-center p-4 gap-6 border-r-2 border-[#A1F1FA] flex-shrink-0">
          <button
            className="hover:text-[#A1F1FA] transition duration-200 text-[#A1F1FA]"
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
            onClick={() => navigate('/records')}
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <div className="flex-1"></div>
          <div className="w-6 h-6 bg-gray-600 rounded-md"></div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #1f2937;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #4b5563;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #6b7280;
            }
          `}</style>

          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6 text-[#A1F1FA]">
              Dashboard
            </h2>


            {/* Alert */}
            {sensorData?.pumpStatus && (
              <div className="bg-red-600 p-4 rounded-lg shadow-md flex items-center gap-2 animate-pulse mb-6">
                <FaExclamationTriangle className="text-white text-xl" />
                <p className="font-semibold">
                  ALERT: Heat Stress Detected - Cooling in Progress
                </p>
              </div>
            )}

            {/* System Status */}
            <SystemStatus sensorData={sensorData} pumpMode={pumpMode} />

            {/* Sensor Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaThermometerHalf className="text-red-400 text-2xl" />
                <div>
                  <p className="text-sm">Temperature</p>
                  <p className="text-lg font-bold">{sensorData?.temperature !== undefined ? sensorData.temperature + ' °C' : '--'}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaTint className="text-blue-400 text-2xl" />
                <div>
                  <p className="text-sm">Humidity</p>
                  <p className="text-lg font-bold">{sensorData?.humidity !== undefined ? sensorData.humidity + ' %' : '--'}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
                <MdOutlineHeatPump className="text-orange-400 text-2xl" />
                <div>
                  <p className="text-sm">Heat Index</p>
                  <p className="text-lg font-bold">{sensorData?.heatIndex !== undefined && sensorData?.heatIndex !== null ? sensorData.heatIndex + ' °C' : (sensorData?.temperature !== undefined && sensorData?.humidity !== undefined ? computeHeatIndexCelsius(Number(sensorData.temperature), Number(sensorData.humidity)) + ' °C' : '--')}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaWater className="text-cyan-400 text-2xl" />
                <div>
                  <p className="text-sm">Water Level</p>
                  <p className="text-lg font-bold">{sensorData?.waterLevel !== undefined ? sensorData.waterLevel + ' %' : '--'}</p>
                </div>
              </div>
            </div>

            {/* Realtime chart */}
            <div className="mb-6">
              <RealtimeChart sensor={sensorData} />
            </div>

            {/* Analytics Dashboard */}
            <MistingAnalytics apiBase={API_BASE} sensorData={sensorData} />

            {/* NEW: Dashboard Analytics A-E */}
            <DashboardAnalytics apiBase={API_BASE} sensorData={sensorData} />
            <br>
            </br>

            {/* Manual Control Panel */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-6 border-2 border-[#A1F1FA]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#A1F1FA]">Manual Controls</h3>
                  <p className="text-sm text-gray-400">Override automatic temperature control</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${pumpMode === 'manual'
                    ? 'bg-orange-600 text-white'
                    : 'bg-green-600 text-white'
                  }`}>
                  {pumpMode === 'manual' ? 'MANUAL MODE' : 'AUTO MODE'}
                </div>
              </div>

              {lastCommand && (
                <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500 rounded-lg text-blue-300 text-sm animate-pulse">
                  {lastCommand}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={handleManualOn}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <FaPlay />
                  <span>Turn ON</span>
                </button>

                <button
                  onClick={handleManualOff}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <FaPowerOff />
                  <span>Turn OFF</span>
                </button>

                <button
                  onClick={handleAutoMode}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <FaRedo />
                  <span>Switch AUTO</span>
                </button>
              </div>

              {pumpMode === 'manual' && (
                <div className="mt-4 p-3 bg-orange-600/20 border border-orange-600 rounded-lg text-orange-300 text-sm text-center animate-pulse">
                  ⚠️ Manual override active - Temperature threshold disabled
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}