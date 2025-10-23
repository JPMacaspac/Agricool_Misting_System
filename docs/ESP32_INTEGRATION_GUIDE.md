# ESP32 to Arduino Mega Integration Guide

## 🎯 Overview

This guide explains how to connect your ESP32 to Arduino Mega and integrate them with your web application.

---

## 🔌 Physical Connection

### Materials Needed
- Arduino Mega 2560
- ESP32 Development Board
- 3 Jumper Wires (Male-to-Male)
- 2 USB Cables (for programming)
- 2 Power Supplies (for deployment)

### Wiring Diagram

```
Arduino Mega              ESP32
┌──────────┐           ┌──────────┐
│          │           │          │
│  TX1(18) ├──────────►│ RX2(16)  │
│          │           │          │
│  RX1(19) │◄──────────┤ TX2(17)  │
│          │           │          │
│   GND    ├───────────┤   GND    │
│          │           │          │
└──────────┘           └──────────┘
```

### Pin Connections

| Arduino Mega | ESP32 | Wire Color (Suggested) |
|--------------|-------|------------------------|
| TX1 (Pin 18) | RX2 (GPIO 16) | Yellow |
| RX1 (Pin 19) | TX2 (GPIO 17) | Orange |
| GND | GND | Black |

⚠️ **CRITICAL:** Always connect GND between the two boards!

---

## 📝 Step-by-Step Setup

### Step 1: Prepare Arduino Mega

1. **Upload the Arduino code first** (without ESP32 connected)
   - Open `hardware/arduino_mega/misting_system.ino`
   - Connect Arduino Mega via USB
   - Select Board: "Arduino Mega or Mega 2560"
   - Select Processor: "ATmega2560"
   - Click Upload
   
2. **Test standalone**
   - Open Serial Monitor (9600 baud)
   - You should see sensor readings
   - LCD should display temperature and humidity

### Step 2: Prepare ESP32

1. **Install ESP32 Board Support**
   - Open Arduino IDE
   - File → Preferences
   - In "Additional Board Manager URLs", add:
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Tools → Board → Boards Manager
   - Search "ESP32"
   - Install "ESP32 by Espressif Systems"

2. **Configure WiFi Settings**
   - Open `hardware/esp32/esp32_wifi_bridge.ino`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YourWiFiName";
     const char* password = "YourWiFiPassword";
     ```

3. **Find Your Backend IP Address**
   - On your PC running the backend, open PowerShell:
     ```powershell
     ipconfig
     ```
   - Look for IPv4 Address (e.g., 192.168.1.100)
   - Update in ESP32 code:
     ```cpp
     const char* serverUrl = "http://192.168.1.100:3000/api/sensors";
     ```
   - **Don't use "localhost"** - use the actual IP address!

4. **Upload ESP32 Code**
   - Connect ESP32 via USB
   - Tools → Board → "ESP32 Dev Module"
   - Tools → Upload Speed → "115200"
   - Tools → Port → Select ESP32's COM port
   - Click Upload
   - **Troubleshooting:** If upload fails, hold BOOT button while uploading

### Step 3: Connect Arduino to ESP32

1. **Disconnect both boards from USB**
2. **Make the 3 wire connections** as shown in the wiring diagram
3. **Double-check:**
   - TX → RX (crossed, not direct)
   - RX → TX (crossed, not direct)
   - GND → GND

### Step 4: Power Up and Test

1. **Power Arduino Mega** (USB or external power)
2. **Power ESP32** (USB or external power)
3. **Connect ESP32 to computer** to view Serial Monitor
4. **Open Serial Monitor** (9600 baud)
5. **You should see:**
   ```
   === AgriCool ESP32 WiFi Bridge ===
   Connecting to WiFi: YourWiFiName
   ....
   ✓ WiFi Connected!
   IP Address: 192.168.1.150
   Received from Arduino: 34.5,60.2,75,1
   Parsed - Temp: 34.50°C, Humidity: 60.20%, Water: 75%, Pump: ON
   Sending to server: {"temperature":34.50,"humidity":60.20,"waterLevel":75,"pumpStatus":true}
   ✓ Server response code: 201
   ```

---

## 🌐 Backend Integration

### Step 1: Update Backend to Accept Sensor Data

The backend has been updated to accept sensor data at `/api/sensors`:

**Request Format (from ESP32):**
```json
{
  "temperature": 34.5,
  "humidity": 60.2,
  "waterLevel": 75,
  "pumpStatus": true
}
```

### Step 2: Start Backend Server

```powershell
cd backend
npm run start:dev
```

Backend will listen on `http://localhost:3000`

### Step 3: Verify Data is Received

**Check backend logs:**
You should see:
```
Received sensor data: { temperature: 34.5, humidity: 60.2, waterLevel: 75, pumpStatus: true }
```

