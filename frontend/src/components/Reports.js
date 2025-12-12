import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  FaCalendarAlt, 
  FaDownload, 
  FaPrint, 
  FaChartLine, 
  FaThermometerHalf, 
  FaTint, 
  FaClock, 
  FaChartBar,
  FaRegCalendarAlt,
  FaClipboardList,
  FaFileAlt,
  FaBars,
  FaChevronUp,
  FaChevronDown,
} from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, ArcElement, Tooltip, Legend, Filler);

export default function Reports({ apiBase }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomNavOpen, setBottomNavOpen] = useState(true);
  const [logs, setLogs] = useState([]);
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const userName = localStorage.getItem("userName") || "Marc Andrei Toledo";
  const profilePicture = localStorage.getItem("profilePicture") || "";

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/misting/logs`);
      const data = await response.json();
      setLogs(data || []);
      
      if (data && data.length > 0) {
        console.log('✅ Reports - First log entry:', data[0]);
        console.log('✅ Reports - mistingType field:', data[0].mistingType);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.startTime) return false;
      const logDate = new Date(log.startTime);

      if (reportType === 'daily') {
        const selected = new Date(selectedDate);
        return (
          logDate.getDate() === selected.getDate() &&
          logDate.getMonth() === selected.getMonth() &&
          logDate.getFullYear() === selected.getFullYear()
        );
      } else if (reportType === 'monthly') {
        return (
          logDate.getMonth() === selectedMonth &&
          logDate.getFullYear() === selectedYear
        );
      } else if (reportType === 'yearly') {
        return logDate.getFullYear() === selectedYear;
      }
      return false;
    });
  }, [logs, reportType, selectedDate, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        totalEvents: 0,
        autoEvents: 0,
        manualEvents: 0,
        avgTemp: '0.0',
        avgHumidity: '0.0',
        avgHeatIndex: '0.0',
        avgWaterUsage: '0.0',
        totalDuration: '0',
        avgDuration: '0.0',
        tempReduction: '0.0',
        peakTemp: '0.0',
        lowestTemp: '0.0',
        safeEvents: 0,
        warningEvents: 0,
        dangerEvents: 0,
        mostActiveHour: 'N/A',
        efficiency: '0.00',
      };
    }

    const totalEvents = filteredLogs.length;
    
    const autoEvents = filteredLogs.filter(l => {
      const type = l.mistingType || l.type;
      return type && type.toUpperCase() === 'AUTO';
    }).length;
    
    const manualEvents = filteredLogs.filter(l => {
      const type = l.mistingType || l.type;
      return type && type.toUpperCase() === 'MANUAL';
    }).length;

    const validTempLogs = filteredLogs.filter(l => l.startTemperature && !isNaN(l.startTemperature));
    const validHumLogs = filteredLogs.filter(l => l.startHumidity && !isNaN(l.startHumidity));
    const validHeatIndexLogs = filteredLogs.filter(l => l.startHeatIndex && !isNaN(l.startHeatIndex));
    
    const avgTemp = validTempLogs.length > 0
      ? (validTempLogs.reduce((sum, l) => sum + parseFloat(l.startTemperature), 0) / validTempLogs.length).toFixed(1)
      : '0.0';
    
    const avgHumidity = validHumLogs.length > 0
      ? (validHumLogs.reduce((sum, l) => sum + parseFloat(l.startHumidity), 0) / validHumLogs.length).toFixed(1)
      : '0.0';
    
    const avgHeatIndex = validHeatIndexLogs.length > 0
      ? (validHeatIndexLogs.reduce((sum, l) => sum + parseFloat(l.startHeatIndex), 0) / validHeatIndexLogs.length).toFixed(1)
      : '0.0';

    const waterUsages = filteredLogs.map(l => (l.startWaterLevel || 0) - (l.endWaterLevel || 0)).filter(w => !isNaN(w));
    const avgWaterUsage = waterUsages.length > 0
      ? (waterUsages.reduce((a, b) => a + b, 0) / waterUsages.length).toFixed(1)
      : '0.0';

    const durations = filteredLogs.map(l => {
      if (!l.endTime) return 0;
      return (new Date(l.endTime) - new Date(l.startTime)) / 60000;
    }).filter(d => !isNaN(d));
    
    const totalDuration = durations.reduce((a, b) => a + b, 0).toFixed(0);
    const avgDuration = durations.length > 0
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '0.0';

    const tempReductions = filteredLogs.map(l => (l.startTemperature || 0) - (l.endTemperature || 0)).filter(t => !isNaN(t));
    const tempReduction = tempReductions.length > 0
      ? (tempReductions.reduce((a, b) => a + b, 0) / tempReductions.length).toFixed(1)
      : '0.0';

    const temps = filteredLogs.map(log => log.startTemperature || 0).filter(t => t > 0 && !isNaN(t));
    const peakTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : '0.0';
    const lowestTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : '0.0';

    const safeEvents = filteredLogs.filter(l => l.startTemperature && l.startTemperature < 30).length;
    const warningEvents = filteredLogs.filter(l => l.startTemperature && l.startTemperature >= 30 && l.startTemperature < 35).length;
    const dangerEvents = filteredLogs.filter(l => l.startTemperature && l.startTemperature >= 35).length;

    const hourCounts = {};
    filteredLogs.forEach(l => {
      const hour = new Date(l.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const mostActiveHour = Object.keys(hourCounts).length > 0
      ? Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0] + ':00'
      : 'N/A';

    const efficiencies = filteredLogs.map(l => {
      const tempDrop = (l.startTemperature || 0) - (l.endTemperature || 0);
      const duration = l.endTime ? (new Date(l.endTime) - new Date(l.startTime)) / 60000 : 1;
      return duration > 0 ? tempDrop / duration : 0;
    }).filter(e => !isNaN(e));
    
    const efficiency = efficiencies.length > 0
      ? (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(2)
      : '0.00';

    return {
      totalEvents,
      autoEvents,
      manualEvents,
      avgTemp,
      avgHumidity,
      avgHeatIndex,
      avgWaterUsage,
      totalDuration,
      avgDuration,
      tempReduction,
      peakTemp,
      lowestTemp,
      safeEvents,
      warningEvents,
      dangerEvents,
      mostActiveHour,
      efficiency,
    };
  }, [filteredLogs]);

  const dailyBreakdown = useMemo(() => {
    if (reportType === 'daily') return [];

    const breakdown = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.startTime).toLocaleDateString();
      if (!breakdown[date]) {
        breakdown[date] = {
          events: 0,
          avgTemp: 0,
          avgHumidity: 0,
          totalDuration: 0,
          temps: [],
          hums: [],
        };
      }
      breakdown[date].events++;
      if (log.startTemperature && !isNaN(log.startTemperature)) {
        breakdown[date].temps.push(parseFloat(log.startTemperature));
      }
      if (log.startHumidity && !isNaN(log.startHumidity)) {
        breakdown[date].hums.push(parseFloat(log.startHumidity));
      }
      if (log.endTime) {
        breakdown[date].totalDuration += (new Date(log.endTime) - new Date(log.startTime)) / 60000;
      }
    });

    return Object.entries(breakdown).map(([date, data]) => ({
      date,
      events: data.events,
      avgTemp: data.temps.length > 0 
        ? (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1)
        : '0.0',
      avgHumidity: data.hums.length > 0
        ? (data.hums.reduce((a, b) => a + b, 0) / data.hums.length).toFixed(1)
        : '0.0',
      totalDuration: data.totalDuration.toFixed(0),
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredLogs, reportType]);

  const tempTrendData = {
    labels: dailyBreakdown.length > 0
      ? dailyBreakdown.map(d => d.date)
      : filteredLogs.slice(-20).map(l => {
          try {
            return new Date(l.startTime).toLocaleTimeString();
          } catch (e) {
            return '--';
          }
        }),
    datasets: [{
      label: 'Average Temperature (°C)',
      data: dailyBreakdown.length > 0
        ? dailyBreakdown.map(d => parseFloat(d.avgTemp) || 0)
        : filteredLogs.slice(-20).map(l => parseFloat(l.startTemperature) || 0),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 }, grid: { color: '#374151' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    },
  };

  const eventDistribution = {
    labels: ['Auto Events', 'Manual Events'],
    datasets: [{
      data: [stats.autoEvents, stats.manualEvents],
      backgroundColor: ['#10B981', '#F59E0B'],
      borderWidth: 2,
      borderColor: '#1f2937',
    }],
  };

  const tempZones = {
    labels: ['Safe (<30°C)', 'Warning (30-35°C)', 'Danger (≥35°C)'],
    datasets: [{
      data: [stats.safeEvents, stats.warningEvents, stats.dangerEvents],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 2,
      borderColor: '#1f2937',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { size: 11 } }, position: 'bottom' },
    },
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportContent = `
AGRICOOL MISTING SYSTEM REPORT
Generated: ${new Date().toLocaleString()}
Report Period: ${reportType.toUpperCase()} - ${
      reportType === 'daily' ? selectedDate :
      reportType === 'monthly' ? `${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} ${selectedYear}` :
      selectedYear
    }

