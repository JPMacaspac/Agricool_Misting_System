/*
 * AgriCool ESP32 with MLX90640 (I2C) Thermal Camera
 * UPDATED: Flexible MQTT authentication (works with public & private brokers)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <Adafruit_MLX90640.h>
#include <SPI.h>
#include <MFRC522.h>

#define ARDUINO_RX 18
#define ARDUINO_TX 19

// I2C pins for ESP32
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// SPI pins for MFRC522 RFID
#define RFID_SS_PIN 15
#define RFID_RST_PIN 27
#define RFID_SCK_PIN 14
#define RFID_MOSI_PIN 13
#define RFID_MISO_PIN 12

#define nextion Serial2

const char* DEFAULT_SSID = "PLDTHOMEFIBR348b8";
const char* DEFAULT_PASS = "PLDTWIFI5bek7";
const char* DEFAULT_SERVER = "https://backend-production-f0a6e.up.railway.app/api/sensors";

// ✅ MQTT Configuration - Try HiveMQ public broker first (more reliable)
const char* MQTT_SERVER = "broker.hivemq.com";  // Public MQTT broker
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";  // Empty for public broker, set to "agricool" for Railway
const char* MQTT_PASS = "";  // Empty for public broker, set to "AgriCool" for Railway
const char* MQTT_TOPIC = "agricool/pump/command";

const float PIG_TEMP_NORMAL_MIN = 38.0;
const float PIG_TEMP_NORMAL_MAX = 39.5;
const float PIG_TEMP_FEVER = 40.0;
const unsigned long THERMAL_SCAN_INTERVAL = 15000;
const unsigned long RFID_SCAN_INTERVAL = 2000;

IPAddress fallback_server_ip(192, 168, 1, 2);

Preferences prefs;
const char* PREF_NAMESPACE = "agricool";
const char* KEY_SSID = "ssid";
const char* KEY_PASS = "pass";
const char* KEY_SERVER = "server";

WebServer webServer(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
// RFID Reader
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

String ssid;
String pass;
String serverUrl;
String resolvedServerUrl = "";

float temperature = 0.0;
float humidity = 0.0;
int waterLevel = 0;
bool pumpStatus = false;
bool manualMode = false;

// ✅ NEW: Misting type tracking variables
String currentMistingType = "NONE";
bool mistingActive = false;
unsigned long mistingStartTime = 0;
float mistingStartTemp = 0.0;
float mistingStartHumidity = 0.0;
float mistingStartWaterLevel = 0.0;
int currentMistingLogId = -1;
unsigned long lastCommandTime = 0;
String lastCommand = "";
const unsigned long COMMAND_COOLDOWN = 3000;

// Thermal camera data
Adafruit_MLX90640 mlx;
float mlxFrame[32*24];
float pigBodyTemp = 0.0;
float pigMinTemp = 0.0;
float pigAvgTemp = 0.0;
bool pigTempValid = false;
unsigned long lastThermalScan = 0;
bool thermalCameraAvailable = false;

// RFID tracking
String currentRFID = "";
String currentPigName = "";
int currentPigId = -1;
unsigned long lastRFIDScan = 0;
bool rfidAvailable = false;
bool pigPresent = false;
unsigned long pigDetectedTime = 0;
const unsigned long PIG_TIMEOUT = 10000;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;
unsigned long lastMqttReconnect = 0;
unsigned long lastBackendSuccess = 0;
bool backendReachable = false;

void startConfigPortal();
void handleRoot();
void handleManualOn();
void handleManualOff();
void handleAutoMode();
void handleStatus();
void handleScanPig();
void startWiFi(const char* s, const char* p);
bool tryStoredWiFi();
String resolveServerUrl(String url);
void mqttCallback(char* topic, byte* payload, unsigned int length);
void reconnectMQTT();
bool sendToBackend(String jsonPayload);
void scanPigTemperature();
String getPigTempStatus();
bool initThermalCamera();
void startMisting(String mistingType);
void stopMisting();
void sendMistingStart(String mistingType);
void sendMistingEnd();
bool initRFID();
void scanRFID();
String getRFIDString(MFRC522::Uid *uid);
void sendRFIDScan(String rfidUID);
void sendThermalRecord(String rfidUID);
void handleThermalFrame();
void handleThermalNextion();
void displayThermalOnNextion();
uint16_t tempToColor565(float temp);
void drawPigDetectionBox();
void setCORSHeaders();

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n\n=== AgriCool ESP32 + MLX90640 (I2C) ===");

  Serial2.begin(9600, SERIAL_8N1, ARDUINO_RX, ARDUINO_TX);
  Serial.println("Serial2 initialized for Arduino (RX=18, TX=19)");

  // Initialize Nextion
  delay(1000);
  Serial.println("\n🧪 Testing Nextion communication...");
  Serial2.print("page 1");
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
  delay(100);
  Serial2.print("t1.txt=\"ESP32 Ready\"");
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
  delay(100);
  Serial.println("✅ Nextion initialized");

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  delay(50);

  Serial.println("\n🌡️ Initializing MLX90640 (I2C)...");
  if (initThermalCamera()) {
    Serial.println("✅ MLX90640 ready (I2C)");
    thermalCameraAvailable = true;
  } else {
    Serial.println("⚠️ MLX90640 NOT FOUND on I2C bus!");
    thermalCameraAvailable = false;
  }

  // Initialize RFID
  Serial.println("\n📇 Initializing MFRC522 RFID Reader...");
  if (initRFID()) {
    Serial.println("✅ RFID reader ready!");
    rfidAvailable = true;
  } else {
    Serial.println("⚠️ RFID reader NOT FOUND!");
    rfidAvailable = false;
  }

  prefs.begin(PREF_NAMESPACE, false);
  ssid = prefs.getString(KEY_SSID, DEFAULT_SSID);
  pass = prefs.getString(KEY_PASS, DEFAULT_PASS);
  serverUrl = prefs.getString(KEY_SERVER, DEFAULT_SERVER);
  prefs.end();

  Serial.println("\nStored config:");
  Serial.print("  SSID: "); Serial.println(ssid);
  Serial.print("  Server: "); Serial.println(serverUrl);

  if (!tryStoredWiFi()) {
    Serial.println("Failed to connect to WiFi -> Starting config portal");
    startConfigPortal();
  } else {
    Serial.println("✅ WiFi connected!");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
    
    if (MDNS.begin("agricool-esp32")) {
      Serial.println("✅ mDNS responder started: agricool-esp32.local");
    }
    
    Serial.println("\n🔍 Resolving backend server...");
    resolvedServerUrl = resolveServerUrl(serverUrl);
    Serial.print("   Resolved URL: ");
    Serial.println(resolvedServerUrl);
    
    Serial.println("\n🧪 Testing backend connection...");
    HTTPClient http;
    http.setTimeout(5000);
    http.begin(resolvedServerUrl);
    http.addHeader("Content-Type", "application/json");
    String testPayload = "{\"temperature\":0,\"humidity\":0,\"waterLevel\":0,\"pumpStatus\":false,\"manualMode\":false}";
    int code = http.POST(testPayload);
    if (code > 0) {
      Serial.printf("✅ Backend reachable (HTTP %d)\n", code);
      backendReachable = true;
    } else {
      Serial.printf("⚠️ Backend not reachable, trying fallback...\n");
      String fallbackUrl = "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
      http.begin(fallbackUrl);
      http.addHeader("Content-Type", "application/json");
      code = http.POST(testPayload);
      if (code > 0) {
        Serial.printf("✅ Fallback backend OK (HTTP %d)\n", code);
        resolvedServerUrl = fallbackUrl;
        backendReachable = true;
      }
    }
    http.end();
    
    Serial.println("\n🔌 Setting up MQTT...");
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(15);
    mqttClient.setSocketTimeout(15);
    Serial.println("✅ MQTT client configured");
    
    // Setup web server routes
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/manual/on", HTTP_POST, handleManualOn);
    webServer.on("/manual/off", HTTP_POST, handleManualOff);
    webServer.on("/auto", HTTP_POST, handleAutoMode);
    webServer.on("/status", HTTP_GET, handleStatus);
    webServer.on("/scan-pig", HTTP_POST, handleScanPig);
    webServer.on("/thermal/frame", HTTP_GET, handleThermalFrame);
    webServer.on("/thermal/nextion", HTTP_POST, handleThermalNextion);

    webServer.on("/thermal/frame", HTTP_OPTIONS, []() {
      setCORSHeaders();
      webServer.send(204);
    });
    webServer.on("/status", HTTP_OPTIONS, []() {
      setCORSHeaders();
      webServer.send(204);
    });

    webServer.begin();

    Serial.println("✅ Web server started!");
    Serial.print("   Access at: http://");
    Serial.println(WiFi.localIP());
    
    Serial.println("\n=== System Ready ===\n");

    if (thermalCameraAvailable) {
      Serial.println("🌡️ Thermal monitoring: ACTIVE (scanning every 15s)");
    } else {
      Serial.println("⚠️ Thermal monitoring: DISABLED (sensor not found)");
    }
    Serial.println();
  }
}

bool initThermalCamera() {
  delay(100);
  if (!mlx.begin(0x33)) {
    Serial.println("   mlx.begin() failed -- device not found");
    return false;
  }

  mlx.setMode(MLX90640_CHESS);
#if defined(MLX90640_SET_REFRESH_RATE)
  mlx.setRefreshRate(MLX90640_8_HZ);
#endif

  Serial.println("   MLX90640 detected on I2C address 0x33");
  return true;
}

void scanPigTemperature() {
  if (!thermalCameraAvailable) {
    Serial.println("⚠️ Thermal camera not available");
    pigTempValid = false;
    return;
  }

  Serial.println("📷 Scanning pig temperature (32x24) - I2C read...");
  bool ok = false;
  for (int attempt = 0; attempt < 3; attempt++) {
    if (mlx.getFrame(mlxFrame) == 0) {
      ok = true;
      break;
    }
    delay(50);
  }

  if (!ok) {
    Serial.println("❌ MLX90640 getFrame failed");
    pigTempValid = false;
    return;
  }

  float maxTemp = -999.0f;
  float minTemp = 999.0f;
  float sumTemp = 0.0f;
  int validPixels = 0;

  for (int i = 0; i < 768; i++) {
    float t = mlxFrame[i];
    if (!isnan(t) && t > 20.0f && t < 60.0f) {
      if (t > maxTemp) maxTemp = t;
      if (t < minTemp) minTemp = t;
      sumTemp += t;
      validPixels++;
    }
  }

  Serial.print("   Pixels valid: ");
  Serial.println(validPixels);

  if (validPixels > 30) {
    pigBodyTemp = maxTemp;
    pigMinTemp = minTemp;
    pigAvgTemp = sumTemp / validPixels;
    pigTempValid = true;

    String status = getPigTempStatus();
    Serial.print("✅ Thermal Scan: Max=");
    Serial.print(pigBodyTemp, 1);
    Serial.print("°C, Min=");
    Serial.print(pigMinTemp, 1);
    Serial.print("°C, Avg=");
    Serial.print(pigAvgTemp, 1);
    Serial.print("°C - Status: ");
    Serial.println(status);
  } else {
    pigTempValid = false;
    Serial.println("❌ Insufficient valid pixels");
  }
}

String getPigTempStatus() {
  if (!pigTempValid) return "No Data";

  float tempToCheck = pigAvgTemp;

  if (tempToCheck < PIG_TEMP_NORMAL_MIN) {
    return "Low";
  } else if (tempToCheck >= PIG_TEMP_NORMAL_MIN && tempToCheck <= PIG_TEMP_NORMAL_MAX) {
    return "Normal";
  } else if (tempToCheck > PIG_TEMP_NORMAL_MAX && tempToCheck < PIG_TEMP_FEVER) {
    return "Elevated";
  } else {
    return "FEVER!";
  }
}

void loop() {
  webServer.handleClient();

  if (WiFi.getMode() == WIFI_AP) {
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastAttempt = 0;
    unsigned long now = millis();
    if (now - lastAttempt > 10000) {
      Serial.println("⚠️ WiFi lost, reconnecting...");
      lastAttempt = now;
      startWiFi(ssid.c_str(), pass.c_str());
    }
    delay(10);
    return;
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (thermalCameraAvailable && (now - lastThermalScan >= THERMAL_SCAN_INTERVAL)) {
    lastThermalScan = now;
    scanPigTemperature();

    if (pigTempValid) {
      displayThermalOnNextion();
    }
  }

  // RFID scanning
  if (rfidAvailable && (now - lastRFIDScan >= RFID_SCAN_INTERVAL)) {
    lastRFIDScan = now;
    scanRFID();
    
    if (pigPresent && (now - pigDetectedTime > PIG_TIMEOUT)) {
      Serial.println("🚪 Pig left the area");
      pigPresent = false;
      currentRFID = "";
      currentPigName = "";
      currentPigId = -1;
    }
  }

  // Read from Arduino
  if (Serial2.available()) {
    String data = Serial2.readStringUntil('\n');
    data.trim();

    if (data == "SHOW_THERMAL") {
      Serial.println("📟 Nextion: Show thermal requested");
      if (thermalCameraAvailable) {
        scanPigTemperature();
        displayThermalOnNextion();
      }
      return;
    }
    
    if (data.length() > 0) {
      Serial.print("📥 Arduino: ");
      Serial.println(data);

      unsigned long now = millis();
      
      if (data == "BUTTON_MANUAL_ON") {
        if (mistingActive && currentMistingType == "MANUAL") {
          Serial.println("⏭️ Already in MANUAL misting - ignoring duplicate");
          return;
        }
        if (lastCommand == data && (now - lastCommandTime < COMMAND_COOLDOWN)) {
          Serial.println("⏭️ Ignoring duplicate BUTTON_MANUAL_ON (cooldown)");
          return;
        }
        lastCommand = data;
        lastCommandTime = now;
        
        Serial.println("🔘 BUTTON PRESS detected - Starting MANUAL misting");
        startMisting("MANUAL");
        return;
      }
      else if (data == "BUTTON_MANUAL_OFF") {
        if (!mistingActive) {
          Serial.println("⏭️ No active misting to stop - ignoring");
          return;
        }
        if (lastCommand == data && (now - lastCommandTime < COMMAND_COOLDOWN)) {
          Serial.println("⏭️ Ignoring duplicate BUTTON_MANUAL_OFF (cooldown)");
          return;
        }
        lastCommand = data;
        lastCommandTime = now;
        
        Serial.println("🔘 BUTTON PRESS detected - Stopping misting");
        stopMisting();
        return;
      }
      else if (data == "AUTO_START") {
        if (mistingActive && currentMistingType == "AUTO") {
          Serial.println("⏭️ Already in AUTO misting - ignoring duplicate");
          return;
        }
        if (lastCommand == data && (now - lastCommandTime < COMMAND_COOLDOWN)) {
          Serial.println("⏭️ Ignoring duplicate AUTO_START (cooldown)");
          return;
        }
        lastCommand = data;
        lastCommandTime = now;
        
        Serial.println("🌡️ SENSOR TRIGGER detected - Starting AUTO misting");
        startMisting("AUTO");
        return;
      }
      else if (data == "AUTO_STOP") {
        if (!mistingActive || currentMistingType != "AUTO") {
          Serial.println("⏭️ Not in AUTO misting - ignoring stop command");
          return;
        }
        if (lastCommand == data && (now - lastCommandTime < COMMAND_COOLDOWN)) {
          Serial.println("⏭️ Ignoring duplicate AUTO_STOP (cooldown)");
          return;
        }
        lastCommand = data;
        lastCommandTime = now;
        
        Serial.println("🌡️ SENSOR TRIGGER detected - Stopping AUTO misting");
        stopMisting();
        return;
      }
      
      // Parse sensor data
      if (data.indexOf(',') != -1) {
        int first = data.indexOf(',');
        int second = data.indexOf(',', first + 1);
        int third = data.indexOf(',', second + 1);
        int fourth = data.indexOf(',', third + 1);

        if (first != -1 && second != -1 && third != -1 && fourth != -1) {
          temperature = data.substring(0, first).toFloat();
          humidity = data.substring(first + 1, second).toFloat();
          waterLevel = data.substring(second + 1, third).toInt();
          pumpStatus = data.substring(third + 1, fourth).toInt() == 1;
          manualMode = data.substring(fourth + 1).toInt() == 1;
        }
      }
    }
  }

  // Send to backend periodically
  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;

    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + String(temperature, 2) + ",";
    jsonPayload += "\"humidity\":" + String(humidity, 2) + ",";
    jsonPayload += "\"waterLevel\":" + String(waterLevel) + ",";
    jsonPayload += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    jsonPayload += "\"manualMode\":" + String(manualMode ? "true" : "false") + ",";
    jsonPayload += "\"pigBodyTemp\":" + String(pigBodyTemp, 2) + ",";
    jsonPayload += "\"pigMinTemp\":" + String(pigMinTemp, 2) + ",";
    jsonPayload += "\"pigAvgTemp\":" + String(pigAvgTemp, 2) + ",";
    jsonPayload += "\"pigTempValid\":" + String(pigTempValid ? "true" : "false");
    jsonPayload += "}";

    if (sendToBackend(jsonPayload)) {
      lastBackendSuccess = now;
      backendReachable = true;
    } else {
      backendReachable = false;
    }
  }

  delay(10);
}

void startMisting(String mistingType) {
  unsigned long now = millis();
  
  if (mistingActive && currentMistingType == mistingType) {
    if ((now - mistingStartTime) < 10000) {
      Serial.println("⚠️ Duplicate misting start ignored - already active with same type");
      Serial.println("   Time since start: " + String((now - mistingStartTime) / 1000) + " seconds");
      return;
    }
  }

  if (mistingActive && currentMistingType != mistingType) {
    Serial.println("🔄 Switching misting type from " + currentMistingType + " to " + mistingType);
    stopMisting();
    delay(1000);
  }

  mistingActive = true;
  currentMistingType = mistingType;
  mistingStartTime = now;

  mistingStartTemp = temperature;
  mistingStartHumidity = humidity;
  mistingStartWaterLevel = waterLevel;

  Serial.println("✅ Misting started - Type: " + mistingType);
  Serial.println("   Start conditions:");
  Serial.println("   Temp: " + String(mistingStartTemp, 1) + "°C");
  Serial.println("   Humidity: " + String(mistingStartHumidity, 1) + "%");
  Serial.println("   Water: " + String((int)mistingStartWaterLevel) + "%");
  Serial.println("   Time: " + String(now));

  sendMistingStart(mistingType);
}

void stopMisting() {
  if (!mistingActive) {
    Serial.println("⚠️ No active misting to stop");
    return;
  }

  Serial.print("🛑 Misting stopped - Type was: ");
  Serial.println(currentMistingType);

  sendMistingEnd();

  mistingActive = false;
  currentMistingType = "NONE";
  mistingStartTime = 0;
  currentMistingLogId = -1;
}

void sendMistingStart(String mistingType) {
  if (!backendReachable) {
    Serial.println("⚠️ Backend not reachable");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  
  String url = resolvedServerUrl;
  url.replace("/api/sensors", "/api/misting/start");
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  float heatIndex = mistingStartTemp;
  if (mistingStartHumidity > 40) {
    heatIndex = mistingStartTemp + (0.5 * (mistingStartTemp - 14.5) * (mistingStartHumidity / 100.0));
  }

  String jsonPayload = "{";
  jsonPayload += "\"mistingType\":\"" + mistingType + "\",";
  jsonPayload += "\"temperature\":" + String(mistingStartTemp, 2) + ",";
  jsonPayload += "\"humidity\":" + String(mistingStartHumidity, 2) + ",";
  jsonPayload += "\"heatIndex\":" + String(heatIndex, 2) + ",";
  jsonPayload += "\"waterLevel\":" + String((int)mistingStartWaterLevel);
  jsonPayload += "}";

  Serial.println("📤 Sending misting START:");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Response: " + response);
    
    int logIdStart = response.indexOf("\"logId\":");
    if (logIdStart != -1) {
      logIdStart += 8;
      int logIdEnd = response.indexOf(",", logIdStart);
      if (logIdEnd == -1) logIdEnd = response.indexOf("}", logIdStart);
      
      String logIdStr = response.substring(logIdStart, logIdEnd);
      logIdStr.trim();
      currentMistingLogId = logIdStr.toInt();
      
      Serial.print("🔑 Saved log ID: ");
      Serial.println(currentMistingLogId);
    }
  } else {
    Serial.println("❌ Failed to send");
    currentMistingLogId = -1;
  }

  http.end();
}

void sendMistingEnd() {
  if (!backendReachable) {
    Serial.println("⚠️ Backend not reachable");
    currentMistingLogId = -1;
    return;
  }

  if (currentMistingLogId <= 0) {
    Serial.println("❌ ERROR: No valid log ID!");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  
  String url = resolvedServerUrl;
  url.replace("/api/sensors", "/api/misting/end/" + String(currentMistingLogId));
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  float heatIndex = temperature;
  if (humidity > 40) {
    heatIndex = temperature + (0.5 * (temperature - 14.5) * (humidity / 100.0));
  }

  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temperature, 2) + ",";
  jsonPayload += "\"humidity\":" + String(humidity, 2) + ",";
  jsonPayload += "\"heatIndex\":" + String(heatIndex, 2) + ",";
  jsonPayload += "\"waterLevel\":" + String(waterLevel);
  jsonPayload += "}";

  Serial.println("📤 Ending misting (Log ID: " + String(currentMistingLogId) + ")");
  Serial.println(jsonPayload);

  int httpResponseCode = http.PUT(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Response: " + response);
    currentMistingLogId = -1;
  } else {
    Serial.println("❌ Failed to end");
  }

  http.end();
}

bool sendToBackend(String jsonPayload) {
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(resolvedServerUrl);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    http.end();
    return true;
  } else {
    if (resolvedServerUrl.indexOf(".local") != -1) {
      http.end();
      String fallbackUrl = "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
      http.begin(fallbackUrl);
      http.addHeader("Content-Type", "application/json");
      httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        resolvedServerUrl = fallbackUrl;
        http.end();
        return true;
      }
    }
    http.end();
    return false;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("📨 MQTT [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  if (message == "SCAN_PIG" && thermalCameraAvailable) {
    scanPigTemperature();
  } else {
    Serial2.println(message);
  }
}

// ✅ FIXED: Flexible MQTT authentication
void reconnectMQTT() {
  unsigned long now = millis();
  if (now - lastMqttReconnect < 5000) return;
  lastMqttReconnect = now;

  Serial.print("🔌 Connecting to MQTT...");
  String clientId = "AgriCool-ESP32-" + String(random(0xffff), HEX);

  bool connected = false;
  
  // Check if credentials are provided
  if (strlen(MQTT_USER) > 0 && strlen(MQTT_PASS) > 0) {
    // Connect with authentication
    connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    // Connect without authentication (public broker)
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected) {
    Serial.println(" ✅ MQTT connected!");
    mqttClient.subscribe(MQTT_TOPIC);
    Serial.println("📩 Subscribed to: " + String(MQTT_TOPIC));
  } else {
    Serial.print(" ❌ failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" (will retry in 5s)");
  }
}

String resolveServerUrl(String url) {
  if (url.indexOf(".local") == -1) return url;

  int startIdx = url.indexOf("://") + 3;
  int endIdx = url.indexOf(".local");
  if (startIdx == -1 || endIdx == -1) return url;

  String hostname = url.substring(startIdx, endIdx);
  IPAddress serverIP = MDNS.queryHost(hostname);

  if (serverIP.toString() == "0.0.0.0") {
    return "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
  }

  String resolvedUrl = url;
  resolvedUrl.replace(hostname + ".local", serverIP.toString());
  return resolvedUrl;
}

bool tryStoredWiFi() {
  startWiFi(ssid.c_str(), pass.c_str());
  unsigned long start = millis();
  while (millis() - start < 15000) {
    if (WiFi.status() == WL_CONNECTED) return true;
    delay(500);
  }
  return false;
}

void startWiFi(const char* s, const char* p) {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(s, p);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>AgriCool Control</title>";
  html += "<style>";
  html += "body{font-family:Arial;background:#1a1a1a;color:#fff;padding:20px;max-width:600px;margin:0 auto}";
  html += "h1{color:#4CAF50;text-align:center}";
  html += ".card{background:#2d2d2d;padding:20px;border-radius:10px;margin:15px 0}";
  html += ".status{display:flex;justify-content:space-between;margin:10px 0;padding:10px;background:#3d3d3d;border-radius:5px}";
  html += ".btn{width:100%;padding:15px;margin:10px 0;border:none;border-radius:8px;font-size:16px;cursor:pointer}";
  html += ".btn-on{background:#4CAF50;color:white}";
  html += ".btn-off{background:#f44336;color:white}";
  html += ".btn-scan{background:#FF9800;color:white}";
  html += ".pig-card{background:#1e3a8a;padding:15px;border-radius:8px;margin:10px 0}";
  html += "</style></head><body>";
  html += "<h1>🌱 AgriCool Control</h1>";
  
  if (rfidAvailable) {
    html += "<div class='card pig-card'><h3>📇 RFID Status</h3>";
    if (pigPresent && currentRFID != "") {
      html += "<div class='status'><span>Pig Present:</span><span>✅ YES</span></div>";
      html += "<div class='status'><span>RFID:</span><span>" + currentRFID + "</span></div>";
      if (currentPigName != "") {
        html += "<div class='status'><span>Name:</span><span>" + currentPigName + "</span></div>";
      }
    } else {
      html += "<div class='status'><span>Pig Present:</span><span>❌ NO</span></div>";
    }
    html += "</div>";
  }
  
  html += "<div class='card'><h3>📊 Status</h3>";
  html += "<div class='status'><span>Temperature:</span><span>" + String(temperature, 1) + "°C</span></div>";
  html += "<div class='status'><span>Humidity:</span><span>" + String(humidity, 1) + "%</span></div>";
  html += "<div class='status'><span>Water Level:</span><span>" + String(waterLevel) + "%</span></div>";
  if (thermalCameraAvailable && pigTempValid) {
    html += "<div class='status'><span>🐷 Pig Temp:</span><span>" + String(pigBodyTemp, 1) + "°C</span></div>";
    html += "<div class='status'><span>Status:</span><span>" + getPigTempStatus() + "</span></div>";
  }
  html += "</div>";
  html += "<div class='card'>";
  html += "<button class='btn btn-on' onclick='fetch(\"/manual/on\",{method:\"POST\"})'>💧 Pump ON</button>";
  html += "<button class='btn btn-off' onclick='fetch(\"/manual/off\",{method:\"POST\"})'>⛔ Pump OFF</button>";
  if (thermalCameraAvailable) {
    html += "<button class='btn btn-scan' onclick='fetch(\"/scan-pig\",{method:\"POST\"})'>🌡️ Scan Pig</button>";
  }
  html += "</div></body></html>";

  webServer.send(200, "text/html", html);
}

void handleManualOn() {
  Serial.println("📱 Web control: Manual ON");
  Serial2.println("MANUAL_ON");
  manualMode = true;
  pumpStatus = true;
  delay(2500);
  webServer.send(200, "text/plain", "OK");
}

void handleManualOff() {
  Serial.println("📱 Web control: Manual OFF");
  stopMisting();
  Serial2.println("MANUAL_OFF");
  manualMode = false;
  pumpStatus = false;
  webServer.send(200, "text/plain", "OK");
}

void handleAutoMode() {
  Serial.println("📱 Web control: Auto Mode");
  Serial2.println("AUTO_MODE");
  if (mistingActive) {
    stopMisting();
  }
  manualMode = false;
  webServer.send(200, "text/plain", "OK");
}

void handleScanPig() {
  if (thermalCameraAvailable) {
    scanPigTemperature();
    webServer.send(200, "text/plain", "Scan complete");
  } else {
    webServer.send(400, "text/plain", "Thermal camera not available");
  }
}

void handleStatus() {
  setCORSHeaders();
  String json = "{";
  json += "\"temperature\":" + String(temperature, 2) + ",";
  json += "\"humidity\":" + String(humidity, 2) + ",";
  json += "\"waterLevel\":" + String(waterLevel) + ",";
  json += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
  json += "\"manualMode\":" + String(manualMode ? "true" : "false") + ",";
  json += "\"pigBodyTemp\":" + String(pigBodyTemp, 2) + ",";
  json += "\"pigTempValid\":" + String(pigTempValid ? "true" : "false") + ",";
  json += "\"pigTempStatus\":\"" + getPigTempStatus() + "\"";
  json += "}";
  webServer.send(200, "application/json", json);
}

void setCORSHeaders() {
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void displayThermalOnNextion() {
  Serial.println("=== DEBUG: Nextion Update ===");
  Serial.println("pigPresent: " + String(pigPresent));
  Serial.println("currentRFID: " + currentRFID);
  Serial.println("pigTempValid: " + String(pigTempValid));
  Serial.println("currentPigName: " + currentPigName);
  Serial.println("pigBodyTemp: " + String(pigBodyTemp, 1));
  Serial.println("============================");

  Serial2.print("page 1");
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
  delay(100);

  if (!thermalCameraAvailable) {
    Serial.println("❌ Thermal camera not available");
    Serial2.print("t1.txt=\"No Camera\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);
    
    Serial2.print("t2.txt=\"Temp: --\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);
    
    Serial2.print("t3.txt=\"Camera Error\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    return;
  }

  Serial.println("🖥️ Updating Nextion with thermal data...");

  if (pigPresent && currentRFID != "" && pigTempValid) {
    String cmd1 = "t1.txt=\"";
    if (currentPigName != "" && currentPigName.length() > 0) {
      cmd1 += currentPigName;
    } else {
      cmd1 += "RFID: " + currentRFID;
    }
    cmd1 += "\"";
    
    Serial.println("📤 Sending: " + cmd1);
    Serial2.print(cmd1);
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);

    String cmd2 = "t2.txt=\"Temp: " + String(pigBodyTemp, 1) + "C\"";
    Serial.println("📤 Sending: " + cmd2);
    Serial2.print(cmd2);
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);

    String cmd3 = "t3.txt=\"" + getPigTempStatus() + "\"";
    Serial.println("📤 Sending: " + cmd3);
    Serial2.print(cmd3);
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    
    Serial.println("✅ Nextion updated:");
    Serial.println("   Pig: " + currentPigName);
    Serial.println("   Temp: " + String(pigBodyTemp, 1) + "°C");
    Serial.println("   Status: " + getPigTempStatus());
  } else {
    Serial2.print("t1.txt=\"Waiting for pig...\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);
    
    Serial2.print("t2.txt=\"Temp: --\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(50);
    
    Serial2.print("t3.txt=\"System Ready\"");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    
    Serial.println("⏳ No pig present");
  }
}

uint16_t tempToColor565(float temp) {
  if (temp >= 38) return 63488;
  if (temp >= 35) return 64512;
  if (temp >= 32) return 65504;
  if (temp >= 28) return 2016;
  return 31;
}

void drawPigDetectionBox() {
  // Not needed for text-only display
}

void handleThermalFrame() {
  setCORSHeaders();
  if (!thermalCameraAvailable) {
    webServer.send(503, "application/json", "{\"error\":\"Thermal camera not available\"}");
    return;
  }

  if (mlx.getFrame(mlxFrame) != 0) {
    webServer.send(500, "application/json", "{\"error\":\"Failed to read frame\"}");
    return;
  }

  String json = "{";
  json += "\"width\":32,";
  json += "\"height\":24,";
  json += "\"pixels\":[";
  
  for (int i = 0; i < 768; i++) {
    if (i > 0) json += ",";
    json += String(mlxFrame[i], 1);
  }
  
  json += "],";
  json += "\"pigPresent\":" + String(pigPresent ? "true" : "false") + ",";
  json += "\"pigRFID\":\"" + currentRFID + "\",";
  json += "\"pigName\":\"" + currentPigName + "\",";
  json += "\"maxTemp\":" + String(pigBodyTemp, 1) + ",";
  json += "\"minTemp\":" + String(pigMinTemp, 1) + ",";
  json += "\"avgTemp\":" + String(pigAvgTemp, 1) + ",";
  json += "\"status\":\"" + getPigTempStatus() + "\"";
  json += "}";

  webServer.send(200, "application/json", json);
}

void handleThermalNextion() {
  setCORSHeaders(); 
  displayThermalOnNextion();
  webServer.send(200, "text/plain", "Thermal displayed on Nextion");
}

bool initRFID() {
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  delay(100);
  
  rfid.PCD_Init();
  delay(50);
  
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("   MFRC522 not detected!");
    return false;
  }
  
  Serial.print("   MFRC522 version: 0x");
  Serial.println(version, HEX);
  return true;
}

void scanRFID() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  String rfidUID = getRFIDString(&rfid.uid);
  
  if (rfidUID != currentRFID) {
    currentRFID = rfidUID;
    pigPresent = true;
    pigDetectedTime = millis();
    
    Serial.println("\n📇 RFID Detected: " + rfidUID);
    
    Serial2.print("page 1");
    Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
    delay(100);
    
    sendRFIDScan(rfidUID);
      
    if (thermalCameraAvailable) {
      Serial.println("🌡️ Triggering thermal scan for pig...");
      scanPigTemperature();
      if (pigTempValid) {
        sendThermalRecord(rfidUID);
        displayThermalOnNextion();
      }
    }
  } else {
    pigDetectedTime = millis();
  }
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

String getRFIDString(MFRC522::Uid *uid) {
  String content = "";
  for (byte i = 0; i < uid->size; i++) {
    content += String(uid->uidByte[i] < 0x10 ? "0" : "");
    content += String(uid->uidByte[i], HEX);
  }
  content.toUpperCase();
  return content;
}

void sendRFIDScan(String rfidUID) {
  if (!backendReachable) {
    Serial.println("⚠️ Backend not reachable, skipping RFID scan log");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  
  String url = resolvedServerUrl;
  url.replace("/api/sensors", "/api/pigs/rfid/scan");
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{";
  jsonPayload += "\"rfidUID\":\"" + rfidUID + "\",";
  jsonPayload += "\"scanType\":\"temperature_check\",";
  jsonPayload += "\"location\":\"thermal_station\"";
  jsonPayload += "}";

  Serial.println("📤 Sending RFID scan to backend:");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✅ Backend response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
    
    int nameStart = response.indexOf("\"pigName\":\"");
    if (nameStart != -1) {
      nameStart += 11;
      int nameEnd = response.indexOf("\"", nameStart);
      if (nameEnd != -1) {
        currentPigName = response.substring(nameStart, nameEnd);
        Serial.println("🐷 Pig identified: " + currentPigName);
      }
    }
  } else {
    Serial.print("❌ Failed to send RFID scan: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void sendThermalRecord(String rfidUID) {
  if (!backendReachable) {
    Serial.println("⚠️ Backend not reachable, skipping thermal record");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  
  String url = resolvedServerUrl;
  if (url.endsWith("/api/sensors")) {
    url = url.substring(0, url.length() - 12);
  }
  url += "/api/thermal/record";
  
  Serial.print("📤 Thermal record URL: ");
  Serial.println(url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{";
  jsonPayload += "\"rfidUID\":\"" + rfidUID + "\",";
  jsonPayload += "\"bodyTemp\":" + String(pigBodyTemp, 2) + ",";
  jsonPayload += "\"minTemp\":" + String(pigMinTemp, 2) + ",";
  jsonPayload += "\"avgTemp\":" + String(pigAvgTemp, 2) + ",";
  jsonPayload += "\"tempStatus\":\"" + getPigTempStatus() + "\",";
  jsonPayload += "\"ambientTemp\":" + String(temperature, 2) + ",";
  jsonPayload += "\"ambientHumidity\":" + String(humidity, 2);
  jsonPayload += "}";

  Serial.println("📤 Sending thermal record:");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✅ Thermal record saved (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
  } else {
    Serial.print("❌ Failed to send thermal record: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void startConfigPortal() {
  Serial.println("Config portal would start here");
}