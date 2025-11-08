import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaRegCalendarAlt, FaClipboardList, FaChartBar } from "react-icons/fa";

export function LogsTable({ logs }) {
    return (
        <div className="bg-[#2B3848] rounded-lg shadow-md p-4 mt-2 overflow-x-auto">
            <table className="min-w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="text-gray-300 border-b border-gray-600">
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Time</th>
                        <th className="py-3 px-4 font-semibold">Temperature (°C)</th>
                        <th className="py-3 px-4 font-semibold">Humidity (%)</th>
                        <th className="py-3 px-4 font-semibold">Heat Index (°C)</th>
                        <th className="py-3 px-4 font-semibold">Water Level (%)</th>
                        <th className="py-3 px-4 font-semibold">Duration (min)</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan="8" className="py-4 px-4 text-center text-gray-400">
                                No misting events recorded yet
                            </td>
                        </tr>
                    ) : (
                        logs.map((row, idx) => (
                            <tr
                                key={idx}
                                className="border-b border-gray-700 hover:bg-[#34475C] transition"
                            >
                                <td className="py-3 px-4">{row.date}</td>
                                <td className="py-3 px-4">{row.time}</td>
                                <td className="py-3 px-4">{row.temperature}</td>
                                <td className="py-3 px-4">{row.humidity}</td>
                                <td className="py-3 px-4">{row.heatIndex}</td>
                                <td className="py-3 px-4">{row.waterLevel}</td>
                                <td className="py-3 px-4">{row.duration}</td>
                                <td className={`py-3 px-4 font-medium ${row.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {row.status}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function DailyLogs() {
    const [query, setQuery] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;

    const API_BASE = process.env.REACT_APP_API_URL || "http://192.168.1.16:8081";
    const userName = localStorage.getItem("userName") || "Jp Macaspac";
    const navigate = useNavigate();

    // Fetch misting event logs from backend
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Fetch misting event logs from your backend API
                const response = await fetch(`${API_BASE}/api/misting/logs`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch misting logs');
                }
                
                const data = await response.json();
                
                // Transform the data to match the table format
                const computeHeatIndexC = (tempC, rh) => {
                    if (tempC === undefined || tempC === null || rh === undefined || rh === null) return '--';
                    const T = parseFloat(tempC);
                    const R = parseFloat(rh);
                    if (Number.isNaN(T) || Number.isNaN(R)) return '--';

                    // Convert Celsius to Fahrenheit
                    const Tf = (T * 9) / 5 + 32;

                    // NOAA heat index formula (in Fahrenheit)
                    const HI = -42.379 + 2.04901523 * Tf + 10.14333127 * R - 0.22475541 * Tf * R - 6.83783e-3 * Tf * Tf - 5.481717e-2 * R * R + 1.22874e-3 * Tf * Tf * R + 8.5282e-4 * Tf * R * R - 1.99e-6 * Tf * Tf * R * R;

                    // Convert back to Celsius
                    const HIc = ((HI - 32) * 5) / 9;
                    return HIc.toFixed(1);
                };

                const formattedLogs = data.map(item => {
                    const startDate = new Date(item.startTime);
                    const endDate = item.endTime ? new Date(item.endTime) : null;
                    const duration = endDate ? 
                        Math.round((endDate - startDate) / 60000) : // Convert ms to minutes
                        'In Progress';
                    
                    const temp = item.startTemperature ? parseFloat(item.startTemperature) : null;
                    const hum = item.startHumidity ? parseFloat(item.startHumidity) : null;
                    const hi = item.startHeatIndex ? parseFloat(item.startHeatIndex) : null;

                    return {
                        date: startDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }),
                        time: startDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        }),
                        temperature: temp !== null ? temp.toFixed(1) : '--',
                        humidity: hum !== null ? hum.toFixed(1) : '--',
                        heatIndex: hi !== null ? hi.toFixed(1) : (temp !== null && hum !== null ? computeHeatIndexC(temp, hum) : '--'),
                        waterLevel: item.startWaterLevel ? parseFloat(item.startWaterLevel).toFixed(1) : '--',
                        duration: typeof duration === 'number' ? duration : duration,
                        status: item.endTime ? 'Completed' : 'In Progress',
                        rawDate: startDate
                    };
                });

                // Sort by date descending (most recent first)
                formattedLogs.sort((a, b) => b.rawDate - a.rawDate);
                
                setLogs(formattedLogs);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching misting logs:', err);
                setError('Failed to load misting logs. Please try again later.');
                setLoading(false);
            }
        };

        fetchLogs();

        // Set up polling to refresh logs every 30 seconds
        const interval = setInterval(fetchLogs, 30000);
        
        return () => clearInterval(interval);
    }, [API_BASE]);

    // Filter logs based on search query and filters
    const filtered = useMemo(() => {
        return logs.filter((r) => {
            const q = query.trim().toLowerCase();
            if (q) {
                const matchesQ =
                    r.date.toLowerCase().includes(q) ||
                    r.time.toLowerCase().includes(q) ||
                    String(r.temperature).includes(q) ||
                    String(r.humidity).includes(q) ||
                    String(r.heatIndex).includes(q) ||
                    String(r.waterLevel).includes(q) ||
                    String(r.duration).toLowerCase().includes(q) ||
                    r.status.toLowerCase().includes(q);
                if (!matchesQ) return false;
            }
            if (month && month !== "Month" && !r.date.toLowerCase().includes(month.toLowerCase()))
                return false;
            if (year && year !== "Year" && !r.date.includes(year)) return false;
            return true;
        });
    }, [logs, query, month, year]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    useEffect(() => {
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [filtered]);

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, currentPage]);

    return (
        <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA]">
                <h1 className="text-xl font-bold">AgriCool</h1>

                <div className="relative">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-xs">{userName[0]}</span>
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

                {/* Sidebar + Main Content */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="fixed left-0 top-16 bottom-0 bg-gray-900 w-20 flex flex-col items-center p-4 gap-6 border-r-2 border-[#A1F1FA]">
                    <button
                        className="hover:text-[#A1F1FA] transition duration-200"
                        title="Dashboard"
                        onClick={() => navigate('/dashboard')}
                    >
                        <FaChartBar className="text-2xl" />
                    </button>

                    <button
                        className="hover:text-[#A1F1FA] transition duration-200 text-[#A1F1FA]"
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

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto ml-20 pt-20">
                    <h2 className="text-lg font-semibold mb-6 text-[#A1F1FA]">
                        Misting Event Logs
                    </h2>

                    {/* Search + Filters */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex items-center bg-[#2B3848] rounded-md px-3 py-2 w-full sm:w-1/3 shadow-sm">
                            <input
                                type="text"
                                placeholder="Search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="bg-transparent outline-none text-gray-200 w-full placeholder-gray-400"
                            />
                            <FaSearch size={18} className="text-gray-300" />
                        </div>

                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="bg-[#2B3848] px-4 py-2 rounded-md text-gray-200 outline-none shadow-sm"
                        >
                            <option>Month</option>
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
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-[#2B3848] px-4 py-2 rounded-md text-gray-200 outline-none shadow-sm"
                        >
                            <option>Year</option>
                            <option>2023</option>
                            <option>2024</option>
                            <option>2025</option>
                        </select>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-[#A1F1FA] text-gray-900 px-4 py-2 rounded-md font-semibold hover:bg-[#8DE0EA] transition shadow-sm"
                        >
                            Refresh
                        </button>
                    </div>

                    {loading && (
                        <div className="text-center text-gray-400 py-8">
                            Loading misting event logs...
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    {!loading && !error && <LogsTable logs={paginated} />}

                    {!loading && !error && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-gray-400 text-sm">
                                Showing {filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} filtered ({logs.length} total)
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
                    )}
                </main>
            </div>
        </div>
    );
}