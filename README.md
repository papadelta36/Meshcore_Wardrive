# 🌐 Meshcore Signaal Meter & Wardrive Web App (PWA v1.01)

```
       ========================================================================
       📡 MESHCORE SIGNAAL METER & WARDRIVE WEB APP - VERSION 1.01
       Progressive Web App (PWA) | Web Bluetooth (BLE) | MapLibre GL Vector Engine
       Designed & Developed by Papa Delta & Gemini | Contact: papadelta.rry36@gmail.com
       ========================================================================
```

Welcome to the comprehensive technical documentation and user guide for **Meshcore Signaal Meter & Wardrive Web (PWA v1.01)**.

This is a **100% client-side, zero-dependency Progressive Web Application (PWA)** built using vanilla HTML5, CSS3, ES6 JavaScript, and MapLibre GL JS. It communicates directly with **Meshcore LoRa companion radio nodes** (Heltec V3, T-Beam, RAK, etc.) over **Web Bluetooth (BLE)** to provide real-time signal analysis, 100% unfiltered CSV wardrive logging, tactical CRT radar, coverage mapping, repeater trilateration, and encrypted mesh messaging.

---

## 📋 Table of Contents
1. [Overview & Application Purpose](#1-overview--application-purpose)
2. [Version Specifications & Changelog (v1.01)](#2-version-specifications--changelog-v101)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [PWA Service Worker, Caching & Persistent Storage](#4-pwa-service-worker-caching--persistent-storage)
5. [Web Bluetooth (BLE) Handshake & Radio Sync Protocol](#5-web-bluetooth-ble-handshake--radio-sync-protocol)
6. [Dashboard, UI Metrics & Navigation Controls](#6-dashboard-ui-metrics--navigation-controls)
7. [Vector Map Engine, Tactical Radar & Geolocation](#7-vector-map-engine-tactical-radar--geolocation)
8. [Filter Hub & Target Focus Engine](#8-filter-hub--target-focus-engine)
9. [Signal Deep Dive & Hop Trajectory Engine](#9-signal-deep-dive--hop-trajectory-engine)
10. [Messenger, Region Scope Engine & Driving Mode](#10-messenger-region-scope-engine--driving-mode)
11. [Weighted RSSI Trilateration (Repeater Estimation)](#11-weighted-rssi-trilateration-repeater-estimation)
12. [Data Formats & Storage Schemas (CSV, JSON, LocalStorage)](#12-data-formats--storage-schemas-csv-json-localstorage)
13. [Hosting, Installation & PWA Deployment Guide](#13-hosting-installation--pwa-deployment-guide)
14. [Troubleshooting & Browser Compatibility](#14-troubleshooting--browser-compatibility)

---

## 1. 🚀 Overview & Application Purpose

The **Meshcore Signaal Meter & Wardrive Web App** allows field operators, radio enthusiasts, and wardrivers to monitor, log, analyze, and communicate over **Meshcore LoRa mesh networks** directly from a mobile or desktop web browser.

### Key Capabilities:
* **Direct Web Bluetooth (BLE) Hardware Control:** Connects directly to Meshcore companion radio hardware without requiring native mobile apps or external gateways.
* **100% Local Privacy:** Operates entirely inside the browser sandbox. Zero location telemetry, signal logs, or messages are ever transmitted to third-party servers.
* **100% Unfiltered Wardrive Logging:** Records every valid RF packet and GPS movement trail point locally into standardized 9-column CSV files (`mesh_log_*.csv`).
* **Tactical CRT Radar & Compass:** Real-time 1:1 compass-oriented radar display with interactive CRT sweep and node blips.
* **Signal Deep Dive & Trajectory Rendering:** Reconstructs the complete hop-by-hop repeater path (`node1 → node2 → node3`) and draws directional flow arrows on the map.
* **Mesh Messaging & Region Scopes:** Supports encrypted channel messaging, 1-on-1 DMs, hands-free voice dictation, high-accessibility driving typography, and SHA-256 / HMAC-SHA256 Region Scope decoding (`[#vlaanderen]`, `[#be]`, `[#nl]`, `[#public]`).

---

## 2. 🏷️ Version Specifications & Changelog (v1.01)

* **Version Number:** `v1.01` (Build Timestamp: `20260330`)
* **Protocol Compatibility:** MeshCore Companion Protocol v1.12+ / V3 Firmware

### Detailed Changelog for v1.01:
1. **User-Controlled Fullscreen Toggle:**
   - Removed forced auto-fullscreen on first user interaction.
   - Added manual `⛶` button in top bar giving users full freedom to operate in Fullscreen or Standard Windowed mode.
   - Single Page App (SPA) modals (Trips Manager, Filter Hub, Messenger, Settings) remain consistently in Fullscreen when enabled.
2. **Persistent Storage Protection (`navigator.storage.persist()`):**
   - Automatically requests Persistent Storage on startup to protect saved trips, contacts (`meshcore_located_nodes`), and chat history against automatic browser cache clearing.
3. **CSV Export/Import Parity & Android Compatibility:**
   - Enforced standard 9-column CSV format: `Timestamp,Latitude,Longitude,NodeID,SNR,RSSI,Hops,PayloadType,RawData`.
   - Cleaned commas from timestamps on export to prevent column-shifting errors during import.
   - Implemented quote-aware CSV line parser in `importTripFromCsv()`.
   - Enforced `mesh_log_` file prefix (e.g., `mesh_log_20260330_123456.csv`) on all exports for 100% mutual compatibility with the native Kotlin Android app.
   - Preserved `PayloadType` and `rawHex` across CSV export, import, and Signal Deep Dive.
4. **Dashboard Layout & High-Visibility Speed:**
   - Enlarged KM/H font size to `1.85rem` with `monospace` typography, supporting 3-digit speed values (`120`, `199`, `250`) without truncation.
   - Centered Speed and Compass containers vertically relative to the central Radar window.
   - Aligned `TIME (1m)` and `DIST (100m)` Auto-Discover progress bars on the exact same horizontal baseline at the bottom of the dashboard card.
5. **Vehicle Position Marker & Map Cleanliness:**
   - Removed the directional arrow indicator and rotational CSS transforms from `updateCarMarker`.
   - Replaced with a clean, high-visibility cyan glowing position dot (`.car-dot-core`).
6. **In-App Map Alerts & Notification Refinement:**
   - Added active tab scoping (`activeNavTab === 'map'`) to `showMessageOverlay()`.
   - Incoming message banner overlays trigger exclusively when viewing the main Map UI (`[MAP]` tab) and remain quiet while actively chatting in Messenger (`[CHAT]` tab).
   - Removed overbearing OS system-drawer notifications to prevent duplicate sounds and notification shade clutter while driving.
7. **Expanded Region Scope Engine:**
   - Pre-populated `learnedScopes` in `scope.js` with an extensive list of Benelux and European region scopes (`#be`, `#nl`, `#vlaanderen`, `#public`, `#antwerpen`, `#limburg`, `#brabant`, `#zeeland`, `#utrecht`, etc.) for automatic scope badge decoding (`[#vlaanderen]`, `[#be]`, `[#nl]`) in Messenger.

---

## 3. 🏗️ Architecture & Technology Stack

The application uses an event-driven, modular JavaScript architecture:

```
 web_app/
 ├── index.html            # Main Single-Page HTML Document & Modals
 ├── manifest.json         # PWA Web Manifest (v1.01)
 ├── sw.js                 # PWA Service Worker (Offline Cache & PWA engine)
 ├── css/
 │   └── style.css         # Tactical Dark Theme, Dashboard & Driving CSS
 ├── js/
 │   ├── app.js            # Core App Orchestration, Wardriving & UI Handlers
 │   ├── bluetooth.js      # Web Bluetooth (BLE) Manager & Handshake State Machine
 │   ├── protocol.js       # MeshCore Binary Protocol Decoder (V3, 0x88 RF Logs)
 │   ├── scope.js          # SHA-256 / HMAC-SHA256 Region Scope Engine
 │   ├── radar.js          # Tactical CRT Radar Canvas Renderer
 │   ├── graphs.js         # Canvas Signal Graph & Distance Renderers
 │   └── trilateration.js  # Weighted RSSI Repeater Trilateration Math
 └── vendor/
     ├── maplibre-gl.js    # GPU-accelerated Vector Map Engine
     └── fontawesome/      # Tactical Vector Icons
```

---

## 4. ⚡ PWA Service Worker, Caching & Persistent Storage

### Service Worker (`sw.js`)
The application includes a custom Service Worker that caches all core application assets (`index.html`, `style.css`, `js/*.js`, `vendor/*`). This enables the Web App to function **100% offline** without an internet connection or web server once installed.

### Persistent Storage API (`navigator.storage.persist()`)
By default, web browsers treat web storage (`localStorage`) as "best-effort" storage, which can be automatically cleared if local phone storage runs low.
On application startup, `app.js` executes:
```javascript
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
}
```
This requests the browser to classify the Web App's storage as **Persistent**, protecting your saved trips, imported contacts (`meshcore_located_nodes`), and chat history against automatic browser cache clearing.

---

## 5. 📶 Web Bluetooth (BLE) Handshake & Radio Sync Protocol

The BLE Manager ([bluetooth.js](file:///home/dominiek/AndroidStudioProjects/Meshcore_signaal_meter/web_app/js/bluetooth.js)) handles pairing and data transfer with Meshcore companion radio hardware via the Web Bluetooth API (`navigator.bluetooth`).

### Service & Characteristic UUIDs:
* **Service UUID:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` (Nordic UART Service)
* **TX Characteristic (Write):** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
* **RX Characteristic (Notify):** `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

### Official Connection Handshake Flow:
```
 Web App (PWA)                              Meshcore Companion Radio
     │                                                 │
     ├──────────── 1. Query Hardware Version ─────────►│ (0x01 Command)
     │◄─────────── 2. Hardware Version Response ───────┤
     │                                                 │
     ├──────────── 3. Send APP_START ─────────────────►│ (0x02 Command)
     │◄─────────── 4. APP_START Acknowledgement ──────┤
     │                                                 │
     ├──────────── 5. Sync Radio Channels (0-39) ─────►│
     │◄─────────── 6. Channel List & PSK Keys ─────────┤
     │                                                 │
     ├──────────── 7. Sync Radio Contacts ────────────►│
     │◄─────────── 8. Contact DB & Public Keys ────────┤
     │                                                 │
     └────────── Sync Complete ➔ Ready for Wardrive ───┘
```

---

## 6. 🎛️ Dashboard, UI Metrics & Navigation Controls

The Dashboard header provides real-time situational awareness:

* **Speed Value (`#tvSpeedValue`):** High-visibility cyaan green typography (`1.85rem` monospace) supporting 3-digit speed values up to `250 KM/H`.
* **Trip Distance & Duration:** Displays live trip distance (`0.00 km`) and duration (`00:00:00`).
* **Auto-Discover Progress Bars:**
  * `TIME (1m)`: 60-second progress bar for automatic periodic discovery requests.
  * `DIST (100m)`: 100-meter progress bar tracking distance-based discovery requests.
* **VU Meters:** Dual signal meters displaying real-time **RSSI (dBm)** and **SNR (dB)** with color-coded bar levels.
* **Action Buttons:**
  * `🔍 FILTERS`: Opens the Filter Hub modal.
  * `[✓] Filter`: Toggles active filter rules live on screen.
  * `Auto`: Toggles automatic discovery requests during drives.
  * `TRIPS`: Opens the Trips & Logs Manager.
  * `⚡ v1.01`: Hard-resets application cache and reloads latest scripts.
  * `⛶`: Toggles Fullscreen Mode on or off.
  * `≡`: Opens System Hub & Settings.

---

## 7. 🗺️ Vector Map Engine, Tactical Radar & Geolocation

### MapLibre GL Vector Map Engine
The map view uses MapLibre GL JS for GPU-accelerated vector rendering:
* **OpenFreeMap Vector Tiles:** High-definition Light and Dark HD vector maps.
* **Esri Gray Raster Tiles:** High-contrast neutral gray raster tiles for tactical visibility.
* **Coverage Heatmap (`#heatmap-layer`):** WebGL GPU heatmap layer rendering signal density based on received SNR/RSSI coordinates.
* **Cyan Repeater Markers (`#repeaters-layer`):** Interactive cyan tower icons indicating located mesh repeaters.

### Vehicle Position Dot (`.car-dot-core`)
The car position marker is rendered as a clean, glowing cyaan circle with a white border and 12px cyaan shadow (`box-shadow: 0 0 12px rgba(0, 229, 255, 0.9)`). It uses a 1000ms position animation loop (`requestAnimationFrame`) for smooth movement across GPS updates.

### Tactical CRT Radar Canvas
The radar component ([radar.js](file:///home/dominiek/AndroidStudioProjects/Meshcore_signaal_meter/web_app/js/radar.js)) renders a 1:1 compass-oriented radar display:
* **Rotating Sweep:** 360-degree rotating radar beam line with trailing green/red CRT glow.
* **Interactive Blips:** Newly discovered mesh nodes appear as blips on the radar positioned by compass bearing and estimated distance.
* **CRT Radar Modal:** Tap the radar canvas to expand into a full-screen CRT Radar view with range rings (250m, 500m, 750m, 1000m).

---

## 8. 🔍 Filter Hub & Target Focus Engine

Tap **🔍 FILTERS** on the top bar to open the Filter Hub modal:

```
 ┌──────────────────────────────────────────────────────────┐
 │ 🔍 FILTER HUB & TARGET FOCUS                             │
 ├──────────────────────────────────────────────────────────┤
 │ Target Focus Node IDs: [ 692F, 2F3A                 ]    │
 │ ID Length Filter:      [ All Lengths / 1B / 2B / 3B ]    │
 │ Traffic Payload Type:  [ All / Adverts / DMs / Channels] │
 │ Zero Hop Mode:         [ [X] Direct 0-Hop Signals Only]   │
 └──────────────────────────────────────────────────────────┘
```

* **Target Focus IDs:** Filters map markers and log lists to match specific node IDs (e.g. `692F`, `2F3A`). Supports 1-byte, 2-byte, 3-byte, and Public Key IDs.
* **ID Length Filter:** Filters nodes by ID length (1-Byte, 2-Byte, 3-Byte, or Public Key).
* **Traffic Types:** Filter by Adverts (0x04), Direct Messages (0x02), Channels (0x05), Discover (0x0E), or RF Logs (0x88).
* **Zero Hop Only:** Displays only direct 0-hop signals received directly from the transmitter.
* **100% Unfiltered Logging Guarantee:** Filters **only affect the screen display**. All received signals are **always 100% recorded unfiltered** into the CSV trip file for post-drive analysis!

---

## 9. 🔬 Signal Deep Dive & Hop Trajectory Engine

Long-press any signal log entry or contact to open **Signal Deep Dive** ([app.js:L4183](file:///home/dominiek/AndroidStudioProjects/Meshcore_signaal_meter/web_app/js/app.js#L4183)):

### Displayed Information:
* **RF Parameters:** SNR (dB), RSSI (dBm), Hop Count, Last Hop Node.
* **Routing Details:** Route Type (0x00 Flood, 0x01 Direct, 0x02 Zero-hop), Message Hash, Payload Version.
* **Full Repeater Path:** Displays the complete repeater chain (`node1 → node2 → node3`).
* **Decrypted Payload Content:** Automatically decrypts channel messages and displays decrypted text.
* **Raw Hex Payload:** Displays the full unedited hex byte string.

### Trajectory Path Visuals:
Tap **"Full Repeater Path"** inside Deep Dive to switch the map to Trajectory View:
* Numbered hop circles (`1`, `2`, `3`) placed at each repeater's GPS location.
* Midpoint directional flow arrows (➔) indicating signal propagation direction.
* Automatic map zoom framing the full trajectory.

---

## 10. 💬 Messenger, Region Scope Engine & Driving Mode

### Channels & Direct Messages
* **Channels (Slots 1–39):** Supports public channels, hashtag channels (`#wardrive`), and private encrypted channels with AES-128 PSK keys.
* **Direct Messages (DMs):** Private 1-on-1 conversations with specific nodes.

### Region Scope Engine ([scope.js](file:///home/dominiek/AndroidStudioProjects/Meshcore_signaal_meter/web_app/js/scope.js))
Decodes MeshCore Region Scopes using SHA-256 hashing and HMAC-SHA256 transport codes:
* **Pre-populated Scopes:** `#be`, `#nl`, `#vlaanderen`, `#public`, `#antwerpen`, `#limburg`, `#brabant`, `#zeeland`, `#utrecht`, `#gelderland`, `#overijssel`, `#drenthe`, `#friesland`, `#groningen`, `#de`, `#nrw`, `#aachen`, etc.
* **Messenger Badges:** Scoped messages display regional scope tags (e.g. `[#vlaanderen]`, `[#be]`, `[#nl]`, `[GLOBAL]`) next to the message timestamp.

### In-App Map Alerts
When a new message arrives:
* **On Map View (`activeNavTab === 'map'`):** Triggers the in-app overlay banner (`#tvMessageOverlay`) displaying the sender name, scope tag, message text, and hop count for 10 seconds.
* **On Messenger View (`activeNavTab === 'chat'`):** The overlay banner is suppressed to avoid covering the chat window. The message is added directly to the chat feed in real-time.

### Hands-Free Voice Dictation & Driving Mode (> 5 km/h)
* **Voice Dictation (🎙️):** Tap the microphone button to dictate text via the Web Speech API. Includes an automated 5-second countdown timer before sending.
* **Driving Mode (> 5 km/h):** When driving speed exceeds 5 km/h, messenger typography automatically expands into large `2.85rem` high-accessibility text for safe viewing while driving.

---

## 11. 🎯 Weighted RSSI Trilateration (Repeater Estimation)

To estimate the physical location of an unknown repeater:
1. Open **Filter Hub** (`🔍 FILTERS`).
2. Enter the target Node ID into **Target Focus**.
3. Tap **"🎯 ESTIMATE REPEATER POSITION"**.
4. The trilateration engine ([trilateration.js](file:///home/dominiek/AndroidStudioProjects/Meshcore_signaal_meter/web_app/js/trilateration.js)) processes all historical CSV signal receptions for that target node using Inverse Distance Squared Weighted RSSI Trilateration:

$$\text{Weight}_i = \frac{1}{\max(D_i, 1.0)^2}$$

$$\text{Estimated Lat} = \frac{\sum (\text{Lat}_i \cdot \text{Weight}_i)}{\sum \text{Weight}_i}, \quad \text{Estimated Lng} = \frac{\sum (\text{Lng}_i \cdot \text{Weight}_i)}{\sum \text{Weight}_i}$$

5. Plots an orange estimated repeater marker on the map with a dashed confidence radius circle.

---

## 12. 📊 Data Formats & Storage Schemas (CSV, JSON, LocalStorage)

### 9-Column CSV Format (`mesh_log_*.csv`)
```csv
Timestamp,Latitude,Longitude,NodeID,SNR,RSSI,Hops,PayloadType,RawData
30/03/26 14:10:05,51.123456,3.123456,692F,12,-78,1,0x08,880108A1B2...
30/03/26 14:10:08,51.123490,3.123490,TRAIL,0,0,-1,,
```
* **Node Rows:** Contains signal receptions with Node ID, SNR, RSSI, Hops, Payload Type, and Raw Hex.
* **TRAIL Rows:** Contains GPS movement points (`NodeID = TRAIL`) recorded during wardriving.
* **Cross-App Parity:** 100% mutually exchangeable with the native Kotlin Android app.

### Web Storage Keys (`localStorage`):
* `saved_trips`: JSON array of recorded trips (track points, signal logs, distance, duration).
* `meshcore_located_nodes`: JSON array of known/imported contacts and repeaters.
* `meshcore_message_history`: JSON array of recent channel and DM chat messages.
* `meshcore_learned_scopes`: JSON array of custom/learned region scope strings.
* `msg_enabled`: Boolean string (`"true"` / `"false"`) for message alerts.

---

## 13. 🖥️ Hosting, Installation & PWA Deployment Guide

### Serving the Web App:

#### Local Python Webserver:
```bash
cd /path/to/Meshcore_signaal_meter/web_app
python3 -m http.server 8080
```

#### Node.js http-server:
```bash
cd /path/to/Meshcore_signaal_meter/web_app
npx http-server -p 8080 -c-1
```

#### GitHub Pages / Cloudflare Pages / Netlify:
Deploy the contents of `web_app/` to any static web host under HTTPS. (Note: Web Bluetooth requires an HTTPS origin or `localhost`).

### Installing as a PWA App:
1. Open the Web App URL in Google Chrome, Microsoft Edge, or Android Chrome.
2. Tap the browser menu (⋮) and select **"Install App"** or **"Add to Home Screen"**.
3. The Web App installs as a standalone fullscreen desktop/mobile application with its own launcher icon.

---

## 14. ❓ Troubleshooting & Browser Compatibility

| Platform / Browser | Web Bluetooth Support | PWA Installable | Notes |
| :--- | :--- | :--- | :--- |
| **Android Chrome / Edge / Brave** | ✅ Fully Supported | ✅ Supported | Full Web Bluetooth, GPS tracking & PWA support. |
| **Desktop Chrome / Edge / Brave (Win/Mac/Linux)** | ✅ Fully Supported | ✅ Supported | Requires Bluetooth hardware on PC/Mac. |
| **iOS Safari / Chrome on iOS** | ❌ Not Supported by Apple | ⚠️ Limited | Apple blocks Web Bluetooth in iOS Safari. Use *Bluefy* or *WebBLE* browser on iOS. |

### Common Fixes:
* **Bluetooth Scan list is empty:** Ensure Location Services & Bluetooth are enabled on your device, and that you are using Google Chrome or Microsoft Edge over HTTPS/localhost.
* **Restoring Contacts after Cache Clear:** Go to System Hub (≡), tap **📖 User Manual & Info**, or use **`📥 Import Contacts (JSON)`** to re-import your `contacts.json` file. Persistent Storage automatically prevents automatic cache clearing once granted.

---

*Meshcore Signaal Meter & Wardrive Web v1.01 — Designed & Developed by Papa Delta & Gemini.*
