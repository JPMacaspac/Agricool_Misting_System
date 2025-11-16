/*
 * AgriCool Misting System - Arduino Mega
 * UPDATED: Temperature threshold changed to 35°C
 */

#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// === Pin Definitions ===
#define DHTPIN 7
#define DHTTYPE DHT22
#define PUMP_RELAY 8

#define TRIG_PIN 11
#define ECHO_PIN 12

// LED and Buzzer pins
#define GREEN_LED 9   // 51-100% water level
#define YELLOW_LED 10 // 31-50% water level
#define RED_LED 4     // 0-30% water level (low water warning)
#define BUZZER 5      // Buzzer for low water alert

// === Components ===
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
#define nextion Serial3

// === Config ===
const float TEMP_THRESHOLD = 35.0;  // CHANGED FROM 32.0 TO 35.0
const char PHONE_NUMBER[] = "+639912440620";
const unsigned long SMS_INTERVAL = 60000; // Send SMS every 60 seconds

// === Tank Dimensions - ADJUST THESE FOR YOUR TANK ===
const float TANK_HEIGHT_CM = 35.0;
const float SENSOR_OFFSET_CM = 2.0;
const float EMPTY_DISTANCE_CM = 28.0;

// === Variables ===
float temperature = 0.0;
float humidity = 0.0;
float distanceCM = 0.0;
int waterPercent = 0;
bool pumpStatus = false;
bool manualMode = false;
bool alertSent = false;
unsigned long lastSMSTime = 0;
unsigned long lastBuzzerTime = 0;
unsigned long buzzerOnTime = 0;
bool buzzerState = false;
unsigned long lastSensorRead = 0;
unsigned long lastLCDUpdate = 0;
unsigned long lastDataSend = 0;

// SMS state machine variables (completely non-blocking)
enum SMSState {
  SMS_IDLE,
  SMS_INIT,
  SMS_WAIT_INIT,
  SMS_SEND_NUMBER,
  SMS_WAIT_PROMPT,
  SMS_SEND_MESSAGE,
  SMS_WAIT_COMPLETE,
  SMS_DONE
};
SMSState smsState = SMS_IDLE;
String pendingSMSNumber = "";
String pendingSMSMessage = "";
unsigned long smsStateTime = 0;

// === Function Declarations ===
float readUltrasonicDistance();
void processSMS();
void queueSMS(const char* number, const char* message);
void sendToNextion(String cmd);
void updateNextion();
void updateWaterLevelIndicators(int level);

