import React, { useState, useEffect, useRef } from 'react';

export default function ThermalCamera({ espIp = "192.168.56.3" }) {
  const canvasRef = useRef(null);
  const [thermalData, setThermalData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThermalData = async () => {
      try {
        const response = await fetch(`http://${espIp}/thermal/frame`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setThermalData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    const interval = setInterval(fetchThermalData, 500);
    fetchThermalData();

    return () => clearInterval(interval);
  }, [espIp]);

  useEffect(() => {
    if (!thermalData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellW = canvas.width / 32;
    const cellH = canvas.height / 24;

    // Draw thermal image
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 32; x++) {
        const i = y * 32 + x;
        const temp = thermalData.pixels[i];
        
        ctx.fillStyle = tempToColor(temp);
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // Draw detection box if pig present
    if (thermalData.pigPresent) {
      const hotPixels = [];
      for (let i = 0; i < thermalData.pixels.length; i++) {
        if (thermalData.pixels[i] >= 35) {
          hotPixels.push({
            x: i % 32,
            y: Math.floor(i / 32)
          });
        }
      }

      if (hotPixels.length > 0) {
        const xs = hotPixels.map(p => p.x);
        const ys = hotPixels.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          minX * cellW,
          minY * cellH,
          (maxX - minX + 1) * cellW,
          (maxY - minY + 1) * cellH
        );

        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(
          thermalData.pigName || 'Unknown Pig',
          minX * cellW + 5,
          minY * cellH - 5
        );
      }
    }
  }, [thermalData]);

  const tempToColor = (temp) => {
    if (temp >= 38) return '#FF0000';
    if (temp >= 35) return '#FF6600';
    if (temp >= 32) return '#FFFF00';
    if (temp >= 28) return '#00FF00';
    return '#0000FF';
  };

  const getStatusColor = (status) => {
    if (status === 'FEVER!') return 'text-red-500';
    if (status === 'Elevated') return 'text-yellow-500';
    if (status === 'Normal') return 'text-green-500';
    return 'text-gray-400';
  };

  if (error) {
    return (
      <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-6 text-center">
        <p className="text-red-400">❌ Thermal camera error: {error}</p>
      </div>
    );
  }

  if (!thermalData) {
    return (
      <div className="bg-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-400">Loading thermal camera...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
      <h3 className="text-xl font-bold text-[#A1F1FA] mb-4">
        🌡️ Live Thermal Camera (MLX90640)
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full max-h-96 border-2 border-[#A1F1FA] rounded-lg"
            style={{ imageRendering: 'pixelated' }}
          />
          
          <div className="flex justify-center gap-2 mt-3 flex-wrap text-xs">
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-blue-600"></div>
              <span>Cold (20-28°C)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-green-600"></div>
              <span>Cool (28-32°C)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-yellow-500"></div>
              <span>Warm (32-35°C)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-orange-600"></div>
              <span>Hot (35-38°C)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-red-600"></div>
              <span>Very Hot (≥38°C)</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-bold text-[#A1F1FA] mb-2">Temperature</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Max:</span>
                <span className="font-bold text-red-400">
                  {thermalData.maxTemp.toFixed(1)}°C
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg:</span>
                <span className="font-bold text-yellow-400">
                  {thermalData.avgTemp.toFixed(1)}°C
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Min:</span>
                <span className="font-bold text-blue-400">
                  {thermalData.minTemp.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-bold text-[#A1F1FA] mb-2">Status</h4>
            <p className={`text-2xl font-bold ${getStatusColor(thermalData.status)}`}>
              {thermalData.status}
            </p>
          </div>

          {thermalData.pigPresent && thermalData.pigRFID && (
            <div className="bg-blue-900/30 border-2 border-blue-500 p-4 rounded-lg">
              <h4 className="font-bold text-blue-400 mb-2">🐷 Pig Detected</h4>
              <p className="font-bold text-lg">{thermalData.pigName || 'Unknown'}</p>
              <p className="text-xs text-gray-400">RFID: {thermalData.pigRFID}</p>
              <p className="text-sm mt-2">
                Body Temp: <span className="font-bold text-red-400">
                  {thermalData.maxTemp.toFixed(1)}°C
                </span>
              </p>
            </div>
          )}

          {!thermalData.pigPresent && (
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <p className="text-gray-400 text-sm">No pig detected</p>
              <p className="text-xs text-gray-500 mt-1">Scan RFID tag</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}