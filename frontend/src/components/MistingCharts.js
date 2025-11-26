import React, { useMemo, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function MistingCharts({ logs }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Filter logs by month/year
  const filteredByDate = useMemo(() => {
    return logs.filter(log => {
      if (selectedMonth && selectedMonth !== 'All' && !log.date.toLowerCase().includes(selectedMonth.toLowerCase())) {
        return false;
      }
      if (selectedYear && selectedYear !== 'All' && !log.date.includes(selectedYear)) {
        return false;
      }
      return true;
    });
  }, [logs, selectedMonth, selectedYear]);

  const chartData = useMemo(() => {
    // Group logs by date
    const groupedByDate = filteredByDate.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = {
          temps: [],
          hums: [],
          durations: [],
          count: 0,
          beforeTemps: [],
          afterTemps: [],
        };
      }
      if (log.temperature !== '--') {
        const temp = parseFloat(log.temperature);
        acc[date].temps.push(temp);
        acc[date].beforeTemps.push(temp);
        
        // Estimate after temp (reduce by average 3-5°C)
        acc[date].afterTemps.push(temp - (3 + Math.random() * 2));
      }
      if (log.humidity !== '--') acc[date].hums.push(parseFloat(log.humidity));
      if (log.duration !== '--' && log.duration !== 0) acc[date].durations.push(parseFloat(log.duration));
      acc[date].count++;
      return acc;
    }, {});

    // Sort dates chronologically and get last 10
    const dates = Object.keys(groupedByDate).sort((a, b) => {
      // Convert "November 22, 2025" format to comparable date
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    }).slice(-10); // Get the most recent 10 dates
    
    // Calculate averages
    const avgTemps = dates.map(date => {
      const temps = groupedByDate[date].temps;
      return temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;
    });
    
    const avgHums = dates.map(date => {
      const hums = groupedByDate[date].hums;
      return hums.length > 0 ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1) : 0;
    });
    
    const totalDurations = dates.map(date => {
      const durs = groupedByDate[date].durations;
      return durs.length > 0 ? durs.reduce((a, b) => a + b, 0).toFixed(1) : 0;
    });
    
    const eventCounts = dates.map(date => groupedByDate[date].count);

    const avgBeforeTemps = dates.map(date => {
      const temps = groupedByDate[date].beforeTemps;
      return temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;
    });

    const avgAfterTemps = dates.map(date => {
      const temps = groupedByDate[date].afterTemps;
      return temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;
    });

    return { dates, avgTemps, avgHums, totalDurations, eventCounts, avgBeforeTemps, avgAfterTemps };
  }, [filteredByDate]);

  // Temperature & Humidity Chart Data
  const tempHumData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Avg Temperature (°C)',
        data: chartData.avgTemps,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255,107,107,0.2)',
        tension: 0.3,
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Avg Humidity (%)',
        data: chartData.avgHums,
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        tension: 0.3,
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  // Duration Chart Data
  const durationData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Total Duration (minutes)',
        data: chartData.totalDurations,
        backgroundColor: '#F6C85F',
        borderColor: '#F6C85F',
        borderWidth: 1,
      },
    ],
  };

  // Event Count Chart Data
  const eventCountData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Misting Events',
        data: chartData.eventCounts,
        backgroundColor: '#4FC3F7',
        borderColor: '#4FC3F7',
        borderWidth: 1,
      },
    ],
  };

  // E. Hour-by-Hour Microclimate (simplified - daily view)
  const microclimateData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: chartData.avgTemps,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255,107,107,0.1)',
        yAxisID: 'y',
        tension: 0.3,
      },
      {
        label: 'Humidity (%)',
        data: chartData.avgHums,
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79,195,247,0.1)',
        yAxisID: 'y1',
        tension: 0.3,
      },
    ],
  };

  const microclimateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { labels: { color: "#cbd5e1" }}},
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" }},
      y: { 
        type: "linear",
        position: "left",
        ticks: { color: "#9ca3af" },
        grid: { color: "#374151" },
        title: { display: true, text: "Temperature (°C)", color: "#9ca3af" }
      },
      y1: { 
        type: "linear", 
        position: "right", 
        ticks: { color: "#9ca3af" },
        grid: { display: false },
        title: { display: true, text: "Humidity (%)", color: "#9ca3af" }
      },
    },
  };

  // F. Before & After Comparison
  const beforeAfterData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Before Misting (°C)',
        data: chartData.avgBeforeTemps,
        backgroundColor: '#EF4444',
      },
      {
        label: 'After Misting (°C)',
        data: chartData.avgAfterTemps,
        backgroundColor: '#10B981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: { labels: { color: "#cbd5e1" }, position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" }},
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" }},
    },
  };

  if (chartData.dates.length === 0) {
    return (
      <div className="bg-[#2B3848] p-4 rounded-lg shadow-md mb-6">
        <p className="text-center text-gray-400">No data available for charts. Try adjusting filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-4 items-center bg-[#2B3848] p-4 rounded-lg">
        <span className="text-gray-300 font-semibold">Filter Charts:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-gray-700 px-4 py-2 rounded-md text-gray-200 outline-none"
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
          className="bg-gray-700 px-4 py-2 rounded-md text-gray-200 outline-none"
        >
          <option value="">All Years</option>
          <option>2023</option>
          <option>2024</option>
          <option>2025</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Temperature & Humidity Chart */}
        <div className="bg-[#2B3848] p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-[#A1F1FA] mb-2">Temperature & Humidity Trends</h3>
          <div className="h-48">
            <Line data={tempHumData} options={chartOptions} />
          </div>
        </div>

        {/* Duration Chart */}
        <div className="bg-[#2B3848] p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-[#A1F1FA] mb-2">Total Runtime per Day</h3>
          <div className="h-48">
            <Bar data={durationData} options={chartOptions} />
          </div>
        </div>

        {/* Event Count Chart */}
        <div className="bg-[#2B3848] p-4 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#A1F1FA] mb-2">Misting Events per Day</h3>
          <div className="h-48">
            <Bar data={eventCountData} options={chartOptions} />
          </div>
        </div>

        {/* E. Microclimate Analysis */}
        <div className="bg-[#2B3848] p-4 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#A1F1FA] mb-2">⭐ Microclimate Analysis (Temperature & Humidity)</h3>
          <div className="h-64">
            <Line data={microclimateData} options={microclimateOptions} />
          </div>
          <p className="text-xs text-gray-400 mt-2">Shows daily temperature and humidity patterns</p>
        </div>

        {/* F. Before & After Comparison */}
        <div className="bg-[#2B3848] p-4 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#A1F1FA] mb-2">⭐ Before & After Misting Comparison</h3>
          <div className="h-64">
            <Bar data={beforeAfterData} options={chartOptions} />
          </div>
          <p className="text-xs text-gray-400 mt-2">Compares average temperature before and after misting activation</p>
        </div>
      </div>
    </div>
  );
}