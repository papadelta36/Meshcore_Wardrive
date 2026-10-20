# 📡 Meshcore Signaal Meter & Wardrive WebApp v1.10

A high-performance Progressive Web Application (PWA) designed for mobile RF signal measurement, wardriving, signal heatmap visualization, tactical CRT radar scanning, and encrypted mesh messaging with **Meshcore** LoRa radios over Bluetooth LE and USB Serial.

Developed by **Papa Delta & Gemini**.

---

## 🌟 Key Features

- 📱 **Progressive Web App (PWA)**: 100% offline-capable. Once loaded or installed on Android, iOS, or Desktop Chrome, it runs completely offline via Service Worker (`sw.js`) without needing internet or a web server.
- 📻 **Web Bluetooth (BLE) & USB Serial**: Connects directly to Meshcore companion radio hardware (Seeed T1000-E, Heltec V3, RAK WisBlock, ESP32, nRF52) via Bluetooth LE (Nordic UART Service) or Web Serial.
- 🎯 **Tactical CRT Radar & Speedometer**: Dynamic compass-oriented CRT radar display with smooth sweep animations, automatic discovery scanning, live GPS speed (km/h), distance, and trip duration metrics.
- 🗺️ **Interactive Vector & Raster Maps**: Supports fast vector maps (.map) and online tile servers with Day/Night themes, RSSI/SNR signal heatmaps, and repeater location markers.
- 💬 **Encrypted Mesh Communication**: Integrated Channel Chat and Direct Messaging (DM) featuring real-time AES-128 decryption, Smaz text decompression, and quick reply templates.
- 🔍 **Signal Deep Dive & Route Trajectory**: Detailed packet inspection (SNR, RSSI, Hop Count, Payload Types: `0x88` RF Log, `0x04` Advert, `0x05` Group Text, `0x02` DM, `0x82` Ack) with multi-hop route rendering.
- 📁 **Data Export & Trip Logging**: Log wardrive signals locally and export trips to **CSV** or **KML** for analysis in Excel or Google Earth.

---

## 🚀 How to Run

### Option 1: Live Web App / PWA (Recommended)
Open your GitHub Pages URL in Google Chrome or Safari:
`https://<your-username>.github.io/<your-repository-name>/`

**Install as PWA on Mobile:**
1. Open the URL in **Google Chrome** (Android) or **Safari** (iOS).
2. Tap the browser menu (**⋮**) or Share button.
3. Select **"Install App"** (or *"Add to Home Screen"*).
4. Launch the app directly from your home screen anytime—even without internet!

### Option 2: Local Web Server
Due to browser security policies (CORS & Web Bluetooth restrictions on `file://` protocols):
- **Android**: Use a free HTTP server app (e.g. *"Simple HTTP Server"* from Google Play Store), select the `web_app` directory, and navigate to `http://localhost:8080` in Chrome.
- **Desktop**: Run `python3 -m http.server 8080` inside the `web_app` directory and open `http://localhost:8080`.

---

## 📻 Hardware Compatibility

Compatible with all nodes running **Meshcore Companion Firmware**:
- **Seeed Studio Tracker T1000-E** (nRF52840 + SX1262)
- **Heltec V3 / Vision Master / Capsule Sensor** (ESP32-S3 + SX1262)
- **RAK Wireless WisBlock Core** (nRF52840 / ESP32)
- Custom ESP32 & nRF52 LoRa Nodes

---

## 🔒 Privacy & Security

- **100% Local Storage**: All trip logs, signal measurements, and chat histories remain strictly stored in your browser's `localStorage`.
- **Zero Tracking**: No external analytics, tracking scripts, or data sent to third-party servers.
- **On-Device Decryption**: AES-128 channel and message decryption is handled locally using the Web Crypto API.

---

## 📜 Credits & License

Developed by **Papa Delta & Gemini**.  
Provided as open-source software under the MIT License.
