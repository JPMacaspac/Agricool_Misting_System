import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { FaFire, FaTint, FaThermometerHalf } from 'react-icons/fa';
import { io } from 'socket.io-client';

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, ArcElement, Tooltip, Legend, Filler);

export default function DashboardAnalytics({ apiBase, sensorData }) {
  const [logs, setLogs] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Exposed fetch function so both polling and socket handlers can refresh data
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${apiBase}/api/misting/logs`);
      const data = await response.json();
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Real-time sync every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]); // Fixed: added apiBase to dependency array

  // Socket.IO realtime updates - merge incoming misting events into logs immediately
  useEffect(() => {
    // Use provided apiBase to connect to the same backend (works for LAN IPs)
    const backendUrl = apiBase || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8081';
    const socket = io(backendUrl, { transports: ['websocket', 'polling'] });

    const upsertLog = (incoming) => {
      if (!incoming) return;
      const id = incoming.id || incoming.logId || incoming.id;
      setLogs(prev => {
        // Try to replace existing log with same id, otherwise prepend
        const exists = prev.findIndex(l => l && (l.id === id || l.logId === id));
        if (exists !== -1) {
          const next = [...prev];
          next[exists] = incoming;
          return next;
        }
        // Prepend newest event so UI can show it right away
        return [incoming, ...prev].slice(0, 200);
      });
    };

    socket.on('connect', () => console.log('Socket connected', socket.id));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('misting-started', async (data) => {
      // misting-started includes saved log data
      upsertLog(data);
      // Refresh full logs list from server to ensure consistency
      await fetchLogs();
    });

    socket.on('misting-ended', async (data) => {
      upsertLog(data);
      await fetchLogs();
    });

    socket.on('sensor-update', (data) => {
      // optionally use sensor updates for small realtime UI changes
      // console.log('sensor-update', data);
    });

    return () => {
      socket.off('misting-started');
      socket.off('misting-ended');
      socket.off('sensor-update');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Filter logs by month/year - MEMOIZED for performance
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.startTime) return false;
      const logDate = new Date(log.startTime);
      const logMonth = logDate.toLocaleString('en-US', { month: 'long' });
      const logYear = logDate.getFullYear().toString();

      if (selectedMonth && selectedMonth !== 'All' && logMonth !== selectedMonth) return false;
      if (selectedYear && selectedYear !== 'All' && logYear !== selectedYear) return false;
      return true;
    });
  }, [logs, selectedMonth, selectedYear]);

  // IMPROVED: Get last 7 days of data with proper sorting
  const last7DaysData = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0); // Start of day 7 days ago
    
    // Filter logs from last 7 days
    const weekFiltered = filteredLogs.filter(log => {
      const logDate = new Date(log.startTime);
      return logDate >= weekAgo;
    });
    
    // Sort chronologically (oldest to newest)
    const sorted = weekFiltered.sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );
    
    return sorted;
  }, [filteredLogs]);

  // IMPROVED: Get last 10 events with proper sorting
  const last10EventsData = useMemo(() => {
    // Sort all filtered logs chronologically
    const sorted = [...filteredLogs].sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );
    
    // Take the most recent 10
    return sorted.slice(-10);
  }, [filteredLogs]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        labels: { color: '#cbd5e1' },
        display: true 
      },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        enabled: true 
      }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    },
  };

  // FIXED: Livestock Comfort Index - Now correctly calculates from all logs
  const comfort = useMemo(() => {
    const totalLogs = filteredLogs.length;
    if (totalLogs === 0) return { 
      safe: 0, warning: 0, danger: 0, 
      safeCount: 0, warningCount: 0, dangerCount: 0, 
      totalLogs: 0 
    };
    
    const safeCount = filteredLogs.filter(log => log.startTemperature < 30).length;
    const warningCount = filteredLogs.filter(log => log.startTemperature >= 30 && log.startTemperature < 35).length;
    const dangerCount = filteredLogs.filter(log => log.startTemperature >= 35).length;
    
    const safePercent = Math.round((safeCount / totalLogs) * 100);
    const warningPercent = Math.round((warningCount / totalLogs) * 100);
    const dangerPercent = Math.round((dangerCount / totalLogs) * 100);
    
    return { 
      safe: safePercent, 
      warning: warningPercent, 
      danger: dangerPercent,
      safeCount,
      warningCount,
      dangerCount,
      totalLogs
    };
  }, [filteredLogs]);
  
  const comfortData = {
    labels: ['Safe (<30°C)', 'Warning (30-35°C)', 'Danger (≥35°C)'],
    datasets: [{
      data: [comfort.safe, comfort.warning, comfort.danger],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 2,
      borderColor: '#1f2937',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: { 
        labels: { 
          color: '#cbd5e1',
          font: { size: 12 },
          padding: 15
        },
        position: 'bottom',
      },
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            let count = 0;
            if (context.dataIndex === 0) count = comfort.safeCount;
            if (context.dataIndex === 1) count = comfort.warningCount;
            if (context.dataIndex === 2) count = comfort.dangerCount;
            return `${label}: ${value}% (${count} events)`;
          }
        }
      }
    },
  };

  // IMPROVED: Water Usage with real-time data and proper date labels
  const waterUsageData = useMemo(() => ({
    labels: last7DaysData.map(log => {
      const date = new Date(log.startTime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Water Level Drop (%)',
      data: last7DaysData.map(log => {
        const drop = (log.startWaterLevel || 0) - (log.endWaterLevel || 0);
        return Math.max(0, parseFloat(drop.toFixed(1)));
      }),
      backgroundColor: '#4FC3F7',
      borderColor: '#4FC3F7',
    }],
  }), [last7DaysData]);

  // IMPROVED: Efficiency Score with real-time data
  const efficiencyData = useMemo(() => ({
    labels: last7DaysData.map(log => {
      const date = new Date(log.startTime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Efficiency (°C/min)',
      data: last7DaysData.map(log => {
        const tempDrop = (log.startTemperature || 0) - (log.endTemperature || 0);
        const duration = log.endTime ? (new Date(log.endTime) - new Date(log.startTime)) / 60000 : 1;
        return duration > 0 ? parseFloat((tempDrop / duration).toFixed(2)) : 0;
      }),
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      tension: 0.4,
      fill: true,
    }],
  }), [last7DaysData]);

  // IMPROVED: Temperature Drop with real-time data and proper sorting
  const tempDropData = useMemo(() => ({
    labels: last10EventsData.map((log) => {
      const date = new Date(log.startTime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Temp Drop (°C)',
      data: last10EventsData.map(log => {
        const drop = (log.startTemperature || 0) - (log.endTemperature || 0);
        return Math.max(0, parseFloat(drop.toFixed(1)));
      }),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      tension: 0.3,
      fill: true,
    }],
  }), [last10EventsData]);

  // Peak Heat Alerts Counter - MEMOIZED
  const alerts = useMemo(() => ({
    warning: filteredLogs.filter(log => log.startTemperature >= 30 && log.startTemperature < 35).length,
    danger: filteredLogs.filter(log => log.startTemperature >= 35).length,
    safe: filteredLogs.filter(log => log.startTemperature < 30).length,
  }), [filteredLogs]);

  const safePercentage = filteredLogs.length > 0 
    ? Math.round((alerts.safe / filteredLogs.length) * 100) 
    : 0;

  // Get latest log timestamp - MEMOIZED
  const lastUpdated = useMemo(() => {
    const logsWithTime = (logs || []).filter(l => l && l.startTime);
    if (logsWithTime.length === 0) return 'No data';
    
    const latestLog = logsWithTime.reduce((a, b) => 
      new Date(a.startTime) > new Date(b.startTime) ? a : b
    );
    
    return new Date(latestLog.startTime).toLocaleString();
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Filter Controls with Last Updated indicator */}
      <div className="flex gap-4 items-center bg-gray-700 p-4 rounded-lg">
        <span className="text-gray-300 font-semibold">Filter Analytics:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-gray-800 px-4 py-2 rounded-md text-gray-200 outline-none"
        >
          <option value="">All Months</option>
          <option>January</option>
          <option>February</option>
          <option>March</option>
          <option>April</option>
          <option>May</option>
          <option>June</option>
          <option>July</option>
          <option>August</option>
          <option>September</option>
          <option>October</option>
          <option>November</option>
          <option>December</option>
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-gray-800 px-4 py-2 rounded-md text-gray-200 outline-none"
        >
          <option value="">All Years</option>
          <option>2023</option>
          <option>2024</option>
          <option>2025</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div className="text-sm text-gray-400">
            <div>Total Events: {filteredLogs.length}</div>
            <div className="text-xs">Last Updated: {lastUpdated}</div>
          </div>
        </div>
      </div>

      {/* Row 1: Comfort Gauge & Water Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A. Comfort Gauge - NOW SHOWS DATA WITH PERCENTAGES */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Livestock Comfort Index</h3>
          <div className="h-64 flex items-center justify-center relative">
            {comfort.totalLogs > 0 ? (
              <>
                <Doughnut data={comfortData} options={doughnutOptions} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{comfort.totalLogs}</div>
                    <div className="text-xs text-gray-400">Total Events</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-400">No data available</div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-600/20 p-2 rounded border border-green-600">
              <p className="text-green-400 font-bold text-lg">{comfort.safe}%</p>
              <p className="text-green-400 font-semibold">{comfort.safeCount}</p>
              <p className="text-gray-400">Safe Events</p>
            </div>
            <div className="bg-yellow-600/20 p-2 rounded border border-yellow-600">
              <p className="text-yellow-400 font-bold text-lg">{comfort.warning}%</p>
              <p className="text-yellow-400 font-semibold">{comfort.warningCount}</p>
              <p className="text-gray-400">Warning Events</p>
            </div>
            <div className="bg-red-600/20 p-2 rounded border border-red-600">
              <p className="text-red-400 font-bold text-lg">{comfort.danger}%</p>
              <p className="text-red-400 font-semibold">{comfort.dangerCount}</p>
              <p className="text-gray-400">Danger Events</p>
            </div>
          </div>
        </div>

        {/* B. Water Usage - UPDATED WITH REAL-TIME SYNC */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">💧 Water Usage (Last 7 Days)</h3>
          <div className="h-64">
            {last7DaysData.length > 0 ? (
              <Bar data={waterUsageData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No data for last 7 days
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Tracks water level drop during misting cycles • Showing {last7DaysData.length} events
          </p>
        </div>
      </div>

      {/* Row 2: Efficiency & Temp Drop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* C. Efficiency Score - UPDATED WITH REAL-TIME SYNC */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">⚡ Misting System Efficiency</h3>
          <div className="h-64">
            {last7DaysData.length > 0 ? (
              <Line data={efficiencyData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No data for last 7 days
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Temperature drop per minute of operation • Showing {last7DaysData.length} events
          </p>
        </div>

        {/* D. Temperature Drop - UPDATED WITH REAL-TIME SYNC */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">🌡️ Temperature Drop (Last 10 Events)</h3>
          <div className="h-64">
            {last10EventsData.length > 0 ? (
              <Line data={tempDropData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No events recorded yet
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Shows effectiveness of each misting activation • Showing {last10EventsData.length} events
          </p>
        </div>
      </div>

      {/* Row 3: Peak Alerts Counter */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">🔥 Peak Heat Alerts Counter</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-yellow-600/20 border-2 border-yellow-600 p-6 rounded-lg text-center">
            <FaThermometerHalf className="text-4xl text-yellow-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-yellow-400">{alerts.warning}</p>
            <p className="text-sm text-gray-300 mt-2">Warning Alerts</p>
            <p className="text-xs text-gray-500">Temp 30-35°C</p>
          </div>
          <div className="bg-red-600/20 border-2 border-red-600 p-6 rounded-lg text-center">
            <FaFire className="text-4xl text-red-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-red-400">{alerts.danger}</p>
            <p className="text-sm text-gray-300 mt-2">Danger Alerts</p>
            <p className="text-xs text-gray-500">Temp ≥35°C</p>
          </div>
          <div className="bg-green-600/20 border-2 border-green-600 p-6 rounded-lg text-center">
            <FaTint className="text-4xl text-green-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-green-400">{safePercentage}%</p>
            <p className="text-sm text-gray-300 mt-2">Safe Time</p>
            <p className="text-xs text-gray-500">{alerts.safe} events &lt;30°C</p>
          </div>
        </div>
      </div>
    </div>
  );
}