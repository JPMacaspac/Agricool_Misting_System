# Hardware Setup & Wiring Guide

## 🔧 Components List

### Arduino Mega 2560
- Main controller for sensors and actuators
- Handles DHT22, water sensor, LCD, LEDs, buzzer, and relay

### ESP32
- WiFi module for cloud connectivity
- Receives data from Arduino via Serial
- Sends data to backend API

### Sensors & Actuators
- **DHT22** - Temperature & Humidity sensor
- **Water Level Sensor** - Analog sensor for water tank monitoring
- **LCD I2C 16x2** - Display for local monitoring
- **3 LEDs** - Red (low water), Yellow (medium), Green (good)
- **Buzzer** - Low water alarm
- **Relay Module** - Controls water pump (misting system)
- **Water Pump** - 12V DC pump for misting

---

## 📟 Arduino Mega Wiring

### DHT22 Temperature & Humidity Sensor
```
DHT22 Pin 1 (VCC)  →  Arduino 5V
DHT22 Pin 2 (DATA) →  Arduino Digital Pin 7
DHT22 Pin 4 (GND)  →  Arduino GND
```
*Note: Add a 10kΩ pull-up resistor between VCC and DATA pins*

### LCD I2C Display (16x2)
```
LCD VCC  →  Arduino 5V
LCD GND  →  Arduino GND
LCD SDA  →  Arduino Pin 20 (SDA)
LCD SCL  →  Arduino Pin 21 (SCL)
```

### Water Level Sensor
```
Sensor VCC    →  Arduino 5V
Sensor GND    →  Arduino GND
Sensor Signal →  Arduino Analog Pin A0
```

### LEDs (with 220Ω resistors)
```
Red LED Anode (+)    →  Arduino Pin 2  →  220Ω Resistor  →  GND
Yellow LED Anode (+) →  Arduino Pin 3  →  220Ω Resistor  →  GND
Green LED Anode (+)  →  Arduino Pin 4  →  220Ω Resistor  →  GND
```

### Buzzer
```
Buzzer (+)  →  Arduino Pin 5
Buzzer (-)  →  Arduino GND
```

### Relay Module (for Water Pump)
```
Relay VCC  →  Arduino 5V
Relay GND  →  Arduino GND
Relay IN   →  Arduino Pin 8
```

**Pump Wiring:**
```
12V Power Supply (+) → Relay COM (Common)
Relay NO (Normally Open) → Water Pump (+)
Water Pump (-) → 12V Power Supply (-)
```

---

## 📡 ESP32 to Arduino Mega Connection

### Serial Communication Wiring
```
Arduino Mega TX1 (Pin 18) → ESP32 RX2 (GPIO 16)
Arduino Mega RX1 (Pin 19) → ESP32 TX2 (GPIO 17)
Arduino Mega GND          → ESP32 GND ⚠️ CRITICAL!
```

### Important Notes:
1. **Common Ground:** Always connect GND between Arduino and ESP32
2. **Separate Power:** Each board should have its own power supply
   - Arduino Mega: 7-12V DC or USB
   - ESP32: 5V USB or 3.3V regulated
3. **Voltage Levels:** ESP32 is 3.3V logic, but most ESP32 boards have 5V tolerant pins
4. **Don't cross-connect:** Never connect Arduino 5V to ESP32 3.3V pin!

---

## 🔌 Power Supply Setup

### Option 1: Development/Testing
- Arduino Mega: USB cable from computer
- ESP32: Separate USB cable from computer or 5V power adapter

### Option 2: Production/Deployment
- **12V Power Supply** (for pump and system)
  - Use a 12V 2A DC adapter
  - Connect to relay module for pump
  - Use a 7812 voltage regulator → Arduino Mega VIN
  - Use a Buck converter (12V → 5V) → ESP32 VIN
  
### Circuit Diagram (Simplified)
```
12V Power Supply
    ├─→ Water Pump (via Relay)
    ├─→ 7805 Regulator → Arduino VIN
    └─→ Buck Converter → ESP32 VIN (5V)
```

---

## 📶 ESP32 WiFi Configuration

