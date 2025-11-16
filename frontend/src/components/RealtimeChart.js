import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, annotationPlugin);

function computeHeatIndexCelsius(tempC, humidity) {
  // Convert C to F
  const T = tempC * 9 / 5 + 32;
  const R = humidity;

  // NOAA heat index formula (valid for T>=80F and RH >=40% roughly), we'll still compute for others
  const HI = -42.379
    + 2.04901523 * T
    + 10.14333127 * R
    - 0.22475541 * T * R
    - 0.00683783 * T * T
    - 0.05481717 * R * R
    + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R
    - 0.00000199 * T * T * R * R;

  // Convert back to Celsius
  const hiC = (HI - 32) * 5 / 9;
  return Number(hiC.toFixed(2));
}

export default function RealtimeChart({ sensor }) {
  // sensor: { temperature, humidity, createdAt }
  const [history, setHistory] = useState([]);

  // keep last 30 points
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

  const data = {
    labels,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: history.map((p) => (p.temp !== null ? Number(p.temp) : null)),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255,107,107,0.2)',
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Humidity (%)',
        data: history.map((p) => (p.hum !== null ? Number(p.hum) : null)),
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Heat Index (°C)',
        data: history.map((p) => (p.heatIndex !== null ? Number(p.heatIndex) : null)),
        borderColor: '#F6C85F',
        backgroundColor: 'rgba(246,200,95,0.12)',
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
      tooltip: { mode: 'index', intersect: false },
      annotation: {
        annotations: {
          dangerLine: {
            type: 'line',
            yMin: 35,
            yMax: 35,
            borderColor: '#EF4444',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: 'Danger Zone (35°C)',
              position: 'end',
              backgroundColor: '#EF4444',
              color: '#fff',
              font: {
                weight: 'bold',
                size: 11
              }
            }
          }
        }
      }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' } },
      y: { ticks: { color: '#9ca3af' } },
    },
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-md h-64">
      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-2">Realtime (last ~30)</h4>
      <div className="w-full h-[200px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}