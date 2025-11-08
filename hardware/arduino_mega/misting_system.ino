/*
 * AgriCool Misting System - Arduino Mega
 * With LED indicators and buzzer for water level warnings
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
const float TEMP_THRESHOLD = 32.0;
const char PHONE_NUMBER[] = "+639214354307";
const unsigned long SMS_INTERVAL = 10000;

// === Tank Dimensions - ADJUST THESE FOR YOUR TANK ===
const float TANK_HEIGHT_CM = 30.0;  // Total tank height
const float SENSOR_OFFSET_CM = 2.0;  // Distance from sensor to tank top
const float EMPTY_DISTANCE_CM = 28.0; // Distance when tank is empty

// === Variables ===
float temperature = 0.0;
float humidity = 0.0;
float distanceCM = 0.0;
int waterPercent = 0;
bool pumpStatus = false;
bool alertSent = false;
unsigned long lastSMSTime = 0;
unsigned long lastBuzzerTime = 0;

// === Function Declarations ===
float readUltrasonicDistance();
void sendSMS(const char* number, const char* message);
bool waitFor(const char* target, unsigned long timeout);
void sendToNextion(String cmd);
void updateNextion();
void updateWaterLevelIndicators(int level);

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  Serial2.begin(9600);
  nextion.begin(9600);

  pinMode(PUMP_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Setup LED and Buzzer pins
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  // Turn off all indicators
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
  delay(2000);

  Serial.println("=== AgriCool Misting System ===");
  Serial.println("Water Level Indicators:");
  Serial.println("  GREEN  (51-100%): Pin 9");
  Serial.println("  YELLOW (31-50%):  Pin 10");
  Serial.println("  RED    (0-30%):   Pin 4");
  Serial.println("  BUZZER (0-30%):   Pin 5");
  
  Serial2.println("AT");
  delay(1000);
  Serial2.println("AT+CMGF=1");
  delay(1000);
  Serial.println("GSM Ready.");
  lcd.clear();
  sendToNextion("t4.txt=\"System Ready\"");
}

void loop() {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();
  distanceCM = readUltrasonicDistance();

  // === Improved Water Level Calculation ===
  if (distanceCM <= 0 || distanceCM > EMPTY_DISTANCE_CM) {
    waterPercent = 0; // No echo or tank empty
  } else {
    // Calculate water level: closer distance = more water
    float waterDepth = EMPTY_DISTANCE_CM - distanceCM;
    waterPercent = (waterDepth / EMPTY_DISTANCE_CM) * 100.0;
    waterPercent = constrain(waterPercent, 0, 100);
  }

  // Update LED and buzzer based on water level
  updateWaterLevelIndicators(waterPercent);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor error!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sensor error!");
    sendToNextion("t4.txt=\"Sensor Error!\"");
    delay(2000);
    return;
  }

  Serial.print("Temp: "); Serial.print(temperature);
  Serial.print(" °C | Hum: "); Serial.print(humidity);
  Serial.print("% | Water: "); Serial.print(waterPercent);
  Serial.print("% ("); Serial.print(distanceCM); Serial.print("cm)");
  Serial.print(" | Pump: "); Serial.print(pumpStatus ? "ON" : "OFF");
  Serial.print(" | Pin: "); Serial.println(digitalRead(PUMP_RELAY) ? "HIGH" : "LOW");
  
  Serial.print("🔍 Threshold Check: Temp ");
  Serial.print(temperature);
  Serial.print(" >= ");
  Serial.print(TEMP_THRESHOLD);
  Serial.print("? ");
  if (temperature >= TEMP_THRESHOLD) {
    Serial.println("✅ YES - Pump should be ON");
  } else {
    Serial.print("❌ NO - Need ");
    Serial.print(TEMP_THRESHOLD - temperature);
    Serial.println("°C more");
  }

  String data = String(temperature, 2) + "," +
                String(humidity, 2) + "," +
                String(waterPercent) + "," +
                (pumpStatus ? "1" : "0");
  Serial1.println(data);

  // === Misting Control Logic (TEMPERATURE ONLY) ===
  if (temperature >= TEMP_THRESHOLD) {
    if (!pumpStatus) {
      digitalWrite(PUMP_RELAY, HIGH);
      pumpStatus = true;
      Serial.println("🔥 Pump ON (Pin HIGH)");
      sendToNextion("t4.txt=\"Misting ON\"");
    }

    if (!alertSent && millis() - lastSMSTime > SMS_INTERVAL) {
      String message = "AgriCool Alert - Temp:" + String(temperature, 1) +
                       "C, Hum:" + String(humidity, 1) +
                       "%, Water:" + String(waterPercent) +
                       "%, Pump: ON";
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SMS Sending...");
      sendSMS(PHONE_NUMBER, message.c_str());
      lcd.clear();
      lcd.print("SMS Sent!");
      lastSMSTime = millis();
      alertSent = true;
    }

  } else {
    if (pumpStatus) {
      digitalWrite(PUMP_RELAY, LOW);
      pumpStatus = false;
      Serial.println("❄️ Pump OFF (Pin LOW)");
      sendToNextion("t4.txt=\"Misting OFF\"");
    }

    if (alertSent && millis() - lastSMSTime > SMS_INTERVAL) {
      String message = "AgriCool Update - Temp:" + String(temperature, 1) +
                       "C, Hum:" + String(humidity, 1) +
                       "%, Water:" + String(waterPercent) +
                       "%, Pump: OFF";
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SMS Sending...");
      sendSMS(PHONE_NUMBER, message.c_str());
      lcd.clear();
      lcd.print("SMS Sent!");
      lastSMSTime = millis();
      alertSent = false;
    }
  }

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
  lcd.print("% P:");
  lcd.print(pumpStatus ? "ON " : "OFF");

  updateNextion();
  delay(2000);

  while (Serial2.available()) {
    Serial.write(Serial2.read());
  }
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
  // Turn off all LEDs first
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  if (level >= 51) {
    // GREEN: Good water level (51-100%)
    digitalWrite(GREEN_LED, HIGH);
    Serial.println("💚 GREEN - Water level good");
    
  } else if (level >= 31) {
    // YELLOW: Medium water level (31-50%)
    digitalWrite(YELLOW_LED, HIGH);
    Serial.println("💛 YELLOW - Water level medium");
    
  } else {
    // RED: Low water level (0-30%)
    digitalWrite(RED_LED, HIGH);
    Serial.println("🔴 RED - Water level LOW!");
    
    // Buzzer beeps intermittently (500ms on, 500ms off)
    if (millis() - lastBuzzerTime > 1000) {
      digitalWrite(BUZZER, HIGH);
      delay(100); // Short beep
      digitalWrite(BUZZER, LOW);
      lastBuzzerTime = millis();
    }
  }
}

void sendSMS(const char* number, const char* message) {
  Serial.println("Sending SMS...");
  Serial2.println("AT+CMGF=1");
  waitFor("OK", 3000);
  delay(200);
  while (Serial2.available()) Serial2.read();

  Serial2.print("AT+CMGS=\"");
  Serial2.print(number);
  Serial2.println("\"");
  if (!waitFor(">", 7000)) {
    Serial.println("❌ No prompt");
    return;
  }

  Serial2.print(message);
  Serial2.write(26);
  waitFor("+CMGS", 20000);
}

bool waitFor(const char* target, unsigned long timeout) {
  unsigned long start = millis();
  String response = "";
  while (millis() - start < timeout) {
    while (Serial2.available()) {
      char c = Serial2.read();
      response += c;
      if (response.indexOf(target) != -1) return true;
    }
  }
  return false;
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
}