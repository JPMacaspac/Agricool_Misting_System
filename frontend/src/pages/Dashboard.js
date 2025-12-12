import React, { useState, useEffect, useRef } from "react";
import DashboardAnalytics from '../components/DashboardAnalytics';
import NotificationPanel from '../components/NotificationPanel';
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
  FaFileAlt,
  FaBars,
  FaChevronUp,
  FaChevronDown,
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

// Realtime Chart Component
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
        display: false,
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
    <div className="bg-gray-700 p-4 rounded-lg shadow-md mb-6" style={{ minHeight: '320px' }}>
      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-3">Realtime Monitor (Last 30 readings)</h4>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-red-500"></div>
          <span className="text-xs text-gray-300">Danger Zone (35°C)</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded">
          <div className="w-8 h-0.5 bg-red-400"></div>
          <span className="text-xs text-gray-300">Temperature (°C)</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded">
          <div className="w-8 h-0.5 bg-blue-400"></div>
          <span className="text-xs text-gray-300">Humidity (%)</span>
        </div>

        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded">
          <div className="w-8 h-0.5 bg-yellow-400"></div>
          <span className="text-xs text-gray-300">Heat Index (°C)</span>
        </div>
      </div>

      <div className="w-full h-[180px]">
        <Line data={data} options={options} />
      </div>

      <div className="mt-3 text-xs text-gray-400 text-right">
        {history.length > 0 ? new Date(history[history.length - 1].t).toLocaleString() : '--'}
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
        const response = await axios.get(`${apiBase}/api/misting/logs`);
        const allLogs = response.data;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = allLogs.filter(log => {
          const logDate = new Date(log.startTime);
          return logDate >= today;
        });

        if (logs && logs.length > 0) {
          const totalDuration = logs.reduce((sum, log) => {
            if (log.startTime && log.endTime) {
              const duration = (new Date(log.endTime) - new Date(log.startTime)) / 1000 / 60;
              return sum + duration;
            }
            return sum;
          }, 0);

          const validLogs = logs.filter(log => log.startTemperature && log.startHumidity);
          const avgTemp = validLogs.length > 0
            ? validLogs.reduce((sum, log) => sum + (log.startTemperature || 0), 0) / validLogs.length
            : 0;
          const avgHum = validLogs.length > 0
            ? validLogs.reduce((sum, log) => sum + (log.startHumidity || 0), 0) / validLogs.length
            : 0;

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
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [apiBase]);

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-bold text-[#A1F1FA] mb-4">Today's Analytics</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <MdOutlineHeatPump className="text-blue-400 text-xl" />
            <p className="text-sm text-gray-400">Misting Events</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.todayMistingCount}</p>
          <p className="text-xs text-gray-500 mt-1">activations today</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <FaClock className="text-green-400 text-xl" />
            <p className="text-sm text-gray-400">Total Runtime</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.todayMistingDuration.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">minutes active</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <FaFire className="text-red-400 text-xl" />
            <p className="text-sm text-gray-400">Peak Temp</p>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.peakTemperature.toFixed(1)}°C</p>
          <p className="text-xs text-gray-500 mt-1">highest today</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
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


