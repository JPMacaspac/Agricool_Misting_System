/*
 * AgriCool ESP32 WiFi Bridge with MQTT Control
 * FIXED: Backend connection error handling
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>

#define RXD2 18
#define TXD2 19

const char* DEFAULT_SSID = "ZTE_2.4G_u33E3a";
const char* DEFAULT_PASS = "kCqbH4ER";
const char* DEFAULT_SERVER = "http://agricool-server.local:8081/api/sensors";
const char* MQTT_SERVER = "agricool-mqtt";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "agricool/pump/command";

// Fallback IPs
IPAddress fallback_server_ip(192, 168, 1, 2); // Your computer's IP
IPAddress fallback_broker_ip(192, 168, 1, 2);

Preferences prefs;
const char* PREF_NAMESPACE = "agricool";
const char* KEY_SSID = "ssid";
const char* KEY_PASS = "pass";
const char* KEY_SERVER = "server";

WebServer webServer(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

String ssid;
String pass;
String serverUrl;
String resolvedServerUrl = ""; // Cache resolved URL

float temperature = 0.0;
float humidity = 0.0;
int waterLevel = 0;
bool pumpStatus = false;
bool manualMode = false;

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
void startWiFi(const char* s, const char* p);
bool tryStoredWiFi();
String resolveServerUrl(String url);
void mqttCallback(char* topic, byte* payload, unsigned int length);
void reconnectMQTT();
bool sendToBackend(String jsonPayload);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== AgriCool ESP32 with MQTT Control (FIXED) ===");

  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("Serial2 initialized (RX=18, TX=19)");

  prefs.begin(PREF_NAMESPACE, false);
  ssid = prefs.getString(KEY_SSID, DEFAULT_SSID);
  pass = prefs.getString(KEY_PASS, DEFAULT_PASS);
  serverUrl = prefs.getString(KEY_SERVER, DEFAULT_SERVER);
  prefs.end();

  Serial.println("Stored config:");
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
    
    // Resolve backend server URL
    Serial.println("\n🔍 Resolving backend server...");
    resolvedServerUrl = resolveServerUrl(serverUrl);
    Serial.print("   Original URL: ");
    Serial.println(serverUrl);
    Serial.print("   Resolved URL: ");
    Serial.println(resolvedServerUrl);
    
    // Test backend connection
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
      Serial.printf("⚠️ Backend not reachable (Error %d: %s)\n", code, http.errorToString(code).c_str());
      Serial.println("   Will retry with fallback IP...");
      
      // Try fallback IP
      String fallbackUrl = "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
      http.begin(fallbackUrl);
      http.addHeader("Content-Type", "application/json");
      code = http.POST(testPayload);
      if (code > 0) {
        Serial.printf("✅ Fallback backend reachable (HTTP %d)\n", code);
        resolvedServerUrl = fallbackUrl;
        backendReachable = true;
      } else {
        Serial.println("❌ Fallback backend also failed");
      }
    }
    http.end();
    
    // Setup MQTT
    Serial.println("\n🔌 Setting up MQTT...");
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(15);
    mqttClient.setSocketTimeout(15);
    Serial.println("✅ MQTT client configured");
    
    // Setup web server
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/manual/on", HTTP_POST, handleManualOn);
    webServer.on("/manual/off", HTTP_POST, handleManualOff);
    webServer.on("/auto", HTTP_POST, handleAutoMode);
    webServer.on("/status", HTTP_GET, handleStatus);
    webServer.on("/config", HTTP_GET, []() {
      startConfigPortal();
    });
    webServer.begin();
    Serial.println("✅ Web server started!");
    Serial.print("   Access at: http://");
    Serial.println(WiFi.localIP());
    
    Serial.println("\n=== System Ready ===\n");
  }
}

void loop() {
  webServer.handleClient();

  if (WiFi.getMode() == WIFI_AP) {
    return;
  }

  // WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastAttempt = 0;
    unsigned long now = millis();
    if (now - lastAttempt > 10000) {
      Serial.println("⚠️ WiFi lost, reconnecting...");
      lastAttempt = now;
      prefs.begin(PREF_NAMESPACE, false);
      ssid = prefs.getString(KEY_SSID, DEFAULT_SSID);
      pass = prefs.getString(KEY_PASS, DEFAULT_PASS);
      prefs.end();
      startWiFi(ssid.c_str(), pass.c_str());
    }
    delay(10);
    return;
  }

  // MQTT maintenance
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Read from Arduino
  if (Serial2.available()) {
    String data = Serial2.readStringUntil('\n');
    data.trim();
    if (data.length() > 0) {
      Serial.print("📥 Arduino: ");
      Serial.println(data);
      
      int first = data.indexOf(',');
      int second = data.indexOf(',', first + 1);
      int third = data.indexOf(',', second + 1);
      int fourth = data.indexOf(',', third + 1);
      
      if (first != -1 && second != -1 && third != -1) {
        temperature = data.substring(0, first).toFloat();
        humidity = data.substring(first + 1, second).toFloat();
        waterLevel = data.substring(second + 1, third).toInt();
        pumpStatus = data.substring(third + 1, fourth).toInt() == 1;
        
        if (fourth != -1) {
          manualMode = data.substring(fourth + 1).toInt() == 1;
        }
        
        Serial.printf("📊 T=%.1f°C H=%.1f%% WL=%d%% Pump=%s Mode=%s\n", 
          temperature, humidity, waterLevel, 
          pumpStatus ? "ON" : "OFF",
          manualMode ? "MANUAL" : "AUTO");
      }
    }
  }

  // Send to backend periodically
  unsigned long now = millis();
  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;
    
    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + String(temperature, 2) + ",";
    jsonPayload += "\"humidity\":" + String(humidity, 2) + ",";
    jsonPayload += "\"waterLevel\":" + String(waterLevel) + ",";
    jsonPayload += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    jsonPayload += "\"manualMode\":" + String(manualMode ? "true" : "false");
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

bool sendToBackend(String jsonPayload) {
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(resolvedServerUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.printf("✅ Backend OK (HTTP %d)\n", httpResponseCode);
    http.end();
    return true;
  } else {
    Serial.printf("❌ Backend error (HTTP %d: %s)\n", 
      httpResponseCode, http.errorToString(httpResponseCode).c_str());
    
    // Try fallback IP if mDNS failed
    if (resolvedServerUrl.indexOf(".local") != -1 || resolvedServerUrl.indexOf("agricool-server") != -1) {
      http.end();
      String fallbackUrl = "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
      Serial.print("   Trying fallback: ");
      Serial.println(fallbackUrl);
      
      http.begin(fallbackUrl);
      http.addHeader("Content-Type", "application/json");
      httpResponseCode = http.POST(jsonPayload);
      
      if (httpResponseCode > 0) {
        Serial.printf("✅ Fallback OK (HTTP %d)\n", httpResponseCode);
        resolvedServerUrl = fallbackUrl; // Update for next time
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
  
  Serial2.println(message);
  Serial.println("✅ Forwarded to Arduino");
}

void reconnectMQTT() {
  unsigned long now = millis();
  if (now - lastMqttReconnect < 5000) {
    return;
  }
  lastMqttReconnect = now;
  
  Serial.print("🔌 MQTT connecting to ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print("...");
  
  String clientId = "AgriCool-ESP32-";
  clientId += String(random(0xffff), HEX);
  
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println(" ✅");
    mqttClient.subscribe(MQTT_TOPIC);
    Serial.print("📥 Subscribed: ");
    Serial.println(MQTT_TOPIC);
  } else {
    Serial.print(" ❌ (rc=");
    Serial.print(mqttClient.state());
    Serial.println(")");
  }
}

String resolveServerUrl(String url) {
  if (url.indexOf(".local") == -1) {
    return url;
  }
  
  int startIdx = url.indexOf("://") + 3;
  int endIdx = url.indexOf(".local");
  if (startIdx == -1 || endIdx == -1) {
    return url;
  }
  
  String hostname = url.substring(startIdx, endIdx);
  Serial.print("   Querying mDNS for: ");
  Serial.println(hostname);
  
  IPAddress serverIP = MDNS.queryHost(hostname);
  
  if (serverIP.toString() == "0.0.0.0" || serverIP.toString() == "(IP unset)") {
    Serial.println("   ⚠️ mDNS failed, using fallback IP");
    String fallbackUrl = "http://" + fallback_server_ip.toString() + ":8081/api/sensors";
    return fallbackUrl;
  }
  
  Serial.print("   ✅ Resolved to: ");
  Serial.println(serverIP);
  
  String resolvedUrl = url;
  resolvedUrl.replace(hostname + ".local", serverIP.toString());
  return resolvedUrl;
}

bool tryStoredWiFi() {
  startWiFi(ssid.c_str(), pass.c_str());
  Serial.print("Connecting");
  unsigned long start = millis();
  while (millis() - start < 15000) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println();
      return true;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  return WiFi.status() == WL_CONNECTED;
}

void startWiFi(const char* s, const char* p) {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(s, p);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>AgriCool Control</title>";
  html += "<style>";
  html += "body{font-family:Arial;background:#1a1a1a;color:#fff;padding:20px;max-width:600px;margin:0 auto}";
  html += "h1{color:#4CAF50;text-align:center}";
  html += ".card{background:#2d2d2d;padding:20px;border-radius:10px;margin:15px 0;box-shadow:0 4px 6px rgba(0,0,0,0.3)}";
  html += ".status{display:flex;justify-content:space-between;margin:10px 0;padding:10px;background:#3d3d3d;border-radius:5px}";
  html += ".label{color:#aaa}";
  html += ".value{color:#4CAF50;font-weight:bold}";
  html += ".btn{width:100%;padding:15px;margin:10px 0;border:none;border-radius:8px;font-size:16px;cursor:pointer;transition:0.3s}";
  html += ".btn-on{background:#4CAF50;color:white}";
  html += ".btn-on:hover{background:#45a049}";
  html += ".btn-off{background:#f44336;color:white}";
  html += ".btn-off:hover{background:#da190b}";
  html += ".btn-auto{background:#2196F3;color:white}";
  html += ".btn-auto:hover{background:#0b7dda}";
  html += ".mode{text-align:center;padding:10px;border-radius:5px;margin:10px 0}";
  html += ".mode-manual{background:#ff9800;color:#000}";
  html += ".mode-auto{background:#4CAF50}";
  html += ".mqtt,.backend{text-align:center;padding:5px;border-radius:5px;margin:5px 0;font-size:12px}";
  html += ".mqtt-on,.backend-on{background:#4CAF50}";
  html += ".mqtt-off,.backend-off{background:#f44336}";
  html += "</style>";
  html += "<script>";
  html += "function sendCommand(cmd){";
  html += "fetch(cmd,{method:'POST'}).then(()=>setTimeout(()=>location.reload(),500))}";
  html += "setInterval(()=>fetch('/status').then(r=>r.json()).then(d=>{";
  html += "document.getElementById('temp').innerText=d.temperature.toFixed(1);";
  html += "document.getElementById('hum').innerText=d.humidity.toFixed(1);";
  html += "document.getElementById('water').innerText=d.waterLevel;";
  html += "document.getElementById('pump').innerText=d.pumpStatus?'ON':'OFF';";
  html += "document.getElementById('mode').innerText=d.manualMode?'MANUAL':'AUTO';";
  html += "}),2000);";
  html += "</script></head><body>";
  html += "<h1>🌱 AgriCool Control Panel</h1>";
  
  html += "<div class='mqtt " + String(mqttClient.connected() ? "mqtt-on" : "mqtt-off") + "'>";
  html += "MQTT: " + String(mqttClient.connected() ? "CONNECTED ✅" : "DISCONNECTED ❌");
  html += "</div>";
  
  html += "<div class='backend " + String(backendReachable ? "backend-on" : "backend-off") + "'>";
  html += "Backend: " + String(backendReachable ? "CONNECTED ✅" : "DISCONNECTED ❌");
  html += "</div>";
  
  html += "<div class='card'>";
  html += "<h3>📊 Current Status</h3>";
  html += "<div class='status'><span class='label'>Temperature:</span><span class='value' id='temp'>" + String(temperature, 1) + "°C</span></div>";
  html += "<div class='status'><span class='label'>Humidity:</span><span class='value' id='hum'>" + String(humidity, 1) + "%</span></div>";
  html += "<div class='status'><span class='label'>Water Level:</span><span class='value' id='water'>" + String(waterLevel) + "%</span></div>";
  html += "<div class='status'><span class='label'>Pump Status:</span><span class='value' id='pump'>" + String(pumpStatus ? "ON" : "OFF") + "</span></div>";
  html += "</div>";
  
  html += "<div class='mode " + String(manualMode ? "mode-manual" : "mode-auto") + "'>";
  html += "<strong>Current Mode:</strong> <span id='mode'>" + String(manualMode ? "MANUAL" : "AUTO") + "</span>";
  html += "</div>";
  
  html += "<div class='card'>";
  html += "<h3>🎮 Manual Controls</h3>";
  html += "<button class='btn btn-on' onclick='sendCommand(\"/manual/on\")'>💧 Turn Pump ON</button>";
  html += "<button class='btn btn-off' onclick='sendCommand(\"/manual/off\")'>⛔ Turn Pump OFF</button>";
  html += "<button class='btn btn-auto' onclick='sendCommand(\"/auto\")'>🤖 Switch to AUTO Mode</button>";
  html += "</div>";
  
  html += "</body></html>";
  
  webServer.send(200, "text/html", html);
}

void handleManualOn() {
  Serial.println("📱 Web: MANUAL_ON");
  Serial2.println("MANUAL_ON");
  manualMode = true;
  pumpStatus = true;
  webServer.send(200, "text/plain", "OK");
}

void handleManualOff() {
  Serial.println("📱 Web: MANUAL_OFF");
  Serial2.println("MANUAL_OFF");
  manualMode = false;
  pumpStatus = false;
  webServer.send(200, "text/plain", "OK");
}

void handleAutoMode() {
  Serial.println("🤖 Web: AUTO_MODE");
  Serial2.println("AUTO_MODE");
  manualMode = false;
  webServer.send(200, "text/plain", "OK");
}

void handleStatus() {
  String json = "{";
  json += "\"temperature\":" + String(temperature, 2) + ",";
  json += "\"humidity\":" + String(humidity, 2) + ",";
  json += "\"waterLevel\":" + String(waterLevel) + ",";
  json += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
  json += "\"manualMode\":" + String(manualMode ? "true" : "false");
  json += "}";
  webServer.send(200, "application/json", json);
}

void startConfigPortal() {
  Serial.println("Config portal would start here");
}