### Step 1: Update WiFi Credentials
Edit `esp32_wifi_bridge.ino`:
```cpp
const char* ssid = "YourWiFiName";
const char* password = "YourWiFiPassword";
```

### Step 2: Set Backend API URL
```cpp
const char* serverUrl = "http://192.168.1.100:3000/api/sensors";
```

**Finding your backend IP:**
- On your computer running the backend, open PowerShell:
  ```powershell
  ipconfig
  ```
- Look for "IPv4 Address" under your active network adapter
- Use this IP in the serverUrl

---

## 🚀 Upload Process

### 1. Upload Arduino Mega Code
1. Open `hardware/arduino_mega/misting_system.ino` in Arduino IDE
2. Select **Board:** "Arduino Mega or Mega 2560"
3. Select **Port:** Your Arduino's COM port
4. Click **Upload**
5. Open Serial Monitor (9600 baud) to verify it's working

### 2. Upload ESP32 Code
1. Open `hardware/esp32/esp32_wifi_bridge.ino` in Arduino IDE
2. Install ESP32 board support:
   - File → Preferences
   - Additional Board URLs: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install
3. Select **Board:** "ESP32 Dev Module"
4. Select **Port:** Your ESP32's COM port
5. Click **Upload**
6. Open Serial Monitor (9600 baud) to verify WiFi connection

---

## 🧪 Testing the System

### Test 1: Arduino Mega Standalone
1. Upload Arduino code
2. Open Serial Monitor
3. Verify sensor readings appear
4. Check LCD displays temperature & humidity
5. Test water level sensor with water
6. Verify LEDs light up based on water level

### Test 2: ESP32 Communication
1. Connect Arduino TX1 to ESP32 RX2 (with common ground!)
2. Upload ESP32 code
3. Open Serial Monitor on ESP32
4. You should see "Received from Arduino: XX.X,YY.Y,ZZ,W"

### Test 3: Web Integration
1. Start your backend server
2. ESP32 should send data every 5 seconds
3. Check backend logs for incoming data
4. Open your web dashboard to see live readings

---

## 🐛 Troubleshooting

### Arduino Issues
- **No LCD display:** Check I2C address (try 0x3F if 0x27 doesn't work)
- **DHT22 errors:** Check wiring and 10kΩ pull-up resistor
- **Pump doesn't turn on:** Verify relay wiring and temperature threshold

### ESP32 Issues
- **Won't connect to WiFi:** Double-check SSID and password
- **Can't upload code:** Press BOOT button while uploading
- **No data from Arduino:** Verify Serial2 wiring and common ground

### Communication Issues
- **ESP32 receives garbage data:** Check baud rates match (9600)
- **No communication:** Verify TX→RX and RX→TX are crossed correctly
- **Random disconnects:** Add 100nF capacitor near ESP32 power pins

---

## 📊 Data Flow

```
DHT22 + Water Sensor → Arduino Mega → Serial → ESP32 → WiFi → Backend API → Database → Web Dashboard
         ↓
    Local LCD Display
         ↓
    LED Indicators
         ↓
    Pump Control (via Relay)
```

---

## 🔐 Security Notes

1. **WiFi Security:** Use WPA2 encrypted network
2. **API Authentication:** Add authentication to your backend (implement later)
3. **Data Validation:** Backend should validate incoming sensor data
4. **Physical Security:** Protect ESP32 and Arduino from water/moisture

---

## 📝 Next Steps

1. ✅ Wire Arduino Mega components
2. ✅ Test Arduino code standalone
3. ✅ Wire ESP32 to Arduino
4. ✅ Configure WiFi credentials
5. ✅ Test ESP32 communication
6. ✅ Update backend API endpoint
7. ✅ Test full system integration
8. ⏳ Wait for Nextion display (replace LCD later)

---

## 🆘 Support

If you encounter issues:
1. Check all wire connections
2. Verify power supplies are adequate
3. Check Serial Monitor for error messages
4. Test each component individually
5. Verify backend is running and accessible

**Common Issue:** If pump activates constantly, adjust `tempThreshold` in Arduino code.