// System Status Component
// System Status Component - TEXT LEFT ALIGNED
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
      {/* Status Text Section - LEFT ALIGNED */}
      <div className="flex items-center justify-start gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse flex-shrink-0`}></div>
        <div className="text-left flex-1">
          <p className="text-xs text-gray-400 text-left">System Status</p>
          <p className="text-base font-bold text-white text-left">{getStatusText()}</p>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Date & Time</p>
          <div className="flex flex-col">
            <p className="font-bold text-[#A1F1FA] text-xs">
              {sensorData?.createdAt ? new Date(sensorData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
            </p>
            <p className="font-semibold text-gray-300 text-xs">
              {sensorData?.createdAt ? new Date(sensorData.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Mode</p>
          <p className="font-bold text-[#A1F1FA] text-sm">{pumpMode.toUpperCase()}</p>
        </div>
        
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Pump</p>
          <p className={`font-bold text-sm ${sensorData?.pumpStatus ? 'text-green-400' : 'text-red-400'}`}>
            {sensorData?.pumpStatus ? 'ON' : 'OFF'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomNavOpen, setBottomNavOpen] = useState(true);
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

  // Profile picture sync - ENHANCED VERSION
  useEffect(() => {
    const loadProfilePic = () => {
      const pic = localStorage.getItem("profilePicture");
      if (pic !== profilePicture) {
        setProfilePicture(pic || "");
      }
    };

    // Load immediately
    loadProfilePic();

    // Check every second for changes
    const interval = setInterval(loadProfilePic, 1000);

    // Listen for storage events from other tabs
    const handleStorage = (e) => {
      if (e.key === 'profilePicture') {
        setProfilePicture(e.newValue || "");
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
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
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
      {/* Fixed Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA] z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            <FaBars className="text-xl text-[#A1F1FA]" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">AgriCool</h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationPanel apiBase={API_BASE} />

          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-500">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      const span = document.createElement('span');
                      span.className = 'text-sm font-semibold';
                      span.textContent = userName[0];
                      e.target.parentElement.appendChild(span);
                    }}
                  />
                ) : (
                  <span className="text-sm font-semibold">{userName[0]}</span>
                )}
              </div>
              <span className="text-sm hidden sm:inline">{userName}</span>
            </div>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-md shadow-lg p-2 z-10 border border-gray-700">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = "/";
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-red-400 text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex bg-gray-900 flex-col items-center py-4 gap-6 border-r-2 border-[#A1F1FA] flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-24 px-4' : 'w-0 px-0 border-0 overflow-hidden'
          }`}>
          <button
            className="text-[#A1F1FA] bg-gray-800 p-4 rounded-lg border-2 border-[#A1F1FA] w-full flex items-center justify-center hover:bg-gray-700"
            onClick={() => navigate('/dashboard')}
          >
            <FaChartBar className="text-2xl" />
          </button>
          <button
            className="hover:text-[#A1F1FA] p-4 rounded-lg hover:bg-gray-800 w-full flex items-center justify-center"
            onClick={() => navigate('/daily-logs')}
          >
            <FaRegCalendarAlt className="text-2xl" />
          </button>
          <button
            className="hover:text-[#A1F1FA] p-4 rounded-lg hover:bg-gray-800 w-full flex items-center justify-center"
            onClick={() => navigate('/records')}
          >
            <FaClipboardList className="text-2xl" />
          </button>
          <button
            className="hover:text-[#A1F1FA] p-4 rounded-lg hover:bg-gray-800 w-full flex items-center justify-center"
            onClick={() => navigate('/reports')}
          >
            <FaFileAlt className="text-2xl" />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-4 md:pb-0 custom-scrollbar">
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

          <div className="p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[#A1F1FA]">
              Dashboard
            </h2>

            {sensorData?.pumpStatus && (
              <div className="bg-red-600 p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2 animate-pulse mb-4 sm:mb-6">
                <FaExclamationTriangle className="text-white text-xl" />
                <p className="text-sm sm:text-base font-semibold">
                  ALERT: Heat Stress Detected - Cooling in Progress
                </p>
              </div>
            )}

            <SystemStatus sensorData={sensorData} pumpMode={pumpMode} />

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaThermometerHalf className="text-red-400 text-xl sm:text-2xl" />
                <div>
                  <p className="text-xs sm:text-sm">Temperature</p>
                  <p className="text-sm sm:text-lg font-bold">{sensorData?.temperature !== undefined ? sensorData.temperature + ' °C' : '--'}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaTint className="text-blue-400 text-xl sm:text-2xl" />
                <div>
                  <p className="text-xs sm:text-sm">Humidity</p>
                  <p className="text-sm sm:text-lg font-bold">{sensorData?.humidity !== undefined ? sensorData.humidity + ' %' : '--'}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2">
                <MdOutlineHeatPump className="text-orange-400 text-xl sm:text-2xl" />
                <div>
                  <p className="text-xs sm:text-sm">Heat Index</p>
                  <p className="text-sm sm:text-lg font-bold">{sensorData?.heatIndex !== undefined && sensorData?.heatIndex !== null ? sensorData.heatIndex + ' °C' : (sensorData?.temperature !== undefined && sensorData?.humidity !== undefined ? computeHeatIndexCelsius(Number(sensorData.temperature), Number(sensorData.humidity)) + ' °C' : '--')}</p>
                </div>
              </div>
              <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2">
                <FaWater className="text-cyan-400 text-xl sm:text-2xl" />
                <div>
                  <p className="text-xs sm:text-sm">Water Level</p>
                  <p className="text-sm sm:text-lg font-bold">{sensorData?.waterLevel !== undefined ? sensorData.waterLevel + ' %' : '--'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <RealtimeChart sensor={sensorData} />
            </div>

            <MistingAnalytics apiBase={API_BASE} sensorData={sensorData} />
            <DashboardAnalytics apiBase={API_BASE} sensorData={sensorData} />

            {/* Manual Controls - FIXED SPACING */}
            <div className="bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border-2 border-[#A1F1FA] mt-6 mb-5 md:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#A1F1FA]">Manual Controls</h3>
                  <p className="text-xs sm:text-sm text-gray-400">Override automatic temperature control</p>
                </div>
                <div className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm ${pumpMode === 'manual' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                  {pumpMode === 'manual' ? 'MANUAL MODE' : 'AUTO MODE'}
                </div>
              </div>

              {lastCommand && (
                <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500 rounded-lg text-blue-300 text-xs sm:text-sm animate-pulse">
                  {lastCommand}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={handleManualOn}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  <FaPlay className="text-sm" />
                  <span>Turn ON</span>
                </button>
                <button
                  onClick={handleManualOff}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  <FaPowerOff className="text-sm" />
                  <span>Turn OFF</span>
                </button>
                <button
                  onClick={handleAutoMode}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  <FaRedo className="text-sm" />
                  <span>Switch AUTO</span>
                </button>
              </div>

              {pumpMode === 'manual' && (
                <div className="mt-3 p-2.5 bg-orange-600/20 border border-orange-600 rounded-lg text-orange-300 text-xs text-center animate-pulse">
                  ⚠️ Manual override active
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-[#A1F1FA] transition-transform duration-300 z-30 ${bottomNavOpen ? 'translate-y-0' : 'translate-y-full'
        }`}>
        <button
          onClick={() => setBottomNavOpen(!bottomNavOpen)}
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 p-2 rounded-t-lg border-2 border-b-0 border-[#A1F1FA]"
        >
          {bottomNavOpen ? (
            <FaChevronDown className="text-[#A1F1FA]" />
          ) : (
            <FaChevronUp className="text-[#A1F1FA]" />
          )}
        </button>

        <div className="grid grid-cols-4 gap-2 p-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 p-3 bg-gray-800 rounded-lg border-2 border-[#A1F1FA]"
          >
            <FaChartBar className="text-xl text-[#A1F1FA]" />
            <span className="text-xs text-[#A1F1FA]">Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/daily-logs')}
            className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg"
          >
            <FaRegCalendarAlt className="text-xl" />
            <span className="text-xs">Daily Log</span>
          </button>
          <button
            onClick={() => navigate('/records')}
            className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg"
          >
            <FaClipboardList className="text-xl" />
            <span className="text-xs">Records</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg"
          >
            <FaFileAlt className="text-xl" />
            <span className="text-xs">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}