═══════════════════════════════════════════════════════════

SUMMARY STATISTICS
─────────────────────────────────────────────────────────
Total Misting Events: ${stats.totalEvents}
  • Automatic Events: ${stats.autoEvents}
  • Manual Events: ${stats.manualEvents}

TEMPERATURE DATA
─────────────────────────────────────────────────────────
Average Temperature: ${stats.avgTemp}°C
Peak Temperature: ${stats.peakTemp}°C
Lowest Temperature: ${stats.lowestTemp}°C
Average Temp Reduction: ${stats.tempReduction}°C

HUMIDITY & ENVIRONMENT
─────────────────────────────────────────────────────────
Average Humidity: ${stats.avgHumidity}%
Average Heat Index: ${stats.avgHeatIndex}°C

OPERATIONAL DATA
─────────────────────────────────────────────────────────
Total Runtime: ${stats.totalDuration} minutes
Average Duration per Event: ${stats.avgDuration} minutes
Average Water Usage: ${stats.avgWaterUsage}%
System Efficiency: ${stats.efficiency}°C/min

SAFETY ANALYSIS
─────────────────────────────────────────────────────────
Safe Conditions (<30°C): ${stats.safeEvents} events
Warning Conditions (30-35°C): ${stats.warningEvents} events
Danger Conditions (≥35°C): ${stats.dangerEvents} events
Most Active Hour: ${stats.mostActiveHour}

