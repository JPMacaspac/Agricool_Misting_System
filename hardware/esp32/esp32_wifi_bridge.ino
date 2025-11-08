/*
 * AgriCool ESP32 WiFi Bridge with mDNS support
 * - Uses mDNS to find backend server automatically (no IP needed!)
 * - AP configuration portal for easy WiFi setup
 * - Works on ANY router without reconfiguration
 *
 * Wiring:
 * - Serial2 RX=16, TX=17 (ESP32) <--> Arduino Mega TX1(18), RX1(19)
 * - Common GND required
 *
 * mDNS Setup:
 * - Backend server advertises as "agricool-server.local"
 * - ESP32 automatically finds it on any network
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// Serial2 pins
#define RXD2 16
#define TXD2 17

// Defaults
const char* DEFAULT_SSID = "ZTE_2.4G_u33E3a";
const char* DEFAULT_PASS = "kCqbH4ER";
const char* DEFAULT_SERVER = "http://agricool-server.local:8081/api/sensors"; // mDNS hostname

// Preferences
Preferences prefs;
const char* PREF_NAMESPACE = "agricool";
const char* KEY_SSID = "ssid";
const char* KEY_PASS = "pass";
const char* KEY_SERVER = "server";

WebServer webServer(80);

String ssid;
String pass;
String serverUrl;

// Data variables
float temperature = 0.0;
float humidity = 0.0;
int waterLevel = 0;
bool pumpStatus = false;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;

// Forward declarations
void startConfigPortal();
void handleRoot();
void handleSave();
void startWiFi(const char* s, const char* p);
bool tryStoredWiFi();
String resolveServerUrl(String url);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== AgriCool ESP32 WiFi Bridge (mDNS Enabled) ===");

  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("Serial2 initialized (RX=16, TX=17)");

  // Load config
  prefs.begin(PREF_NAMESPACE, false);
  ssid = prefs.getString(KEY_SSID, DEFAULT_SSID);
  pass = prefs.getString(KEY_PASS, DEFAULT_PASS);
  serverUrl = prefs.getString(KEY_SERVER, DEFAULT_SERVER);
  prefs.end();

  Serial.println("Stored config:");
  Serial.print("  SSID: "); Serial.println(ssid);
  Serial.print("  Server: "); Serial.println(serverUrl);

  // Try WiFi connection
  if (!tryStoredWiFi()) {
    Serial.println("Failed to connect to WiFi -> Starting config portal");
    startConfigPortal();
  } else {
    Serial.println("WiFi connected!");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
    
    // Start mDNS
    if (MDNS.begin("agricool-esp32")) {
      Serial.println("mDNS responder started: agricool-esp32.local");
    }
  }
}

void loop() {
  // Handle AP mode
  if (WiFi.getMode() == WIFI_AP) {
    webServer.handleClient();
    return;
  }

  // Reconnect if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastAttempt = 0;
    unsigned long now = millis();
    if (now - lastAttempt > 10000) {
      Serial.println("WiFi lost, reconnecting...");
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

  // Read from Arduino
  if (Serial2.available()) {
    String data = Serial2.readStringUntil('\n');
    data.trim();
    if (data.length() > 0) {
      Serial.print("Received: ");
      Serial.println(data);
      
      int first = data.indexOf(',');
      int second = data.indexOf(',', first + 1);
      int third = data.indexOf(',', second + 1);
      
      if (first != -1 && second != -1 && third != -1) {
        temperature = data.substring(0, first).toFloat();
        humidity = data.substring(first + 1, second).toFloat();
        waterLevel = data.substring(second + 1, third).toInt();
        pumpStatus = data.substring(third + 1).toInt() == 1;
        
        Serial.printf("Parsed: T=%.1f H=%.1f WL=%d Pump=%s\n", 
          temperature, humidity, waterLevel, pumpStatus ? "ON" : "OFF");
      }
    }
  }

  // Send to backend
  unsigned long now = millis();
  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;
    
    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + String(temperature, 2) + ",";
    jsonPayload += "\"humidity\":" + String(humidity, 2) + ",";
    jsonPayload += "\"waterLevel\":" + String(waterLevel) + ",";
    jsonPayload += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false");
    jsonPayload += "}";
    
    // Resolve mDNS hostname to IP if needed
    String resolvedUrl = resolveServerUrl(serverUrl);
    
    Serial.println("Sending to: " + resolvedUrl);
    
    HTTPClient http;
    http.setTimeout(5000);
    http.begin(resolvedUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.printf("✓ Success (%d)\n", httpResponseCode);
    } else {
      Serial.printf("✗ Error (%d): %s\n", httpResponseCode, 
        http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }

  delay(10);
}

// Resolve mDNS hostname to IP address
String resolveServerUrl(String url) {
  // Check if URL contains .local
  if (url.indexOf(".local") == -1) {
    return url; // Already an IP, return as-is
  }
  
  // Extract hostname (e.g., "agricool-server" from "http://agricool-server.local:8081/...")
  int startIdx = url.indexOf("://") + 3;
  int endIdx = url.indexOf(".local");
  if (startIdx == -1 || endIdx == -1) {
    return url;
  }
  
  String hostname = url.substring(startIdx, endIdx);
  Serial.print("Resolving mDNS: ");
  Serial.println(hostname);
  
  IPAddress serverIP = MDNS.queryHost(hostname);
  
  if (serverIP.toString() == "0.0.0.0") {
    Serial.println("⚠ mDNS resolution failed, using URL as-is");
    return url;
  }
  
  Serial.print("✓ Resolved to: ");
  Serial.println(serverIP.toString());
  
  // Replace hostname with IP
  String resolvedUrl = url;
  resolvedUrl.replace(hostname + ".local", serverIP.toString());
  
  return resolvedUrl;
}

bool tryStoredWiFi() {
  startWiFi(ssid.c_str(), pass.c_str());
  Serial.println("Connecting (15s timeout)...");
  unsigned long start = millis();
  while (millis() - start < 15000) {
    if (WiFi.status() == WL_CONNECTED) {
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
  Serial.print("Connecting to: ");
  Serial.println(s);
}

void startConfigPortal() {
  const char* apSSID = "AgriCool_Config";
  const char* apPass = "agricool123";

  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID, apPass);
  IPAddress myIP = WiFi.softAPIP();
  
  Serial.println("\n======================================");
  Serial.println("Config Portal Started!");
  Serial.print("SSID: ");
  Serial.println(apSSID);
  Serial.print("Password: ");
  Serial.println(apPass);
  Serial.print("Config URL: http://");
  Serial.println(myIP);
  Serial.println("======================================\n");

  webServer.on("/", HTTP_GET, handleRoot);
  webServer.on("/save", HTTP_POST, handleSave);
  webServer.onNotFound([]() {
    webServer.send(404, "text/plain", "Not found");
  });

  webServer.begin();
  Serial.println("Web server started");
}

void handleRoot() {
  String page = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                "<title>AgriCool Setup</title>"
                "<style>"
                "body { font-family: Arial; background:#f2f2f2; padding:20px; max-width:500px; margin:0 auto; }"
                "h2 { color:#2c3e50; }"
                "label { font-weight:bold; color:#34495e; display:block; margin-top:12px; }"
                "input { width:100%; padding:10px; margin:8px 0 16px 0; border:1px solid #bdc3c7; "
                "border-radius:4px; box-sizing:border-box; font-size:14px; }"
                "button { background:#27ae60; color:white; padding:12px 24px; border:none; "
                "border-radius:4px; cursor:pointer; font-size:16px; width:100%; }"
                "button:hover { background:#229954; }"
                ".info { background:#ecf0f1; padding:12px; border-left:4px solid #3498db; margin-top:20px; font-size:13px; }"
                ".tip { background:#fff3cd; padding:12px; border-left:4px solid #ffc107; margin-top:12px; font-size:13px; }"
                "</style>"
                "</head><body>"
                "<h2>🌱 AgriCool WiFi Setup</h2>"
                "<form method='POST' action='/save'>"
                "<label>WiFi Network Name (SSID):</label>"
                "<input name='ssid' value='" + ssid + "' required placeholder='e.g., ZTE_2.4G_u33E3a'/>"
                "<label>WiFi Password:</label>"
                "<input name='pass' value='" + pass + "' type='password' placeholder='Enter WiFi password'/>"
                "<label>Backend Server URL:</label>"
                "<input name='server' value='" + serverUrl + "' required placeholder='http://agricool-server.local:8081/api/sensors'/>"
                "<button type='submit'>💾 Save & Connect</button>"
                "</form>"
                "<div class='tip'>"
                "<strong>💡 Pro Tip:</strong> Use <code>agricool-server.local</code> instead of IP addresses. "
                "Works on any router automatically!"
                "</div>"
                "<div class='info'>"
                "<strong>ℹ️ Note:</strong> After saving, device will reboot and connect. "
                "If connection fails, this portal will restart automatically."
                "</div>"
                "</body></html>";
  webServer.send(200, "text/html", page);
}

void handleSave() {
  if (webServer.method() != HTTP_POST) {
    webServer.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String newSsid = webServer.arg("ssid");
  String newPass = webServer.arg("pass");
  String newServer = webServer.arg("server");

  if (newSsid.length() == 0 || newServer.length() == 0) {
    webServer.send(400, "text/html", 
      "<html><body><h3>❌ Error</h3><p>WiFi name and Server URL required</p>"
      "<a href='/'>← Go Back</a></body></html>");
    return;
  }

  prefs.begin(PREF_NAMESPACE, false);
  prefs.putString(KEY_SSID, newSsid);
  prefs.putString(KEY_PASS, newPass);
  prefs.putString(KEY_SERVER, newServer);
  prefs.end();

  Serial.println("✓ Configuration saved:");
  Serial.println("  SSID: " + newSsid);
  Serial.println("  Server: " + newServer);

  String msg = "<html><head><meta http-equiv='refresh' content='10;url=/'/></head>"
               "<body style='font-family:Arial;text-align:center;padding:50px;background:#f2f2f2;'>"
               "<h2 style='color:#27ae60;'>✅ Saved Successfully!</h2>"
               "<p>Device is rebooting and connecting to WiFi...</p>"
               "<p style='color:#7f8c8d;'>If connection succeeds, this page won't reload.</p>"
               "<p style='color:#7f8c8d;'>If it fails, reconnect to <strong>AgriCool_Config</strong>.</p>"
               "</body></html>";
  webServer.send(200, "text/html", msg);
  
  delay(2000);
  Serial.println("Rebooting...");
  ESP.restart();
}