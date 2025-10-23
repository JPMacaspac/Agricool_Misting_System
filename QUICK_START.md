# 🚀 Quick Reference Guide

## 📂 Where Everything Is Now

```
frontend/          → Your React web app
backend/           → Your NestJS API server
hardware/          → Arduino & ESP32 code
  ├── arduino_mega/    → Code for Arduino Mega
  └── esp32/           → Code for ESP32 WiFi bridge
docs/              → All documentation
```

---

## ⚡ Quick Commands

### Start Development

```powershell
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm start
```

### Install Dependencies

```powershell
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

### Clean Up Unused Files

```powershell
cd "c:\Users\PCUser\Desktop\Agricool_Misting System"
Remove-Item "bash.exe.stackdump"
Remove-Item "backend\server" -Recurse -Force
Remove-Item "node_modules" -Recurse -Force
```

---

## 🔧 Hardware Quick Setup

### Arduino Mega
1. Open: `hardware/arduino_mega/misting_system.ino`
2. Board: "Arduino Mega or Mega 2560"
3. Upload and test with Serial Monitor (9600 baud)

### ESP32
1. Open: `hardware/esp32/esp32_wifi_bridge.ino`
2. Update WiFi credentials (lines 14-15)
3. Update server URL with your PC's IP (line 19)
4. Board: "ESP32 Dev Module"
5. Upload and test with Serial Monitor (9600 baud)

### Connections
```
Arduino TX1 (18) → ESP32 RX2 (16)
Arduino RX1 (19) → ESP32 TX2 (17)
Arduino GND → ESP32 GND ⚠️ IMPORTANT!
```

---

## 🔍 Find Your PC's IP Address

```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

Update in ESP32 code:
```cpp
const char* serverUrl = "http://192.168.1.100:3000/api/sensors";
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensors` | Add sensor reading (from ESP32) |
| GET | `/api/sensors` | Get all readings |
| GET | `/api/sensors/latest` | Get latest reading |
| POST | `/signup` | Register user |
| POST | `/login` | User login |

---

## 🧪 Testing Checklist

- [ ] Arduino displays on LCD
- [ ] Arduino prints to Serial Monitor
- [ ] ESP32 connects to WiFi
- [ ] ESP32 receives data from Arduino
- [ ] Backend server running
- [ ] Backend receives data (check logs)
- [ ] Web dashboard shows live data
- [ ] Pump activates when hot (>32°C)
- [ ] LEDs show water level

---

## 📚 Documentation Guide

| File | What's Inside |
|------|---------------|
| `README.md` | Main project overview |
| `hardware/README.md` | Complete wiring guide |
| `docs/ESP32_INTEGRATION_GUIDE.md` | Step-by-step ESP32 setup |
| `docs/FILES_TO_DELETE.md` | What to delete and why |
| `docs/REORGANIZATION_SUMMARY.md` | Complete summary of changes |

---

## 🐛 Quick Troubleshooting

### ESP32 won't connect to WiFi
- Check SSID & password (case-sensitive!)
- WiFi must be 2.4GHz (not 5GHz)
- Move ESP32 closer to router

### ESP32 can't reach backend
- Use IP address, not "localhost"
- Check firewall (allow port 3000)
- Ensure ESP32 and PC on same network
- Backend must be running!

### No data from Arduino to ESP32
- Check TX→RX and RX→TX (crossed!)
- **Connect GND to GND** (most common issue!)
- Verify both Serial.begin(9600)
- Test Arduino standalone first

### Backend errors
- Check MySQL is running
- Verify database credentials
- Run `npm install` in backend folder

### Frontend can't fetch data
- Check backend is running
- Verify API endpoint URL
- Check browser console for errors

---

## 💾 Database Setup

```sql
-- Create database
CREATE DATABASE agricool_db;
USE agricool_db;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'client',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensor data table
CREATE TABLE sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temperature DECIMAL(5,2) NOT NULL,
  humidity DECIMAL(5,2) NOT NULL,
  waterLevel INT NOT NULL,
  pumpStatus BOOLEAN NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Current Priority Tasks

1. **Delete unused files** (see cleanup commands above)
2. **Upload Arduino code** to Arduino Mega
3. **Configure & upload ESP32 code** to ESP32
4. **Wire Arduino to ESP32** (TX-RX-GND)
5. **Test the system** (follow testing checklist)

---

## 📞 Need More Help?

- **Wiring:** See `hardware/README.md`
- **ESP32 Setup:** See `docs/ESP32_INTEGRATION_GUIDE.md`
- **What Changed:** See `docs/REORGANIZATION_SUMMARY.md`
- **What to Delete:** See `docs/FILES_TO_DELETE.md`

---

## 💡 Pro Tips

- Always test components individually before connecting
- Use Serial Monitor extensively for debugging
- Keep power supplies separate during testing
- Label your wires to avoid confusion
- Backup working code before making changes

---

**Everything is ready - just upload and connect!** 🚀
