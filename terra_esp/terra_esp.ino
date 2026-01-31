// Define analog input pin for ESP32
#define sensorPin 34
#include <WiFi.h>
#include "WebServer.h"
#include "DHT.h"
#include <Firebase_ESP_Client.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

#define WIFI_NETWORK "SUMIDO HOME WIFI"
#define WIFI_PASSWORD "basil_15analiza2024"
#define WIFI_TIMEOUT_MS 20000

// Firebase credentials
#define FIREBASE_HOST "https://tearrarium-iot-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app"
#define API_KEY "AIzaSyD-SZD13ODaIw8qXmptKy1eMC-wZ8VlupA"
#define DATABASE_URL "https://tearrarium-iot-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Control pins
#define HUMIDIFIER_PIN 16
#define LIGHT_CONTROL_PIN 17
#define DHTPIN 26
#define DHTTYPE DHT22 
#define ldrPin 35
#define AIR_VALUE 3000
#define WATER_VALUE 1500

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// Firebase objects
FirebaseData fbdo;
FirebaseData fbdoStream;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
unsigned long tokenCheckPrevMillis = 0;
bool signupOK = false;
String currentUserEmail = "";
String currentUserId = "";
String currentIdToken = "";

bool humidifierState = false;
int lightBrightness = 0;

float currentTemperature = 0;
float currentHumidity = 0;
int currentMoisture = 0;
int currentLight = 0;
float currentLux = 0;

