import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartBar,
  FaRegCalendarAlt,
  FaClipboardList,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';

export default function Records() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedPig, setSelectedPig] = useState(null);
  
  const userName = localStorage.getItem("userName") || "Marc Andrei Toledo";
  const profilePicture = localStorage.getItem("profilePicture") || "";
  const navigate = useNavigate();

  // Example pig data
  const pigRecords = [
    {
      id: 1,
      name: 'Pig 01',
      date: '01 - 21 - 25',
      bodyTemp: '36.2',
      time: '10:30 AM',
      weight: '45.5 kg',
      breed: 'Duroc',
      age: '6 months',
      healthStatus: 'Healthy',
      lastFed: '8:00 AM',
      notes: 'Active and eating well',
    },
    {
      id: 2,
      name: 'Pig 04',
      date: '01 - 21 - 25',
      bodyTemp: '36.2',
      time: '11:15 AM',
      weight: '52.3 kg',
      breed: 'Yorkshire',
      age: '7 months',
      healthStatus: 'Healthy',
      lastFed: '8:30 AM',
      notes: 'Good appetite, normal behavior',
    },
    {
      id: 3,
      name: 'Pig 05',
      date: '01 - 21 - 25',
      bodyTemp: '36.2',
      time: '2:45 PM',
      weight: '48.7 kg',
      breed: 'Landrace',
      age: '6.5 months',
      healthStatus: 'Healthy',
      lastFed: '12:00 PM',
      notes: 'Playful, no abnormalities detected',
    },
  ];

  const filteredRecords = pigRecords.filter(pig => {
    const matchesSearch = pig.name.toLowerCase().includes(searchQuery.toLowerCase());
    // Add month/year filtering logic here if needed
    return matchesSearch;
  });

  const openModal = (pig) => {
    setSelectedPig(pig);
  };

  const closeModal = () => {
    setSelectedPig(null);
  };

  return (
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
        
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA]">
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
        </div>
      </header>

      {/* Sidebar + Main Content */}
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
            className="text-[#A1F1FA] transition duration-200"
            title="Records"
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <div className="flex-1"></div>

          <div className="w-6 h-6 bg-gray-600 rounded-md"></div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 text-[#A1F1FA]">Records</h2>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search (type, date, time, etc.)"
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

          {/* Pig Records Grid */}
          <div className="grid grid-cols-3 gap-6">
            {filteredRecords.map((pig) => (
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
                  <div>
                    <h3 className="text-lg font-bold">{pig.name}</h3>
                    <p className="text-xs text-gray-300">Date: {pig.date}</p>
                  </div>
                </div>

                {/* Body Temp */}
                <div className="p-4">
                  <p className="text-sm text-gray-300 mb-1">Body Temp:</p>
                  <p className="text-2xl font-bold">{pig.bodyTemp} °C</p>
                </div>

                {/* Hover Overlay with "View More" */}
                <div className="absolute inset-0 bg-black bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button className="bg-[#A1F1FA] text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-[#80D8E8] transition-colors">
                    View More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Modal for Detailed View */}
    {/* Modal for Detailed View */}
{selectedPig && (
  <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-y-auto border-2 border-[#A1F1FA] my-4">
            {/* Modal Header */}
            <div className="bg-gray-900 p-6 flex justify-between items-center border-b-2 border-[#A1F1FA]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🐷</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-[#A1F1FA]">{selectedPig.name}</h2>
                  <p className="text-gray-400">Date: Sept. 6, 2025</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-3xl" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-gray-400 mb-2">Time:</p>
                  <p className="text-2xl font-bold">{selectedPig.time}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Body Temperature</p>
                  <p className="text-2xl font-bold text-[#A1F1FA]">{selectedPig.bodyTemp} °C</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Weight</p>
                  <p className="text-2xl font-bold text-[#A1F1FA]">{selectedPig.weight}</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Age</p>
                  <p className="text-2xl font-bold text-[#A1F1FA]">{selectedPig.age}</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Breed</p>
                  <p className="text-xl font-bold">{selectedPig.breed}</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Health Status</p>
                  <p className="text-xl font-bold text-green-400">{selectedPig.healthStatus}</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Last Fed</p>
                  <p className="text-xl font-bold">{selectedPig.lastFed}</p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mt-6 bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-[#A1F1FA] mb-3">Notes</h3>
                <p className="text-gray-300">{selectedPig.notes}</p>
              </div>

              {/* Temperature History Chart Placeholder */}
              <div className="mt-6 bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-[#A1F1FA] mb-4">Temperature History</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-600 h-32 rounded flex items-end justify-center pb-4">
                    <div className="w-16 bg-[#A1F1FA] h-20 rounded-t"></div>
                  </div>
                  <div className="bg-gray-600 h-32 rounded flex items-end justify-center pb-4">
                    <div className="w-16 bg-[#A1F1FA] h-24 rounded-t"></div>
                  </div>
                  <div className="bg-gray-600 h-32 rounded flex items-end justify-center pb-4">
                    <div className="w-16 bg-[#A1F1FA] h-20 rounded-t"></div>
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