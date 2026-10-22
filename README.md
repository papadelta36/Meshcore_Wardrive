# 📡 Meshcore Wardrive v1.01 — User Manual

Welcome to the official user manual for **Meshcore Wardrive v1.01**. 
This application is designed for mobile RF signal measurements, network analysis, wardriving, and tactical communications over the **Meshcore** LoRa mesh network.

---

## 📋 Table of Contents
1. [Quick Start Guide](#1-quick-start-guide)
2. [Dashboard & Main Interface](#2-dashboard--main-interface)
3. [Filter Hub & Filter Settings](#3-filter-hub--filter-settings)
4. [Map View & Visualizations](#4-map-view--visualizations)
5. [Signal Deep Dive & Hop Trajectories](#5-signal-deep-dive--hop-trajectories)
6. [Trilateration (Repeater Position Estimation)](#6-trilateration-repeater-position-estimation)
7. [Messenger & Voice Control](#7-messenger--voice-control)
8. [Data Export & Trips Management](#8-data-export--trips-management)
9. [System Hub & Settings](#9-system-hub--settings)
10. [Frequently Asked Questions (FAQ)](#10-frequently-asked-questions-faq)

---

## 1. 🚀 Quick Start Guide

1. **Enable Bluetooth**: Ensure Bluetooth is enabled on your device.
2. **Connect to your Meshcore Node**:
   - Open Meshcore Wardrive.
   - Open System Hub (≡) and tap **📶 Scan & Connect BLE** to select your companion node.
   - The app automatically executes the official handshake (Query ➔ App Start ➔ Channel Sync ➔ Contacts).
3. **Start Wardriving**:
   - As soon as the connection is active, all received signals are automatically recorded **100% unfiltered** into a local CSV trip file.
   - Your live speed, trip distance, and duration are updated in real-time on the dashboard.

---

## 2. 📊 Dashboard & Main Interface

The Dashboard is the central control hub of the application:

- **Live Metrics**:
  - **Speed**: High-visibility GPS speed (KM/H) supporting 3-digit values.
  - **Distance**: Total distance traveled for the current trip.
  - **Duration**: Total elapsed time of the trip.
  - **Auto-Discover Progress**: Aligned `TIME (1m)` and `DIST (100m)` progress bars at the bottom of the dashboard card.
- **Shortcuts**:
  - **🔍 FILTERS**: Opens the central Filter Hub for deep traffic filtering.
  - **[✓] Filter**: Toggles active filters live on screen with a single tap.
  - **Auto**: Toggles automatic discovery requests during wardriving.
  - **TRIPS**: Export and manage recorded sessions as CSV or KML (Google Earth).
- **Data Lists**:
  - **Best Seen (SNR)**: Shows the strongest reception per node. Tap to view location, or long-press for **Signal Deep Dive**.
  - **All Received (Time)**: Chronological stream of all incoming RF signals.
  - **Located Nodes / Contacts**: Overview of all known repeaters and user nodes. Long-press for contact info or to start a direct message.

---

## 3. 🔍 Filter Hub & Filter Settings

The **Filter Hub** allows you to customize exactly what is displayed on the map and lists.

> [!NOTE]
> **Important**: Filters **only affect the screen display**. All received signals are **always 100% recorded unfiltered** into the CSV trip file for post-drive analysis!

### Available Filters:
1. **Target Focus (Target IDs)**:
   - Focus exclusively on specific node IDs (e.g. `692F`, `2F3A`).
   - Supports 1-byte short IDs (e.g. `69`), 2-byte (`69AB`), 3-byte (`69ABCD`), and full 12-character Public Key IDs.
2. **ID Length Filter**:
   - Filter by ID length: **1-Byte**, **2-Byte**, **3-Byte**, or **Public Key**.
3. **Traffic Types (Payload Types)**:
   - Filter specific traffic types: *Adverts (0x04)*, *Direct Messages (0x02)*, *Channels (0x05)*, *Discover (0x0E)*, *RF Logs (0x88)*, *Telemetry*, or *Acks*.
4. **Zero-Hop Mode**:
   - Enable to display only direct signals (0 hops) received directly from the transmitter.
5. **Master Toggle `[✓] Filter` on Dashboard**:
   - Toggle all active filters live without having to re-open the Filter Hub.

---

## 4. 🗺️ Map View & Visualizations

The map provides a realistic visual overview of your coverage area:

- **Vector & Raster Maps**:
  - Switch between fast vector maps (`.map` files) or Esri Gray raster maps.
  - **100% Offline Capability**: Place `.map` files in the `osmdroid_maps` folder on your phone to use the app completely offline with zero mobile data consumption.
- **Map Controls**:
  - **⌖ Recenter**: Keeps the map focused on your current GPS position and heading.
  - **☀ / 🌙 Theme**: Toggle between Day and Night mode for optimal readability.
  - **🔥 Heatmap Toggle**: Toggle the coverage heatmap layer on or off.
  - **🗼 Repeaters Toggle**: Show or hide known repeaters as cyan icons on the map. Tap any repeater icon to view node details.
  - **📡 Radar**: Opens the tactical radar overlay or full-screen CRT radar view.
  - **▲ / ▼ Collapse List**: Collapse the bottom list panel for a full-screen map view.

---

## 5. 🔬 Signal Deep Dive & Hop Trajectories

Analyze the exact path an RF packet traveled across the mesh network:

1. **Opening Signal Deep Dive**:
   - Long-press any signal log, Best Seen item, or chat message.
2. **Deep Dive Information**:
   - **RF Telemetry**: SNR (Signal-to-Noise Ratio in dB) and RSSI (Signal Strength in dBm).
   - **Routing & Header**: Route Type (Flood, Direct, Zero-hop), Hop count, Message hash, and Last hop repeater.
   - **Decrypted Content**: Automatic decryption of channel messages, sender recognition, and raw hex payload display.
3. **Trajectory Visualization on Map**:
   - In the Deep Dive screen, tap **"Full Repeater Path"**.
   - The map displays the complete hop-by-hop route:
     - Numbered hop steps with node names/IDs.
     - Clear directional flow arrows (➔) showing the signal path.
     - Automatic zoom framing the full trajectory.

---

## 6. 🎯 Trilateration (Repeater Position Estimation)

Received a repeater whose exact GPS coordinates are unknown?

1. Open the **Filter Hub** (`🔍 FILTERS`).
2. Enter the repeater's Node ID into **Target Focus**.
3. Tap **"🎯 ESTIMATE REPEATER POSITION"**.
4. The app analyzes all historical CSV trip data and computes the most probable physical location via weighted RSSI trilateration.
5. An orange marker with a dashed confidence radius circle appears on the map.

---

## 7. 💬 Messenger, Region Scopes & Voice Control

Communicate seamlessly across the Meshcore network:

- **Channels & Direct Messages**: Switch between public/regional channels or private 1-on-1 direct conversations.
- **Region Scopes**: Automatically decodes MeshCore Region Scopes (e.g. `[#vlaanderen]`, `[#be]`, `[#nl]`, `[#public]`, `[#brabant]`, `[#zeeland]`) using SHA-256 keys and HMAC-SHA256 transport codes.
- **In-App Map Alerts**: Incoming messages trigger an in-app overlay banner exclusively when viewing the main Map UI (`[MAP]` tab). While in the Messenger (`[CHAT]` tab), messages appear quietly in real-time in the chat feed.
- **🎙️ Hands-Free Voice Dictation**:
  - Tap the microphone icon 🎙️ to dictate your message.
  - An automatic **5-second countdown** begins.
  - When the timer expires, the message is sent automatically. Tap again during countdown to cancel or re-dictate.
- **Driving Mode (> 5 km/h)**:
  - When driving speed exceeds 5 km/h (or toggled manually), the messenger typography expands into large, high-accessibility text (`2.85rem`) for safe in-car viewing.

---

## 8. 📁 Data Export & Trips Management

- **Local Storage**: All trip logs are saved locally (`Android/data/com.example.meshcore_signaal_meter/files/logs/`).
- **CSV & KML Export**:
  - Tap **TRIPS** on the dashboard.
  - Export individual trips or all combined trips as **CSV** (standard 9 columns with `mesh_log_` naming for full cross-app compatibility) or **KML** (for Google Earth tracking).
- **Persistent Storage Protection**: The WebApp automatically requests Persistent Storage on startup to protect saved trips, contacts, and chat history from browser cache clearing.

---

## 9. ⚙️ System Hub & Settings

Open the system menu via the **≡** button in the top left:

- **Orientation**: Lock the app in Portrait or Landscape orientation.
- **Import Contacts**: Import a `contacts.json` file to load known node names and coordinates.
- **Fullscreen Mode**: Toggle Fullscreen Mode via top bar `⛶` button or System Hub (`≡`).
- **Channel Management**: Create new channels (Slots 1–39) via Messenger (`➕ Add / Create Channel`). Supports Hashtag channels (`#wardrive`), Private channels with random AES-128 keys, and joining via 32-character Hex PSK.

---

*Meshcore Wardrive v1.01 — Designed by Papa Delta & Gemini.*