**Test with API client (optional):**
- Open browser or Postman
- GET `http://localhost:3000/api/sensors/latest`
- Should return latest sensor reading

---

## 🖥️ Frontend Integration

### Update Dashboard to Display Live Data

Edit `frontend/src/pages/Dashboard.js` to fetch data:

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    waterLevel: 0,
    pumpStatus: false
  });

  useEffect(() => {
    // Fetch latest sensor data every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/sensors/latest');
        setSensorData(response.data);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Temperature: {sensorData.temperature}°C</div>
      <div>Humidity: {sensorData.humidity}%</div>
      <div>Water Level: {sensorData.waterLevel}%</div>
      <div>Pump Status: {sensorData.pumpStatus ? 'ON' : 'OFF'}</div>
    </div>
  );
}

export default Dashboard;
```

---

## 🔧 Troubleshooting

### Problem: ESP32 won't connect to WiFi

**Solutions:**
- Verify SSID and password are correct (case-sensitive!)
- Check if WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Try moving ESP32 closer to router
- Check router isn't blocking new devices

### Problem: ESP32 can't reach backend

**Solutions:**
- Use IP address, not "localhost"
- Check firewall isn't blocking port 3000
- Verify backend is running (`npm run start:dev`)
- Test backend accessibility: open browser and visit `http://YOUR_IP:3000/api/sensors`
- Ensure ESP32 and PC are on the same network

### Problem: No data received from Arduino

**Solutions:**
- Verify TX/RX wires are crossed correctly
- Check GND is connected
- Verify both Serial.begin() are 9600 baud
- Open Arduino Serial Monitor to confirm it's sending data
- Check for loose connections

### Problem: Garbage characters on ESP32 Serial

**Solutions:**
- Baud rates must match (9600 on both)
- Check wiring (TX-RX crossed)
- Try different Serial pins on ESP32 if needed

### Problem: Backend returns 404 or CORS error

**Solutions:**
- Verify endpoint is `/api/sensors` (not `/sensors`)
- Enable CORS in backend:
  ```typescript
  // In main.ts
  app.enableCors();
  ```
- Check backend is actually running

---

## 📊 Data Flow Summary

```
DHT22 Sensor → Arduino Mega → Serial (TX1/RX1) → ESP32 Serial (RX2/TX2)
                    ↓
           LCD + LED Display
                    ↓
            Pump Control (Relay)

ESP32 → WiFi → HTTP POST → Backend API → MySQL Database → Web Dashboard
```

---

## 🔋 Power Considerations

### Development (Bench Testing)
- Arduino Mega: USB power from computer
- ESP32: Separate USB power (computer or wall adapter)
- This keeps them isolated during development

### Production (Deployed System)
- Use regulated power supply (12V recommended)
- Step down to 5V for Arduino (7805 regulator)
- Step down to 5V for ESP32 (buck converter)
- Ensure pump has adequate power (separate 12V supply)

**Sample Power Circuit:**
```
12V Power Supply
    ├─→ Pump (via Relay)
    ├─→ 7805 Regulator → Arduino VIN (5V)
    └─→ Buck Converter → ESP32 VIN (5V)
```

---

## ✅ Testing Checklist

- [ ] Arduino uploads successfully
- [ ] Arduino displays sensor data on LCD
- [ ] Arduino prints data to Serial Monitor
- [ ] ESP32 uploads successfully
- [ ] ESP32 connects to WiFi
- [ ] ESP32 receives data from Arduino
- [ ] Backend server is running
- [ ] ESP32 successfully sends POST requests
- [ ] Backend logs show received data
- [ ] Web dashboard displays live sensor data
- [ ] Pump activates when temperature exceeds threshold
- [ ] Water level LEDs work correctly

---

## 🎓 Learning Resources

### ESP32 Resources
- [ESP32 Official Docs](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Random Nerd Tutorials - ESP32](https://randomnerdtutorials.com/esp32-useful-wi-fi-functions-arduino/)

### Arduino Serial Communication
- [Arduino Serial Reference](https://www.arduino.cc/reference/en/language/functions/communication/serial/)
- [Serial Communication Between Arduino Boards](https://docs.arduino.cc/learn/communication/serial/)

---

## 🚀 Next Steps

1. ✅ Get ESP32 communicating with Arduino
2. ✅ Get ESP32 sending data to backend
3. ✅ Display data on web dashboard
4. ⏳ Wait for Nextion display delivery
5. ⏳ Integrate Nextion touchscreen
6. ⏳ Add advanced features (alerts, analytics)

---

## 💡 Pro Tips

1. **Always test standalone first** before connecting devices
2. **Use Serial Monitor** extensively for debugging
3. **Label your wires** to avoid confusion
4. **Keep backups** of working code
5. **Test incrementally** - add one feature at a time
6. **Document changes** as you make them

---

**Last Updated:** October 19, 2025