// ✅ Function to fetch user credentials from RTDB
bool fetchUserCredentials() {
  Serial.println("🔐 Fetching user credentials from RTDB...");
  
  // Use temporary anonymous auth just to read the credentials
  FirebaseData tempFbdo;
  
  // Check if token data exists
  if (Firebase.RTDB.getString(&fbdo, "esp32Auth/currentUser/idToken")) {
    currentIdToken = fbdo.stringData();
    
    if (currentIdToken.length() > 0) {
      // Get user info
      if (Firebase.RTDB.getString(&fbdo, "esp32Auth/currentUser/email")) {
        currentUserEmail = fbdo.stringData();
      }
      if (Firebase.RTDB.getString(&fbdo, "esp32Auth/currentUser/uid")) {
        currentUserId = fbdo.stringData();
      }
      
      // Check if token is expired
      if (Firebase.RTDB.getInt(&fbdo, "esp32Auth/currentUser/expiresAt")) {
        long long expiresAt = fbdo.intData();
        long long currentTime = millis() + 1609459200000LL; // Approximate current time (adjust based on NTP)
        
        if (expiresAt < currentTime) {
          Serial.println("⚠️ Token may be expired, but will try to use it");
        }
      }
      
      Serial.println("✅ Credentials retrieved successfully");
      Serial.print("   Email: ");
      Serial.println(currentUserEmail);
      Serial.print("   UID: ");
      Serial.println(currentUserId);
      
      return true;
    } else {
      Serial.println("❌ No active user session found");
      return false;
    }
  } else {
    Serial.print("❌ Failed to fetch credentials: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
}

// ✅ Authenticate with fetched token using legacy token method
bool authenticateWithToken() {
  Serial.println("🔑 Authenticating with user token...");
  
  // Reset Firebase
  Firebase.reset(&config);
  
  // Configure with API key
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Use the ID token as a legacy token for authentication
  config.signer.tokens.legacy_token = currentIdToken.c_str();
  
  // Set token status callback
  config.token_status_callback = tokenStatusCallback;
  
  // Initialize Firebase with token
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Wait a bit for connection
  delay(3000);
  
  // Test if we can access the database
  if (Firebase.ready()) {
    Serial.println("✅ Successfully authenticated!");
    Serial.print("   Authenticated as: ");
    Serial.println(currentUserEmail);
    signupOK = true;
    return true;
  } else {
    Serial.println("❌ Authentication failed");
    signupOK = false;
    return false;
  }
}

void handleRoot() {
  String html = "<html><head>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
  html += ".container{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
  html += "h1{color:#333;border-bottom:2px solid #4CAF50;padding-bottom:10px;}";
  html += "h2{color:#666;margin-top:20px;}";
  html += ".status{padding:10px;border-radius:5px;margin:10px 0;}";
  html += ".success{background:#d4edda;color:#155724;}";
  html += ".error{background:#f8d7da;color:#721c24;}";
  html += "p{margin:5px 0;color:#333;}";
  html += "a{color:#007bff;text-decoration:none;}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>🌿 ESP32 Terrarium Monitor</h1>";
  html += "<p><a href='/data'>View JSON Data</a></p>";
  
  html += "<h2>🔐 Current Session</h2>";
  if (signupOK) {
    html += "<div class='status success'>";
    html += "<p><strong>Status:</strong> ✅ Authenticated</p>";
    html += "<p><strong>User:</strong> " + currentUserEmail + "</p>";
    html += "<p><strong>UID:</strong> " + currentUserId + "</p>";
    html += "</div>";
  } else {
    html += "<div class='status error'>";
    html += "<p><strong>Status:</strong> ❌ Not Authenticated</p>";
    html += "<p>Waiting for user login...</p>";
    html += "</div>";
  }
  
  html += "<h2>📊 Current Readings</h2>";
  html += "<p><strong>Temperature:</strong> " + String(currentTemperature) + "°C</p>";
  html += "<p><strong>Humidity:</strong> " + String(currentHumidity) + "%</p>";
  html += "<p><strong>Soil Moisture:</strong> " + String(currentMoisture) + "%</p>";
  html += "<p><strong>Light (LDR):</strong> " + String(currentLight) + "</p>";
  html += "<p><strong>Light (Lux):</strong> " + String(currentLux) + "</p>";
  
  html += "<h2>🎛️ Controls</h2>";
  html += "<p><strong>Humidifier:</strong> " + String(humidifierState ? "🟢 ON" : "🔴 OFF") + "</p>";
  html += "<p><strong>Light Brightness:</strong> " + String(lightBrightness) + "/255</p>";
  
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
}

void handleData() {
  String json = "{";
  json += "\"temperature\":" + String(currentTemperature) + ",";
  json += "\"humidity\":" + String(currentHumidity) + ",";
  json += "\"moisture\":" + String(currentMoisture) + ",";
  json += "\"light\":" + String(currentLight) + ",";
  json += "\"lux\":" + String(currentLux) + ",";
  json += "\"humidifierState\":" + String(humidifierState ? "true" : "false") + ",";
  json += "\"lightBrightness\":" + String(lightBrightness) + ",";
  json += "\"authenticated\":" + String(signupOK ? "true" : "false") + ",";
  json += "\"authenticatedUser\":\"" + currentUserEmail + "\",";
  json += "\"userId\":\"" + currentUserId + "\"";
  json += "}";
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  server.send(200, "application/json", json);
}

void handleHumidifierControl() {
  if (!signupOK) {
    server.send(401, "application/json", "{\"success\":false,\"error\":\"Not authenticated\"}");
    return;
  }
  
  if (server.hasArg("state")) {
    String state = server.arg("state");
    humidifierState = (state == "on" || state == "true" || state == "1");
    
    digitalWrite(HUMIDIFIER_PIN, humidifierState ? HIGH : LOW);
    
    if (signupOK) {
      Firebase.RTDB.setBool(&fbdo, "sensorData/controls/humidifierState", humidifierState);
    }
    
    String json = "{";
    json += "\"success\":true,";
    json += "\"humidifierState\":" + String(humidifierState ? "true" : "false");
    json += "}";
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", json);
    
    Serial.println("Humidifier turned " + String(humidifierState ? "ON" : "OFF"));
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing state parameter\"}");
  }
}

void handleLightControl() {
  if (!signupOK) {
    server.send(401, "application/json", "{\"success\":false,\"error\":\"Not authenticated\"}");
    return;
  }
  
  if (server.hasArg("brightness")) {
    String brightness = server.arg("brightness");
    lightBrightness = brightness.toInt();
    lightBrightness = constrain(lightBrightness, 0, 255);
    
    analogWrite(LIGHT_CONTROL_PIN, lightBrightness);
    
    if (signupOK) {
      Firebase.RTDB.setInt(&fbdo, "sensorData/controls/lightBrightness", lightBrightness);
    }
    
    String json = "{";
    json += "\"success\":true,";
    json += "\"lightBrightness\":" + String(lightBrightness);
    json += "}";
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", json);
    
    Serial.println("Light brightness set to: " + String(lightBrightness));
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing brightness parameter\"}");
  }
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void connectToWifi(){
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NETWORK, WIFI_PASSWORD);
  unsigned long startAttemptTime = millis();
  
  while(WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS){
    Serial.print(".");
    delay(100);
  }
  
  if(WiFi.status() != WL_CONNECTED){
    Serial.println(" Failed!");
  } else {
    Serial.println(" Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }
}

void setup() {
  Serial.begin(115200);
  connectToWifi();
  
  Serial.println("ESP32 Terrarium IoT Monitor - Dynamic Auth v2");
  Serial.println("==============================================");

  pinMode(HUMIDIFIER_PIN, OUTPUT);
  pinMode(LIGHT_CONTROL_PIN, OUTPUT);
  digitalWrite(HUMIDIFIER_PIN, LOW);
  analogWrite(LIGHT_CONTROL_PIN, 0);

  dht.begin();

  // Configure Firebase for initial anonymous access to read credentials
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Sign in anonymously first to read the user credentials
  Serial.println("🔓 Signing in anonymously to fetch user credentials...");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Anonymous sign-in successful");
    
    config.token_status_callback = tokenStatusCallback;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    delay(3000); // Wait for Firebase to be ready
    
    // Now fetch and authenticate with user credentials
    if (fetchUserCredentials()) {
      authenticateWithToken();
    } else {
      Serial.println("⚠️ No user logged in. Waiting for login...");
      signupOK = false;
    }
  } else {
    Serial.printf("❌ Anonymous sign-in failed: %s\n", config.signer.signupError.message.c_str());
    Serial.println("⚠️ Will retry in loop...");
  }

  // Define web server routes
  server.on("/", handleRoot);
  server.on("/data", HTTP_GET, handleData);
  server.on("/data", HTTP_OPTIONS, handleOptions);
  server.on("/control/humidifier", HTTP_GET, handleHumidifierControl);
  server.on("/control/humidifier", HTTP_OPTIONS, handleOptions);
  server.on("/control/light", HTTP_GET, handleLightControl);
  server.on("/control/light", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("✅ Web server started on port 80");
  Serial.print("   Access at: http://");
  Serial.println(WiFi.localIP());
}

void loop() {
  server.handleClient();
  
  // ✅ Check for credential updates every 30 seconds
  if (millis() - tokenCheckPrevMillis > 30000 || tokenCheckPrevMillis == 0) {
    tokenCheckPrevMillis = millis();
    
    // Try to fetch new credentials
    String previousEmail = currentUserEmail;
    
    if (fetchUserCredentials()) {
      // If user changed, re-authenticate
      if (previousEmail != currentUserEmail || !signupOK) {
        Serial.println("🔄 User credentials updated, re-authenticating...");
        authenticateWithToken();
      }
    } else if (signupOK) {
      // User logged out
      Serial.println("⚠️ User logged out, losing authentication...");
      signupOK = false;
      currentUserEmail = "";
      currentUserId = "";
    }
  }
  
  // Read soil moisture
  int soilValue = analogRead(sensorPin);  
  Serial.print("Analog output: ");
  Serial.print(soilValue);
  
  int moisturePercent = map(soilValue, AIR_VALUE, WATER_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);
  currentMoisture = moisturePercent;
  
  Serial.print(" | Moisture: ");
  Serial.print(moisturePercent);
  Serial.print("%");

  // Read DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
 
  if (isnan(h) || isnan(t)) {
    Serial.println(F(" | Failed to read DHT sensor!"));
  } else {
    currentHumidity = h;
    currentTemperature = t;
    
    Serial.print(F(" | Humidity: "));
    Serial.print(h);
    Serial.print(F("%  Temperature: "));
    Serial.print(t);
    Serial.print(F("°C"));
  }

  // Read LDR
  int ldrValue = analogRead(ldrPin); 
  currentLight = ldrValue;
  
  float voltage = ldrValue * (3.3 / 4095.0);
  float R_fixed = 10000.0;
  float ldrResistance;
  float lux;
  
  float A = 500.0;
  float B = -1.4;
  
  if (voltage < 0.01) {
    ldrResistance = 999999.0;
    lux = 0.0;
  } else if (voltage > 3.28) {
    ldrResistance = 10.0;
    lux = 100000.0;
  } else {
    ldrResistance = (3.3 - voltage) * R_fixed / voltage;
    float ldrResistance_kOhm = ldrResistance / 1000.0;
    lux = A * pow(ldrResistance_kOhm, B);
    lux = constrain(lux, 0.1, 100000.0);
  }
  
  currentLux = lux;
  
  Serial.print(" | Lux: ");
  Serial.println(lux);

  // Send data to Firebase only if authenticated
  if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis > 3000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    
    if (Firebase.RTDB.setFloat(&fbdo, "sensorData/temperature", currentTemperature)) {
      Serial.print("Temperature sent: ");
      Serial.println(currentTemperature);
    } else {
      Serial.println("Failed to send temperature: " + fbdo.errorReason());
    }
    
    if (Firebase.RTDB.setFloat(&fbdo, "sensorData/humidity", currentHumidity)) {
      Serial.print("Humidity sent: ");
      Serial.println(currentHumidity);
    } else {
      Serial.println("Failed to send humidity: " + fbdo.errorReason());
    }
    
    if (Firebase.RTDB.setInt(&fbdo, "sensorData/moisture", currentMoisture)) {
      Serial.print("Moisture sent: ");
      Serial.println(currentMoisture);
    } else {
      Serial.println("Failed to send moisture: " + fbdo.errorReason());
    }
    
    if (Firebase.RTDB.setFloat(&fbdo, "sensorData/lux", currentLux)) {
      Serial.print("Lux sent: ");
      Serial.println(currentLux);
    } else {
      Serial.println("Failed to send lux: " + fbdo.errorReason());
    }
    
    // Store user context with data
    Firebase.RTDB.setString(&fbdo, "sensorData/lastUser", currentUserEmail);
    Firebase.RTDB.setString(&fbdo, "sensorData/lastUserId", currentUserId);
    Firebase.RTDB.setTimestamp(&fbdo, "sensorData/lastUpdated");
    
    Serial.println("✓ All data sent successfully");
    Serial.println("---");
  }

  // READ AND APPLY CONTROLS FROM FIREBASE
  if (Firebase.ready() && signupOK) {
    if (Firebase.RTDB.getBool(&fbdo, "sensorData/controls/humidifierState")) {
      bool newState = fbdo.boolData();
      if (newState != humidifierState) {
        humidifierState = newState;
        digitalWrite(HUMIDIFIER_PIN, humidifierState ? HIGH : LOW);
        Serial.print("🔄 HUMIDIFIER: ");
        Serial.println(humidifierState ? "ON" : "OFF");
      }
    }

    if (Firebase.RTDB.getInt(&fbdo, "sensorData/controls/lightBrightness")) {
      int newBrightness = fbdo.intData();
      if (newBrightness != lightBrightness) {
        lightBrightness = newBrightness;
        analogWrite(LIGHT_CONTROL_PIN, lightBrightness);
        Serial.print("💡 LIGHT: ");
        Serial.println(lightBrightness);
      }
    }
  }
  
  delay(2000);
}