void setup() {
  Serial.begin(9600);
  Serial2.begin(9600);
  Serial1.begin(9600);
  nextion.begin(9600);

  pinMode(PUMP_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  dht.begin();
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("AgriCool System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000); // Only delay during setup is OK

  Serial.println("=== AgriCool Misting System ===");
  Serial.println("Temperature Threshold: 35°C");
  Serial.println("ZERO blocking delays - Pump runs continuously!");
  Serial.println("SMS fully non-blocking with LCD notifications");
  
  // Quick GSM init (non-blocking after this)
  Serial1.println("AT");
  delay(500);
  Serial1.println("AT+CMGF=1");
  delay(500);
  while (Serial1.available()) Serial1.read(); // Clear buffer
  
  Serial.println("GSM Ready.");
  lcd.clear();
  sendToNextion("t4.txt=\"System Ready\"");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // === Process SMS in background (COMPLETELY non-blocking) ===
  processSMS();
  
  // === Listen for manual commands from ESP32 ===
  if (Serial2.available()) {
    String command = Serial2.readStringUntil('\n');
    command.trim();
    
    if (command == "MANUAL_ON") {
      Serial.println("📱 Manual pump control: ON");
      manualMode = true;
      digitalWrite(PUMP_RELAY, HIGH);
      pumpStatus = true;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MANUAL MODE");
      lcd.setCursor(0, 1);
      lcd.print("Pump: ON");
      sendToNextion("t4.txt=\"Manual ON\"");
      
    } else if (command == "MANUAL_OFF") {
      Serial.println("📱 Manual pump control: OFF");
      manualMode = true;
      digitalWrite(PUMP_RELAY, LOW);
      pumpStatus = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MANUAL MODE");
      lcd.setCursor(0, 1);
      lcd.print("Pump: OFF");
      sendToNextion("t4.txt=\"Manual OFF\"");
      
    } else if (command == "AUTO_MODE") {
      Serial.println("🤖 Switched to AUTO mode");
      manualMode = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("AUTO MODE");
      lcd.setCursor(0, 1);
      lcd.print("Active");
      sendToNextion("t4.txt=\"Auto Mode\"");
    }
  }

  // === Read sensors every 2 seconds ===
  if (currentMillis - lastSensorRead >= 2000) {
    lastSensorRead = currentMillis;
    
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();
    distanceCM = readUltrasonicDistance();

    if (distanceCM <= 0 || distanceCM > EMPTY_DISTANCE_CM) {
      waterPercent = 0;
    } else {
      float waterDepth = EMPTY_DISTANCE_CM - distanceCM;
      waterPercent = (waterDepth / EMPTY_DISTANCE_CM) * 100.0;
      waterPercent = constrain(waterPercent, 0, 100);
    }

    updateWaterLevelIndicators(waterPercent);

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Sensor error!");
      if (smsState == SMS_IDLE) { // Only update LCD if not sending SMS
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Sensor error!");
      }
      sendToNextion("t4.txt=\"Sensor Error!\"");
      return;
    }

    Serial.print("Temp: "); Serial.print(temperature);
    Serial.print(" °C | Hum: "); Serial.print(humidity);
    Serial.print("% | Water: "); Serial.print(waterPercent);
    Serial.print("% ("); Serial.print(distanceCM); Serial.print("cm)");
    Serial.print(" | Pump: "); Serial.print(pumpStatus ? "ON" : "OFF");
    Serial.print(" | Mode: "); Serial.print(manualMode ? "MANUAL" : "AUTO");
    Serial.print(" | Pin: "); Serial.println(digitalRead(PUMP_RELAY) ? "HIGH" : "LOW");
  }

  // === Send data to ESP32 every 2 seconds ===
  if (currentMillis - lastDataSend >= 2000) {
    lastDataSend = currentMillis;
    
    String data = String(temperature, 2) + "," +
                  String(humidity, 2) + "," +
                  String(waterPercent) + "," +
                  (pumpStatus ? "1" : "0") + "," +
                  (manualMode ? "1" : "0");
    Serial2.println(data);
  }

  // === Misting Control Logic (INSTANT response, NO blocking) ===
  if (!manualMode) {
    if (temperature >= TEMP_THRESHOLD) {
      // Keep pump ON continuously when temp >= 35°C
      if (!pumpStatus) {
        digitalWrite(PUMP_RELAY, HIGH);
        pumpStatus = true;
        Serial.println("🔥 AUTO: Pump ON - Continuous operation until temp < 35°C");
        sendToNextion("t4.txt=\"Auto: Misting ON\"");
      }

      // Queue SMS (non-blocking) every 60 seconds
      if (!alertSent && currentMillis - lastSMSTime > SMS_INTERVAL && smsState == SMS_IDLE) {
        String message = "AgriCool Alert - Temp:" + String(temperature, 1) +
                         "C, Hum:" + String(humidity, 1) +
                         "%, Water:" + String(waterPercent) +
                         "%, Pump: ON";
        queueSMS(PHONE_NUMBER, message.c_str());
        lastSMSTime = currentMillis;
        alertSent = true;
      }

    } else {
      // Turn off pump when temp drops below 35°C
      if (pumpStatus) {
        digitalWrite(PUMP_RELAY, LOW);
        pumpStatus = false;
        Serial.println("❄️ AUTO: Pump OFF - Temp below 35°C");
        sendToNextion("t4.txt=\"Auto: Misting OFF\"");
      }

      // Queue SMS when cooling down
      if (alertSent && currentMillis - lastSMSTime > SMS_INTERVAL && smsState == SMS_IDLE) {
        String message = "AgriCool Update - Temp:" + String(temperature, 1) +
                         "C, Hum:" + String(humidity, 1) +
                         "%, Water:" + String(waterPercent) +
                         "%, Pump: OFF";
        queueSMS(PHONE_NUMBER, message.c_str());
        lastSMSTime = currentMillis;
        alertSent = false;
      }
    }
  }

  // === Update LCD every 2 seconds (only if not sending SMS) ===
  if (currentMillis - lastLCDUpdate >= 2000 && smsState == SMS_IDLE) {
    lastLCDUpdate = currentMillis;
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(temperature, 1);
    lcd.print("C H:");
    lcd.print(humidity, 0);
    lcd.print("%");
    lcd.setCursor(0, 1);
    lcd.print("W:");
    lcd.print(waterPercent);
    lcd.print("% ");
    lcd.print(manualMode ? "M:" : "A:");
    lcd.print(pumpStatus ? "ON " : "OFF");

    updateNextion();
  }

  // Monitor GSM responses (don't block)
  if (Serial1.available()) {
    char c = Serial1.read();
    Serial.write(c);
  }

  // ABSOLUTELY NO delay() - loop runs as fast as possible!
}

float readUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 0;
  return duration * 0.034 / 2;
}

