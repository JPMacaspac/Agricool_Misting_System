/*
 * AgriCool Misting System - Arduino Mega
 * 
 * Hardware Components:
 * - DHT22 Temperature & Humidity Sensor
 * - LCD I2C Display (16x2)
 * - Water Level Sensor
 * - 3 LEDs (Red, Yellow, Green)
 * - Buzzer
 * - Relay for Water Pump
 * 
 * This code runs on Arduino Mega and sends sensor data to ESP32 via Serial
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ---------------- DHT22 + LCD ----------------
#define DHTPIN 7
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// LCD: I2C address (0x27 or 0x3F), 16x2
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ---------------- Water Level Sensor ----------------
const int analogInPin = A0;  // Water level sensor analog pin
int sensorValue = 0;

// ---------------- LEDs + Buzzer ----------------
const int redLED = 2;
const int yellowLED = 3;
const int greenLED = 4;
const int buzzer = 5;

// ---------------- Pump Relay ----------------
const int pumpRelay = 8; 
const float tempThreshold = 32.0; // °C

// ---------------- Serial Communication ----------------
// Arduino Mega has multiple serial ports:
// Serial  = USB (for debugging)
// Serial1 = TX1(18), RX1(19) - Use this to connect to ESP32
// Serial2 = TX2(16), RX2(17)
// Serial3 = TX3(14), RX3(15)

void setup() {
  Serial.begin(9600);   // USB Serial for debugging
  Serial1.begin(9600);  // Serial1 for ESP32 communication

  // Outputs
  pinMode(redLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(buzzer, OUTPUT);
  pinMode(pumpRelay, OUTPUT);

  // Make sure pump OFF initially
  digitalWrite(pumpRelay, LOW); // Active LOW → OFF = LOW

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("System Init...");

  // DHT22
  dht.begin();
  delay(2000);
  lcd.clear();
}

void loop() {
  // ---------------- Water Level Sensor ----------------
  sensorValue = analogRead(analogInPin);
  
  // Calculate water level percentage (0-100%)
  int waterLevel = map(sensorValue, 200, 490, 0, 100);
  waterLevel = constrain(waterLevel, 0, 100);
  
  Serial.print("Water Sensor Raw = ");
  Serial.println(sensorValue);

  // Reset all indicators
  digitalWrite(redLED, LOW);
  digitalWrite(yellowLED, LOW);
  digitalWrite(greenLED, LOW);
  digitalWrite(buzzer, LOW);

  // Water Level Indication
  if (sensorValue >= 200 && sensorValue <= 290) {
    // Low water level - RED alert
    digitalWrite(redLED, HIGH);
    digitalWrite(buzzer, HIGH);
  }
  else if (sensorValue >= 350 && sensorValue <= 390) {
    // Medium water level - YELLOW warning
    digitalWrite(yellowLED, HIGH);
  }
  else if (sensorValue >= 400 && sensorValue <= 490) {
    // Good water level - GREEN OK
    digitalWrite(greenLED, HIGH);
  }

  // ---------------- Humidity + Temperature ----------------
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // Display on LCD
  lcd.setCursor(0, 0);
  if (isnan(h) || isnan(t)) {
    lcd.print("Sensor Error    ");
    lcd.setCursor(0, 1);
    lcd.print("Check wiring    ");
  } else {
    lcd.print("H:");
    lcd.print(h, 1);
    lcd.print("% T:");
    lcd.print(t, 1);
    lcd.print("C");
    lcd.setCursor(0, 1);
    lcd.print("Water:");
    lcd.print(waterLevel);
    lcd.print("%    ");
  }

  // ---------------- Pump Control ----------------
  bool pumpStatus = false;
  if (!isnan(t)) {
    if (t >= tempThreshold) {
      digitalWrite(pumpRelay, HIGH);  // Relay ON
      pumpStatus = true;
      Serial.println("Pump ON (Heat detected)");
    } else {
      digitalWrite(pumpRelay, LOW); // Relay OFF
      pumpStatus = false;
      Serial.println("Pump OFF");
    }
  }

  // ---------------- Send Data to ESP32 ----------------
  // Format: TEMP,HUMIDITY,WATER_LEVEL,PUMP_STATUS
  // Example: 34.5,60.2,75,1
  if (!isnan(t) && !isnan(h)) {
    Serial1.print(t, 2);        // Temperature with 2 decimal places
    Serial1.print(",");
    Serial1.print(h, 2);        // Humidity with 2 decimal places
    Serial1.print(",");
    Serial1.print(waterLevel);  // Water level percentage
    Serial1.print(",");
    Serial1.println(pumpStatus ? 1 : 0);  // Pump status (1=ON, 0=OFF)
    
    // Debug output
    Serial.print("Sent to ESP32: ");
    Serial.print(t); Serial.print(",");
    Serial.print(h); Serial.print(",");
    Serial.print(waterLevel); Serial.print(",");
    Serial.println(pumpStatus ? 1 : 0);
  }

  delay(2000);  // Send data every 2 seconds
}
