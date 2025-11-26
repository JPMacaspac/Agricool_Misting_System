import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartBar,
  FaRegCalendarAlt,
  FaClipboardList,
  FaSearch,
  FaTimes,
  FaSync,
  FaThermometerHalf,
  FaFileAlt,
} from 'react-icons/fa';

const API_URL = 'http://localhost:8081/api';

export default function Records() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedPig, setSelectedPig] = useState(null);
  const [pigRecords, setPigRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;
  
  const userName = localStorage.getItem("userName") || "Marc Andrei Toledo";
  const profilePicture = localStorage.getItem("profilePicture") || "";
  const navigate = useNavigate();

  // Fetch records from backend
  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      if (selectedYear !== 'all') params.append('year', selectedYear);
      
      const response = await fetch(`${API_URL}/records?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      
      const data = await response.json();
      setPigRecords(data.records || []);
      console.log(`✅ Loaded ${data.count} thermal records`);
      
    } catch (err) {
      console.error('Error fetching records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchRecords();
    setCurrentPage(1); // Reset to first page when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedMonth, selectedYear]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecords();
    }, 10000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedMonth, selectedYear]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const openModal = (pig) => {
    setSelectedPig(pig);
  };

  const closeModal = () => {
    setSelectedPig(null);
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'text-green-400';
      case 'Elevated': return 'text-yellow-400';
      case 'Fever Alert': return 'text-red-400';
      case 'Low Temp': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getTempColor = (temp) => {
    const tempNum = parseFloat(temp);
    if (tempNum < 38.0) return 'text-blue-400';
    if (tempNum >= 38.0 && tempNum <= 39.5) return 'text-green-400';
    if (tempNum > 39.5 && tempNum < 40.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(pigRecords.length / recordsPerPage));
  
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return pigRecords.slice(startIndex, startIndex + recordsPerPage);
  }, [pigRecords, currentPage]);

  return (
    <div className="bg-gray-800 h-screen text-white font-sans flex flex-col overflow-hidden">
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
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA] z-30">
        <h1 className="text-xl font-bold">AgriCool</h1>

        <div className="flex items-center gap-4">
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
                    navigate('/');
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
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Fixed Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 bg-gray-900 w-20 flex flex-col items-center p-4 gap-6 border-r-2 border-[#A1F1FA] z-20">
          <button
            className="hover:text-[#A1F1FA] transition duration-200 p-3 rounded-lg hover:bg-gray-800"
            title="Dashboard"
            onClick={() => navigate('/dashboard')}
          >
            <FaChartBar className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200 p-3 rounded-lg hover:bg-gray-800"
            title="Daily Log"
            onClick={() => navigate('/daily-logs')}
          >
            <FaRegCalendarAlt className="text-2xl" />
          </button>

          <button
            className="text-[#A1F1FA] transition duration-200 bg-gray-800 p-3 rounded-lg border-2 border-[#A1F1FA]"
            title="Records"
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200 p-3 rounded-lg hover:bg-gray-800"
            title="Reports"
            onClick={() => navigate('/reports')}
          >
            <FaFileAlt className="text-2xl" />
          </button>

          <div className="flex-1"></div>

          <div className="w-6 h-6 bg-gray-600 rounded-md"></div>
        </aside>

        {/* Main Content with Scrollbar */}
        <main className="flex-1 ml-20 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#A1F1FA]">🌡️ Live Thermal Monitoring</h2>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FaSync className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
              <p className="text-blue-300 font-semibold">📡 ESP32 Thermal Camera Active</p>
              <p className="text-gray-400 text-sm mt-1">Auto-scanning every 15 seconds. Data refreshes automatically.</p>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search (temperature, date...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
              >
                <option value="all">Month</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
              >
                <option value="all">Year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            {/* Loading/Error States */}
            {loading && (
              <div className="text-center py-12">
                <FaSync className="animate-spin text-4xl text-[#A1F1FA] mx-auto mb-4" />
                <p className="text-gray-400">Loading thermal records...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-400">⚠️ Error: {error}</p>
                <p className="text-gray-400 text-sm mt-2">Make sure the backend server is running.</p>
              </div>
            )}

            {/* No Records */}
            {!loading && !error && pigRecords.length === 0 && (
              <div className="text-center py-12">
                <FaThermometerHalf className="text-6xl text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No thermal readings yet</p>
                <p className="text-gray-500 text-sm">ESP32 will auto-scan every 15 seconds. Data will appear here.</p>
              </div>
            )}

            {/* Pig Records Grid */}
            {!loading && !error && pigRecords.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {paginatedRecords.map((pig) => (
                    <div
                      key={pig.id}
                      className="bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group relative cursor-pointer"
                      onClick={() => openModal(pig)}
                    >
                      {/* Pig Icon Header */}
                      <div className="bg-gray-600 p-4 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🐷</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">{pig.name}</h3>
                          <p className="text-xs text-gray-300">{pig.date}</p>
                          <p className="text-xs text-gray-400">{pig.time}</p>
                        </div>
                      </div>

                      {/* Body Temp */}
                      <div className="p-4">
                        <p className="text-sm text-gray-300 mb-1">Body Temperature:</p>
                        <p className={`text-3xl font-bold ${getTempColor(pig.bodyTemp)}`}>
                          {pig.bodyTemp} °C
                        </p>
                        <div className="mt-2 flex justify-between text-xs text-gray-400">
                          <span>Min: {pig.minTemp}°C</span>
                          <span>Avg: {pig.avgTemp}°C</span>
                        </div>
                        <div className="mt-3">
                          <span className={`text-sm font-semibold ${getHealthStatusColor(pig.healthStatus)}`}>
                            {pig.healthStatus}
                          </span>
                        </div>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button className="bg-[#A1F1FA] text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-[#80D8E8] transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">
                    Showing {pigRecords.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, pigRecords.length)} of {pigRecords.length} records
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md font-semibold ${currentPage === 1 ? 'bg-gray-700 text-gray-400' : 'bg-[#A1F1FA] text-gray-900 hover:bg-[#8DE0EA]'}`}
                    >
                      Prev
                    </button>

                    <div className="text-sm text-gray-300 px-2">
                      Page {currentPage} / {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md font-semibold ${currentPage === totalPages ? 'bg-gray-700 text-gray-400' : 'bg-[#A1F1FA] text-gray-900 hover:bg-[#8DE0EA]'}`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal for Detailed View with Scrollbar */}
      {selectedPig && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border-2 border-[#A1F1FA] flex flex-col overflow-hidden">
            {/* Modal Header - Fixed */}
            <div className="bg-gray-900 p-6 flex justify-between items-center border-b-2 border-[#A1F1FA] flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🐷</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-[#A1F1FA]">{selectedPig.name}</h2>
                  <p className="text-gray-400">{selectedPig.date} at {selectedPig.time}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-3xl" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 rounded-b-2xl">
              {/* Health Status Banner */}
              <div className={`mb-6 p-4 rounded-lg ${
                selectedPig.healthStatus === 'Healthy' ? 'bg-green-900/30 border border-green-500' :
                selectedPig.healthStatus === 'Fever Alert' ? 'bg-red-900/30 border border-red-500' :
                selectedPig.healthStatus === 'Elevated' ? 'bg-yellow-900/30 border border-yellow-500' :
                'bg-blue-900/30 border border-blue-500'
              }`}>
                <p className="text-sm text-gray-300">Health Status:</p>
                <p className={`text-2xl font-bold ${getHealthStatusColor(selectedPig.healthStatus)}`}>
                  {selectedPig.healthStatus}
                </p>
              </div>

              {/* Temperature Information Grid */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Max Body Temp</p>
                  <p className={`text-2xl font-bold ${getTempColor(selectedPig.bodyTemp)}`}>
                    {selectedPig.bodyTemp} °C
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Hottest point detected</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Average Body Temp</p>
                  <p className={`text-2xl font-bold ${getTempColor(selectedPig.avgTemp)}`}>
                    {selectedPig.avgTemp} °C
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Overall body temperature</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Min Body Temp</p>
                  <p className={`text-2xl font-bold ${getTempColor(selectedPig.minTemp)}`}>
                    {selectedPig.minTemp} °C
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Coolest point detected</p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-gray-700 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-bold text-[#A1F1FA] mb-3">Scan Notes</h3>
                <p className="text-gray-300">{selectedPig.notes}</p>
              </div>

              {/* Temperature Reference Guide */}
              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-[#A1F1FA] mb-4">Temperature Reference</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    <div>
                      <p className="text-sm font-semibold">Low (&lt; 38.0°C)</p>
                      <p className="text-xs text-gray-400">Below normal range</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-400 rounded"></div>
                    <div>
                      <p className="text-sm font-semibold">Normal (38.0-39.5°C)</p>
                      <p className="text-xs text-gray-400">Healthy temperature</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                    <div>
                      <p className="text-sm font-semibold">Elevated (39.5-40.0°C)</p>
                      <p className="text-xs text-gray-400">Monitor closely</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-400 rounded"></div>
                    <div>
                      <p className="text-sm font-semibold">Fever (≥ 40.0°C)</p>
                      <p className="text-xs text-gray-400">Immediate attention needed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}