void updateWaterLevelIndicators(int level) {
  unsigned long currentMillis = millis();
  
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);

  if (level >= 51) {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER, LOW);
    buzzerState = false;
    
  } else if (level >= 31) {
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(BUZZER, LOW);
    buzzerState = false;
    
  } else {
    digitalWrite(RED_LED, HIGH);
    
    // Non-blocking buzzer
    if (!buzzerState) {
      if (currentMillis - lastBuzzerTime >= 1000) {
        digitalWrite(BUZZER, HIGH);
        buzzerState = true;
        buzzerOnTime = currentMillis;
      }
    } else {
      if (currentMillis - buzzerOnTime >= 100) {
        digitalWrite(BUZZER, LOW);
        buzzerState = false;
        lastBuzzerTime = currentMillis;
      }
    }
  }
}

// Queue SMS for background sending (non-blocking)
void queueSMS(const char* number, const char* message) {
  if (smsState != SMS_IDLE) {
    Serial.println("⚠️ SMS already in progress, skipping");
    return;
  }
  
  pendingSMSNumber = String(number);
  pendingSMSMessage = String(message);
  smsState = SMS_INIT;
  smsStateTime = millis();
  Serial.println("📤 SMS queued for sending");
  
  // Show on LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SMS Sending...");
}

// Process SMS in background (COMPLETELY non-blocking state machine)
void processSMS() {
  unsigned long currentMillis = millis();
  
  switch (smsState) {
    case SMS_IDLE:
      // Nothing to do
      break;
      
    case SMS_INIT:
      // Initialize SMS mode
      Serial.println("📡 SMS: Init mode");
      Serial1.println("AT+CMGF=1");
      smsState = SMS_WAIT_INIT;
      smsStateTime = currentMillis;
      break;
      
    case SMS_WAIT_INIT:
      // Wait 300ms for AT command response
      if (currentMillis - smsStateTime > 300) {
        while (Serial1.available()) Serial1.read(); // Clear buffer
        smsState = SMS_SEND_NUMBER;
        smsStateTime = currentMillis;
      }
      break;
      
    case SMS_SEND_NUMBER:
      // Send phone number
      Serial.println("📡 SMS: Sending number");
      Serial1.print("AT+CMGS=\"");
      Serial1.print(pendingSMSNumber);
      Serial1.println("\"");
      smsState = SMS_WAIT_PROMPT;
      smsStateTime = currentMillis;
      break;
      
    case SMS_WAIT_PROMPT:
      // Wait 500ms for '>' prompt
      if (currentMillis - smsStateTime > 500) {
        smsState = SMS_SEND_MESSAGE;
        smsStateTime = currentMillis;
      }
      break;
      
    case SMS_SEND_MESSAGE:
      // Send actual message
      Serial.println("📡 SMS: Sending message");
      Serial1.print(pendingSMSMessage);
      Serial1.write(26); // CTRL+Z
      smsState = SMS_WAIT_COMPLETE;
      smsStateTime = currentMillis;
      break;
      
    case SMS_WAIT_COMPLETE:
      // Wait 2 seconds for send confirmation
      if (currentMillis - smsStateTime > 2000) {
        smsState = SMS_DONE;
        smsStateTime = currentMillis;
      }
      break;
      
    case SMS_DONE:
      // Show success on LCD for 1 second
      Serial.println("✅ SMS sent!");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SMS Sent!");
      lcd.setCursor(0, 1);
      lcd.print("Successfully");
      
      // Wait 1 second then return to idle
      if (currentMillis - smsStateTime > 1000) {
        smsState = SMS_IDLE;
        pendingSMSNumber = "";
        pendingSMSMessage = "";
        lastLCDUpdate = currentMillis - 2000; // Force LCD update soon
      }
      break;
  }
}

void sendToNextion(String cmd) {
  nextion.print(cmd);
  nextion.write(0xFF);
  nextion.write(0xFF);
  nextion.write(0xFF);
}

void updateNextion() {
  sendToNextion("t0.txt=\"Temp: " + String(temperature, 1) + " C\"");
  sendToNextion("t1.txt=\"Hum: " + String(humidity, 1) + " %\"");
  sendToNextion("t2.txt=\"Water: " + String(waterPercent) + " %\"");
  sendToNextion("t3.txt=\"Pump: " + String(pumpStatus ? "ON" : "OFF") + "\"");
  sendToNextion("t4.txt=\"Mode: " + String(manualMode ? "MANUAL" : "AUTO") + "\"");
}