/*
 * AgriCool Misting System - ESP32 WiFi Bridge
 * 
 * This code runs on ESP32 to:
 * 1. Receive sensor data from Arduino Mega via Serial
 * 2. Send data to your backend API via WiFi
 * 3. Receive commands from web app (future feature)
 * 
 * Wiring:
 * Arduino Mega TX1 (Pin 18) → ESP32 RX (Pin 16 or RX2)
 * Arduino Mega RX1 (Pin 19) → ESP32 TX (Pin 17 or TX2)
 * Arduino Mega GND → ESP32 GND (IMPORTANT!)
 * 
 * Each board should have its own power supply
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ============ WiFi Configuration ============
const char* ssid = "PLDTHOMEFIBR348b8";           // Replace with your WiFi name
const char* password = "PLDTWIFI5bek7";   // Replace with your WiFi password

// ============ Backend API Configuration ============
const char* serverUrl = "http://192.168.1.16:3000/api/sensors";
// Example: "http://192.168.1.100:3000/api/sensors"
// Or if using cloud: "https://your-app.herokuapp.com/api/sensors"

// ============ Serial Communication ============
// ESP32 Serial2 pins: RX=16, TX=17 (default)
#define RXD2 16
#define TXD2 17

// ============ Data Variables ============
float temperature = 0.0;
float humidity = 0.0;
int waterLevel = 0;
bool pumpStatus = false;

// ============ Timing ============
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;  // Send to server every 5 seconds

void setup() {
  // Initialize Serial for debugging
  Serial.begin(9600);
  
  // Initialize Serial2 for Arduino Mega communication
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  
  Serial.println("\n=== AgriCool ESP32 WiFi Bridge ===");
  
  // Connect to WiFi
  connectToWiFi();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  // Read data from Arduino Mega
  if (Serial2.available()) {
    String data = Serial2.readStringUntil('\n');
    data.trim();
    
    Serial.print("Received from Arduino: ");
    Serial.println(data);
    
    // Parse comma-separated values: TEMP,HUMIDITY,WATER_LEVEL,PUMP_STATUS
    if (parseData(data)) {
      Serial.printf("Parsed - Temp: %.2f°C, Humidity: %.2f%%, Water: %d%%, Pump: %s\n",
                    temperature, humidity, waterLevel, pumpStatus ? "ON" : "OFF");
    }
  }
  
  // Send data to backend server periodically
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= sendInterval) {
    sendDataToServer();
    lastSendTime = currentTime;
  }
  
  delay(100);  // Small delay to prevent overwhelming the CPU
}

// ============ WiFi Connection ============
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
  }
}

// ============ Parse Data from Arduino ============
bool parseData(String data) {
  int firstComma = data.indexOf(',');
  int secondComma = data.indexOf(',', firstComma + 1);
  int thirdComma = data.indexOf(',', secondComma + 1);
  
  if (firstComma == -1 || secondComma == -1 || thirdComma == -1) {
    Serial.println("Error: Invalid data format");
    return false;
  }
  
  temperature = data.substring(0, firstComma).toFloat();
  humidity = data.substring(firstComma + 1, secondComma).toFloat();
  waterLevel = data.substring(secondComma + 1, thirdComma).toInt();
  pumpStatus = data.substring(thirdComma + 1).toInt() == 1;
  
  return true;
}

// ============ Send Data to Backend Server ============
void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot send data: WiFi not connected");
    return;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temperature, 2) + ",";
  jsonPayload += "\"humidity\":" + String(humidity, 2) + ",";
  jsonPayload += "\"waterLevel\":" + String(waterLevel) + ",";
  jsonPayload += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false");
  jsonPayload += "}";
  
  Serial.println("Sending to server: " + jsonPayload);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✓ Server response code: ");
    Serial.println(httpResponseCode);
    Serial.println("Response: " + response);
  } else {
    Serial.print("✗ Error sending data. Code: ");
    Serial.println(httpResponseCode);
    Serial.println("Error: " + http.errorToString(httpResponseCode));
  }
  
  http.end();
}

// ============ Calculate Heat Index (Optional Enhancement) ============
float calculateHeatIndex(float temp, float humidity) {
  // Simplified heat index formula
  float hi = 0.5 * (temp + 61.0 + ((temp - 68.0) * 1.2) + (humidity * 0.094));
  
  if (hi >= 80) {
    // Use Rothfusz regression for more accurate results at higher temps
    hi = -42.379 + 2.04901523 * temp + 10.14333127 * humidity
         - 0.22475541 * temp * humidity - 0.00683783 * temp * temp
         - 0.05481717 * humidity * humidity + 0.00122874 * temp * temp * humidity
         + 0.00085282 * temp * humidity * humidity - 0.00000199 * temp * temp * humidity * humidity;
  }
  
  return hi;
}