${dailyBreakdown.length > 0 ? `
DAILY BREAKDOWN
─────────────────────────────────────────────────────────
${dailyBreakdown.map(d => `${d.date}: ${d.events} events, Avg Temp: ${d.avgTemp}°C, Duration: ${d.totalDuration}min`).join('\n')}
` : ''}

═══════════════════════════════════════════════════════════
End of Report
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `misting-report-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getReportTitle = () => {
    if (reportType === 'daily') return `Daily Report - ${new Date(selectedDate).toLocaleDateString()}`;
    if (reportType === 'monthly') return `Monthly Report - ${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} ${selectedYear}`;
    return `Yearly Report - ${selectedYear}`;
  };

  return (
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
      {/* Custom Scrollbar Styles */}
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

      {/* Fixed Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA] z-20">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            <FaBars className="text-xl text-[#A1F1FA]" />
          </button>
          <div className="flex items-center gap-2">
            <FaChartLine className="text-xl sm:text-2xl text-[#A1F1FA]" />
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-white">Misting System Reports</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm"
          >
            <FaPrint className="text-white" /> <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-white px-2 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm"
          >
            <FaDownload className="text-white" /> <span className="hidden sm:inline">Download</span>
          </button>

          <NotificationPanel apiBase={apiBase} />

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
              <span className="text-sm hidden lg:inline">{userName}</span>
            </div>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-md shadow-lg p-2 z-10 border border-gray-700">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm text-white"
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
            className="hover:text-[#A1F1FA] p-4 rounded-lg hover:bg-gray-800 w-full flex items-center justify-center"
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
            className="text-[#A1F1FA] bg-gray-800 p-4 rounded-lg border-2 border-[#A1F1FA] w-full flex items-center justify-center hover:bg-gray-700"
            onClick={() => navigate('/reports')}
          >
            <FaFileAlt className="text-2xl" />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-4 md:pb-0 custom-scrollbar">
          <div className="p-6 space-y-6">
          {/* Report Type Selector */}
          <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
            <div className="flex gap-4 items-center flex-wrap">
              <span className="text-gray-300 font-semibold">Report Type:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('daily')}
                  className={`px-4 py-2 rounded-lg transition ${
                    reportType === 'daily' ? 'bg-[#A1F1FA] text-gray-900' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-2 rounded-lg transition ${
                    reportType === 'monthly' ? 'bg-[#A1F1FA] text-gray-900' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`px-4 py-2 rounded-lg transition ${
                    reportType === 'yearly' ? 'bg-[#A1F1FA] text-gray-900' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Yearly
                </button>
              </div>

              {/* Date Selectors */}
              {reportType === 'daily' && (
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg outline-none date-input-white"
                    style={{
                      colorScheme: 'dark'
                    }}
                  />
                  <style>{`
                    .date-input-white::-webkit-calendar-picker-indicator {
                      filter: invert(1) brightness(100);
                      cursor: pointer;
                      margin-left: 4px;
                    }
                  `}</style>
                </div>
              )}
              {reportType === 'monthly' && (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg outline-none"
                  >
                    {[2023, 2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </>
              )}
              {reportType === 'yearly' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg outline-none"
                >
                  {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Report Title */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 rounded-lg text-center">
            <h2 className="text-xl font-bold text-white">{getReportTitle()}</h2>
            <p className="text-sm text-gray-100 mt-1">Total Events: {stats.totalEvents}</p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-lg shadow-lg text-white">
              <FaThermometerHalf className="text-3xl mb-2" />
              <p className="text-sm opacity-90">Avg Temperature</p>
              <p className="text-3xl font-bold">{stats.avgTemp}°C</p>
              <p className="text-xs mt-2">Peak: {stats.peakTemp}°C</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
              <FaTint className="text-3xl mb-2" />
              <p className="text-sm opacity-90">Avg Humidity</p>
              <p className="text-3xl font-bold">{stats.avgHumidity}%</p>
              <p className="text-xs mt-2">Water Used: {stats.avgWaterUsage}%</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
              <FaClock className="text-3xl mb-2" />
              <p className="text-sm opacity-90">Total Runtime</p>
              <p className="text-3xl font-bold">{stats.totalDuration}m</p>
              <p className="text-xs mt-2">Avg: {stats.avgDuration}m/event</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
              <FaChartLine className="text-3xl mb-2" />
              <p className="text-sm opacity-90">Efficiency</p>
              <p className="text-3xl font-bold">{stats.efficiency}°C/m</p>
              <p className="text-xs mt-2">Temp Drop: {stats.tempReduction}°C</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Temperature Trend */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Temperature Trends</h3>
              <div className="h-80">
                <Line data={tempTrendData} options={chartOptions} />
              </div>
            </div>

            {/* Event Distribution */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Event Distribution</h3>
              <div className="flex flex-col items-center">
                {stats.totalEvents > 0 && (stats.autoEvents > 0 || stats.manualEvents > 0) ? (
                  <div className="w-full max-w-xs h-64 flex items-center justify-center mb-4">
                    <Doughnut data={eventDistribution} options={doughnutOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400">No event data available</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-center w-full">
                  <div className="bg-green-600/20 p-3 rounded border border-green-600">
                    <p className="text-green-400 font-bold text-2xl">{stats.autoEvents}</p>
                    <p className="text-gray-300 font-semibold text-sm">Auto Events</p>
                  </div>
                  <div className="bg-yellow-600/20 p-3 rounded border border-yellow-600">
                    <p className="text-yellow-400 font-bold text-2xl">{stats.manualEvents}</p>
                    <p className="text-gray-300 font-semibold text-sm">Manual Events</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Temperature Zones */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Temperature Safety Zones</h3>
              <div className="flex flex-col items-center">
                {stats.totalEvents > 0 && (stats.safeEvents > 0 || stats.warningEvents > 0 || stats.dangerEvents > 0) ? (
                  <div className="w-full max-w-xs h-64 flex items-center justify-center mb-4">
                    <Doughnut data={tempZones} options={doughnutOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400">No temperature data available</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center w-full">
                  <div className="bg-green-600/20 p-2 rounded border border-green-600">
                    <p className="text-green-400 font-bold text-xl">{stats.safeEvents}</p>
                    <p className="text-gray-300 font-semibold text-xs">Safe</p>
                  </div>
                  <div className="bg-yellow-600/20 p-2 rounded border border-yellow-600">
                    <p className="text-yellow-400 font-bold text-xl">{stats.warningEvents}</p>
                    <p className="text-gray-300 font-semibold text-xs">Warning</p>
                  </div>
                  <div className="bg-red-600/20 p-2 rounded border border-red-600">
                    <p className="text-red-400 font-bold text-xl">{stats.dangerEvents}</p>
                    <p className="text-gray-300 font-semibold text-xs">Danger</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Additional Insights</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded">
                  <span className="font-medium">Average Heat Index</span>
                  <span className="font-bold text-orange-400 text-lg">{stats.avgHeatIndex}°C</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded">
                  <span className="font-medium">Peak Temperature</span>
                  <span className="font-bold text-red-400 text-lg">{stats.peakTemp}°C</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded">
                  <span className="font-medium">Lowest Temperature</span>
                  <span className="font-bold text-blue-400 text-lg">{stats.lowestTemp}°C</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded">
                  <span className="font-medium">Safety Score</span>
                  <span className="font-bold text-green-400 text-lg">
                    {stats.totalEvents > 0 ? Math.round((stats.safeEvents / stats.totalEvents) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table (for monthly/yearly reports) */}
          {dailyBreakdown.length > 0 && (
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-[#A1F1FA] mb-4">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-300">
                  <thead className="bg-gray-800 text-[#A1F1FA]">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-center">Events</th>
                      <th className="p-3 text-center">Avg Temp (°C)</th>
                      <th className="p-3 text-center">Avg Humidity (%)</th>
                      <th className="p-3 text-center">Total Duration (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyBreakdown.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-600 hover:bg-gray-600">
                        <td className="p-3">{day.date}</td>
                        <td className="p-3 text-center font-semibold">{day.events}</td>
                        <td className="p-3 text-center">{day.avgTemp}</td>
                        <td className="p-3 text-center">{day.avgHumidity}</td>
                        <td className="p-3 text-center">{day.totalDuration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {stats.totalEvents === 0 && (
            <div className="bg-gray-700 p-12 rounded-lg shadow-lg text-center">
              <FaCalendarAlt className="text-6xl text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Data Available</h3>
              <p className="text-gray-500">No misting events found for the selected period.</p>
            </div>
          )}
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
            className="flex flex-col items-center gap-1 p-3 hover:bg-gray-800 rounded-lg"
          >
            <FaChartBar className="text-xl" />
            <span className="text-xs">Dashboard</span>
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
            className="flex flex-col items-center gap-1 p-3 bg-gray-800 rounded-lg border-2 border-[#A1F1FA]"
          >
            <FaFileAlt className="text-xl text-[#A1F1FA]" />
            <span className="text-xs text-[#A1F1FA]">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}