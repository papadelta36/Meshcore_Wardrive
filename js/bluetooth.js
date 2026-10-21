/**
 * Web Bluetooth API Manager for Meshcore Node
 * Implements Official Meshcore Handshake Protocol & Companion Bluetooth Sync
 */

class MeshcoreBleManager {
  constructor() {
    this.device = null;
    this.gattServer = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.isConnected = false;
    this.onSignalReceived = null;
    this.onStatusChanged = null;
    this.onSyncProgress = null;
    this.connectedNodeId = null;
    this.connectedNodeName = null;
    this.connectedBatteryVoltage = null;
    this.connectedRssi = -65; // Default initial RSSI in dBm
    this.currentSyncChannelIdx = 0;

    // Standard Meshcore BLE UUIDs
    this.SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    this.TX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write
    this.RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify

    // Auto-Reconnect & Heartbeat State
    this.userRequestedDisconnect = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.isAutoReconnecting = false;
    this.heartbeatTimer = null;
    this.heartbeatIntervalMs = 30000; // Send heartbeat ping every 30 seconds
  }

  async connect() {
    if (!navigator.bluetooth) {
      let reason = "Web Bluetooth is disabled or unavailable.";
      if (window.location.protocol === 'file:') {
        reason = "Web Bluetooth API is BLOCKED when opening local files directly (file://).\n\nYou MUST serve this web app via a local web server (http://localhost:8080) or HTTPS!";
      } else if (window.location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        reason = "Web Bluetooth is BLOCKED over HTTP IP addresses.\n\Please use http://localhost:8080 or host over HTTPS (e.g. GitHub Pages / Netlify)!";
      } else {
        reason = "Web Bluetooth is not enabled in Chrome.\n\nPlease check:\n1. Open 'chrome://flags/#enable-web-bluetooth' in Chrome and set to Enabled.\n2. Ensure Bluetooth is turned ON in your device system settings.";
      }
      alert("⚠️ Web Bluetooth Notice:\n\n" + reason);
      return false;
    }

    try {
      this.userRequestedDisconnect = false;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.updateStatus("Scanning for Meshcore BLE devices...");

      // Allow picking ANY MeshCore device without restrictive hardcoded name filters!
      try {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: [this.SERVICE_UUID] },
            { namePrefix: 'MeshCore' },
            { namePrefix: 'Meshtastic' },
            { namePrefix: 'Mesh' },
            { namePrefix: 'Heltec' },
            { namePrefix: 'LilyGO' },
            { namePrefix: 'RAK' },
            { namePrefix: 'T-Beam' }
          ],
          optionalServices: [this.SERVICE_UUID]
        });
      } catch (filterErr) {
        // Fallback to acceptAllDevices for maximum compatibility
        this.device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [this.SERVICE_UUID]
        });
      }

      if (!this.device) return false;

      this.isConnecting = true;

      // Immediately resolve node name from Bluetooth device object (exact WardriveService.kt line 524)
      if (this.device.name && this.device.name.trim() !== '') {
        this.connectedNodeName = this.device.name;
      }

      // Remember paired device ID in localStorage
      if (this.device.id) {
        localStorage.setItem('pairedBleDeviceId', this.device.id);
      }

      this.device.addEventListener('gattserverdisconnected', () => this.onDisconnected());

      const connectName = this.getConnectedDeviceName();
      this.updateStatus(`Connecting to ${connectName}...`);
      this.gattServer = await this.device.gatt.connect();

      const service = await this.gattServer.getPrimaryService(this.SERVICE_UUID);
      const chars = await service.getCharacteristics();

      this.txCharacteristic = null;
      this.rxCharacteristic = null;

      for (const char of chars) {
        const uuidLower = char.uuid.toLowerCase();
        console.log(`Discovered Characteristic: ${char.uuid}`, char.properties);

        if (uuidLower === this.TX_CHAR_UUID.toLowerCase() || char.properties.write || char.properties.writeWithoutResponse) {
          if (!this.txCharacteristic || uuidLower === this.TX_CHAR_UUID.toLowerCase()) {
            this.txCharacteristic = char;
          }
        }

        if (uuidLower === this.RX_CHAR_UUID.toLowerCase() || char.properties.notify || char.properties.indicate) {
          if (!this.rxCharacteristic || uuidLower === this.RX_CHAR_UUID.toLowerCase()) {
            this.rxCharacteristic = char;
          }
        }
      }

      if (!this.txCharacteristic) {
        throw new Error("Could not find GATT TX (Write) Characteristic on device.");
      }
      if (!this.rxCharacteristic) {
        throw new Error("Could not find GATT RX (Notify) Characteristic on device.");
      }

      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', (e) => this.handleIncomingData(e));

      this.isConnecting = false;
      this.isConnected = true;
      this.isAutoReconnecting = false;
      this.reconnectAttempts = 0;
      this.updateStatus(`Connected to ${this.getConnectedDeviceName()}`, true);

      // Perform Official Meshcore Handshake & Start Heartbeat
      this.sendHandshake();
      this.startHeartbeat();

      return true;
    } catch (err) {
      console.error("BLE Connection Error:", err);
      this.updateStatus("Connection failed: " + err.message, false);
      alert("Bluetooth Connection Notice: " + err.message);
      return false;
    }
  }

  async sendHandshake() {
    try {
      this.isSyncStarted = false;
      this.notifyProgress("Contacts", 0, 100);

      // Step 1: CMD_DEVICE_QUERY (0x16 0x03) (exact WardriveService.kt line 715)
      console.log("Sending Handshake Step 1: CMD_DEVICE_QUERY (0x16 0x03)");
      await this.writeBytes(new Uint8Array([0x16, 0x03]));

      // Step 2: CMD_APP_START (0x01) (exact WardriveService.kt line 720)
      setTimeout(async () => {
        console.log("Sending Handshake Step 2: CMD_APP_START (0x01)");
        const appName = "Meshcore Wardrive";
        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(appName);

        // Format: [0x01][7 bytes reserved][UTF-8 App Name][0x00]
        const appStartPayload = new Uint8Array(1 + 7 + nameBytes.length + 1);
        appStartPayload[0] = 0x01; // CMD_APP_START
        appStartPayload[1] = 0x01; // Reserved flag
        appStartPayload.set(nameBytes, 8);
        appStartPayload[8 + nameBytes.length] = 0x00;

        await this.writeBytes(appStartPayload);
      }, 1000);
    } catch (e) {
      console.error("Handshake Error:", e);
      this.notifyProgress("Complete", 0, 0);
    }
  }

  notifyProgress(step, current, total) {
    if (this.onSyncProgress) {
      this.onSyncProgress(step, current, total);
    }
  }

  async requestBatteryStatus() {
    if (!this.isConnected) return;
    console.log("Requesting battery status over BLE (0x14 CMD_GET_BATTERY)...");
    await this.writeBytes(new Uint8Array([0x14]));
  }

  async fetchCompanionContacts() {
    if (!this.isConnected) return;
    console.log("Requesting companion contacts over BLE (0x04)...");
    this.notifyProgress("Contacts", 0, 1);
    const cmd = new Uint8Array([0x04]);
    await this.writeBytes(cmd);

    // Timeout safety net for contact sync (exact WardriveService.kt line 117)
    if (this.contactSyncTimeout) clearTimeout(this.contactSyncTimeout);
    this.contactSyncTimeout = setTimeout(() => {
      console.log("Contact sync timeout/finished. Moving to message sync...");
      this.syncNextMessage();
    }, 4000);
  }

  async fetchCompanionChannels() {
    if (!this.isConnected) return;
    console.log("Starting companion channel query over BLE (0x1F CMD_GET_CHANNEL)...");
    this.currentSyncChannelIdx = 0;
    this.emptyChannelSequenceCount = 0;

    // Clear previously hardcoded/synced channels before fresh sync
    if (typeof window.clearSyncedChannels === 'function') {
      window.clearSyncedChannels();
    }

    await this.requestNextChannelIndex();
  }

  async requestNextChannelIndex() {
    // Clear any existing timeout
    if (this.channelSyncTimeout) {
      clearTimeout(this.channelSyncTimeout);
      this.channelSyncTimeout = null;
    }

    if (!this.isConnected || this.currentSyncChannelIdx >= 40) {
      console.log("Channel sync completed or reached max channels. Now requesting contacts...");
      await this.fetchCompanionContacts();
      return;
    }

    const idx = this.currentSyncChannelIdx;
    this.notifyProgress("Channels", idx + 1, 40);
    console.log(`Requesting Channel ${idx} via BLE [0x1F, 0x${idx.toString(16)}]...`);
    const cmd = new Uint8Array([0x1F, idx & 0xFF]); // CMD_GET_CHANNEL = 31 (0x1F)
    await this.writeBytes(cmd);

    // Setup timeout to skip channel if device does not respond (exact WardriveService.kt line 145)
    this.channelSyncTimeout = setTimeout(async () => {
      console.warn(`Channel ${idx} timeout! Incrementing empty sequence count...`);
      this.emptyChannelSequenceCount = (this.emptyChannelSequenceCount || 0) + 1;
      this.currentSyncChannelIdx++;

      if (this.emptyChannelSequenceCount >= 3) {
        console.log(`Detected 3 consecutive missing/empty channel timeouts. Stopping channel sync early at index ${idx}.`);
        this.currentSyncChannelIdx = 40; // Force jump to end
      }

      await this.requestNextChannelIndex();
    }, 1200);
  }

  async deriveHashtagPsk(hashtag) {
    if (!hashtag) return new Uint8Array(16);
    const cleanTag = hashtag.trim().replace(/^#/, '');
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanTag);
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(hashBuffer, 0, 16);
    } catch (e) {
      const psk = new Uint8Array(16);
      for (let i = 0; i < data.length; i++) {
        psk[i % 16] ^= data[i];
      }
      return psk;
    }
  }

  async sendSetChannel(slotIndex, name, pskBytes = null) {
    if (!this.isConnected || !this.txCharacteristic) {
      console.warn("Cannot set channel: BLE disconnected.");
      return false;
    }

    const cleanName = (name || "").trim();
    if (cleanName.length === 0) return false;

    let finalPsk = new Uint8Array(16);
    if (pskBytes && pskBytes.length >= 16) {
      finalPsk.set(pskBytes.subarray(0, 16));
    } else if (cleanName.startsWith("#") || !pskBytes) {
      finalPsk = await this.deriveHashtagPsk(cleanName);
    }

    const buf = new Uint8Array(50);
    buf[0] = 0x20; // CMD_SET_CHANNEL = 32 (0x20)
    buf[1] = slotIndex & 0xFF;

    const nameBytes = new TextEncoder().encode(cleanName);
    buf.set(nameBytes.subarray(0, Math.min(nameBytes.length, 32)), 2);
    buf.set(finalPsk.subarray(0, 16), 34);

    console.log(`Sending CMD_SET_CHANNEL (0x20): slot=${slotIndex}, name="${cleanName}"`);
    await this.writeBytes(buf);

    if (window.syncedChannels) {
      const idx = window.syncedChannels.findIndex(c => c.index === slotIndex);
      const chObj = {
        index: slotIndex,
        name: cleanName,
        psk: finalPsk,
        isVisible: true,
        scope: null
      };
      if (idx !== -1) {
        window.syncedChannels[idx] = chObj;
      } else {
        window.syncedChannels.push(chObj);
        window.syncedChannels.sort((a, b) => a.index - b.index);
      }
    }

    return true;
  }

  async deleteChannel(slotIndex) {
    if (!this.isConnected || !this.txCharacteristic) {
      console.warn("Cannot delete channel: BLE disconnected.");
      return false;
    }

    const buf = new Uint8Array(50);
    buf[0] = 0x20; // CMD_SET_CHANNEL = 32 (0x20)
    buf[1] = slotIndex & 0xFF;

    console.log(`Sending CMD_SET_CHANNEL Delete (0x20): clearing slot=${slotIndex}`);
    await this.writeBytes(buf);

    if (window.syncedChannels) {
      const idx = window.syncedChannels.findIndex(c => c.index === slotIndex);
      if (idx !== -1) {
        window.syncedChannels.splice(idx, 1);
      }
    }

    return true;
  }

  async syncNextMessage() {
    if (!this.isConnected) return;
    console.log("Requesting next queued message over BLE (0x0A CMD_SYNC_NEXT_MESSAGE)...");
    this.notifyProgress("Messages", 0, 1);
    const cmd = new Uint8Array([0x0A]); // 0x0A = CMD_SYNC_NEXT_MESSAGE
    await this.writeBytes(cmd);
  }

  async sendDiscoverRepeaterCommand() {
    if (!this.isConnected) {
      console.warn("BLE not connected; cannot send repeater discovery.");
      return;
    }
    console.log("Sending Discover Repeater command (0x37, 0x80, 0xFF, 0xAA, 0xBB, 0xCC, 0xDD)...");
    const cmd = new Uint8Array([0x37, 0x80, 0xFF, 0xAA, 0xBB, 0xCC, 0xDD]);
    await this.writeBytes(cmd);
  }

  async ensureFloodScope(scope) {
    if (!this.isConnected || !this.txCharacteristic) return;
    if (typeof MeshCoreScope === 'undefined') return;

    const normalized = MeshCoreScope.normalize(scope);
    const isUnscoped = !normalized || normalized === "" || normalized === "*";
    if (isUnscoped) return; // Do NOT send 0x36 for unscoped/global messages to prevent rejection on firmware < v1.15

    MeshCoreScope.addLearnedScope(normalized);

    const key = await MeshCoreScope.calculateKey(normalized);
    const cmd = new Uint8Array(18);
    cmd[0] = 0x36;
    cmd[1] = 0x00;
    cmd.set(key, 2);
    console.log(`[BLE Scope] Setting Flood Scope -> ${normalized}`);

    await this.writeBytes(cmd);
    await new Promise(r => setTimeout(r, 100));
  }

  async sendChannelMessage(channelIdx, text, scope = null, ackTag = null) {
    if (!this.isConnected || !this.txCharacteristic) return;

    // ALWAYS ensure flood scope (exact WardriveService.kt line 684)
    await this.ensureFloodScope(scope);
    await new Promise(r => setTimeout(r, 120));

    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const timestamp = ackTag || Math.floor(Date.now() / 1000);

    // Frame CMD_SEND_CHANNEL_TXT_MSG (0x03):
    // 0x03 [Sub-type=0x00] [ChannelIdx] [Timestamp LE (4 bytes)] [TextBytes...]
    const packet = new Uint8Array(7 + textBytes.length);
    packet[0] = 0x03;
    packet[1] = 0x00;
    packet[2] = channelIdx & 0xFF;
    packet[3] = timestamp & 0xFF;
    packet[4] = (timestamp >> 8) & 0xFF;
    packet[5] = (timestamp >> 16) & 0xFF;
    packet[6] = (timestamp >> 24) & 0xFF;
    packet.set(textBytes, 7);

    console.log(`Transmitting BLE Channel Message (CH${channelIdx}, Scope=${scope || "Global"}, AckTag=${timestamp}): "${text}"`);
    await this.writeBytes(packet);
  }

  async sendDirectMessage(targetId, text, scope = null, ackTag = null) {
    if (!this.isConnected || !this.txCharacteristic) return;

    if (scope) {
      await this.ensureFloodScope(scope);
    }

    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const timestamp = ackTag || Math.floor(Date.now() / 1000);

    // Target Prefix (6 bytes hex -> bytes).
    // Clean targetId by stripping "DM:" or non-hex characters to ensure valid 6-byte node ID prefix.
    let cleanHex = (targetId || "").toString().replace(/^DM:/i, '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

    // Auto-resolve short hex IDs (e.g. 4 or 6 chars) to full 12-char public key prefix from locatedNodes if available
    if (cleanHex.length < 12 && typeof locatedNodes !== 'undefined' && locatedNodes) {
      for (const [key, node] of locatedNodes.entries()) {
        const pk = (node.publicKey || node.pubKey || node.public_key || key || "").toString().toUpperCase();
        const nId = (node.id || "").toString().toUpperCase();
        if (nId === cleanHex || pk.startsWith(cleanHex) || key.toUpperCase().startsWith(cleanHex)) {
          if (pk.length >= 12) {
            cleanHex = pk.substring(0, 12);
            console.log(`[sendDirectMessage] Resolved short ID ${targetId} -> full 12-char public key prefix: ${cleanHex}`);
            break;
          }
        }
      }
    }

    const hexTarget = cleanHex.padEnd(12, '0');

    const prefixBytes = new Uint8Array(6);
    for (let i = 0; i < 6; i++) {
       prefixBytes[i] = parseInt(hexTarget.substring(i*2, i*2+2), 16) || 0;
    }

    // Frame CMD_SEND_TXT_MSG (0x02):
    // 0x02 [TxtType=0x00] [Attempt=0xFF] [Timestamp LE (4 bytes)] [Prefix (6 bytes)] [TextBytes...]
    const packet = new Uint8Array(13 + textBytes.length);
    packet[0] = 0x02; // CMD_SEND_TXT_MSG
    packet[1] = 0x00; // TXT_TYPE_PLAIN
    packet[2] = 0xFF; // attempt (flood)
    packet[3] = timestamp & 0xFF;
    packet[4] = (timestamp >> 8) & 0xFF;
    packet[5] = (timestamp >> 16) & 0xFF;
    packet[6] = (timestamp >> 24) & 0xFF;
    packet.set(prefixBytes, 7);
    packet.set(textBytes, 13);

    console.log(`Transmitting BLE Direct Message to ${cleanHex.substring(0, 6)} (TargetHex=${hexTarget}, AckTag=${timestamp}): "${text}"`);
    await this.writeBytes(packet);
  }

  disconnect() {
    console.log("Disconnecting Web Bluetooth GATT server...");
    this.userRequestedDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.isConnected = false;
    if (this.device && this.device.gatt) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {
        console.warn("GATT disconnect exception:", e);
      }
    }
    this.onDisconnected();
  }

  async writeBytes(bytes) {
    if (!this.txCharacteristic || !this.isConnected) {
      console.warn("Cannot write BLE bytes: txCharacteristic not ready or disconnected.");
      return;
    }

    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    if (typeof LogManager !== 'undefined') {
      LogManager.log("WardriveService", `Writing command ${hex}`);
    }

    // Add 50ms pacing delay between consecutive BLE command frames
    if (this.lastWriteTime) {
      const elapsed = Date.now() - this.lastWriteTime;
      if (elapsed < 50) {
        await new Promise(r => setTimeout(r, 50 - elapsed));
      }
    }
    this.lastWriteTime = Date.now();

    try {
      if (typeof this.txCharacteristic.writeValueWithoutResponse === 'function' &&
          (this.txCharacteristic.properties.writeWithoutResponse || this.txCharacteristic.properties.authenticatedSignedWrites)) {
        await this.txCharacteristic.writeValueWithoutResponse(bytes);
        console.log(`[BLE TX Success] writeValueWithoutResponse (${bytes.length} B): ${hex}`);
      } else if (typeof this.txCharacteristic.writeValueWithResponse === 'function' && this.txCharacteristic.properties.write) {
        await this.txCharacteristic.writeValueWithResponse(bytes);
        console.log(`[BLE TX Success] writeValueWithResponse (${bytes.length} B): ${hex}`);
      } else if (typeof this.txCharacteristic.writeValue === 'function') {
        await this.txCharacteristic.writeValue(bytes);
        console.log(`[BLE TX Success] writeValue (${bytes.length} B): ${hex}`);
      } else {
        console.error("BLE Write Error: No supported write method on txCharacteristic", this.txCharacteristic);
      }
    } catch (e) {
      console.warn(`BLE Primary write method failed for [${hex}], trying fallback:`, e);
      try {
        if (typeof this.txCharacteristic.writeValueWithoutResponse === 'function') {
          await this.txCharacteristic.writeValueWithoutResponse(bytes);
          console.log(`[BLE TX Fallback] writeValueWithoutResponse (${bytes.length} B): ${hex}`);
        } else if (typeof this.txCharacteristic.writeValue === 'function') {
          await this.txCharacteristic.writeValue(bytes);
          console.log(`[BLE TX Fallback] writeValue (${bytes.length} B): ${hex}`);
        }
      } catch (e2) {
        console.error("BLE Write Fallback Error:", e2);
      }
    }
  }

  handleIncomingData(event) {
    if (!event || !event.target || !event.target.value) return;
    const value = event.target.value;
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

    if (bytes.length === 0) return;

    if (typeof LogManager !== 'undefined') {
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
      LogManager.log("WardriveService", `RAW INCOMING (size=${bytes.length}): ${hex}`);
    }

    if (this.onSignalReceived) {
      this.onSignalReceived(bytes);
    }
  }

  onDisconnected() {
    this.isConnecting = false;
    this.isConnected = false;
    this.connectedBatteryVoltage = null;
    this.stopHeartbeat();

    // Check if auto-reconnect should be triggered (unexpected GATT drop)
    if (!this.userRequestedDisconnect && this.device && this.device.gatt) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.isAutoReconnecting = true;
        const delayMs = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts - 1)); // ~2s, 3s, 4.5s, 6.7s, 10s
        const devName = this.getConnectedDeviceName();
        this.updateStatus(`🔄 Connection lost. Reconnecting to ${devName} (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delayMs/1000)}s...`, false);

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.attemptReconnection();
        }, delayMs);
        return;
      } else {
        console.warn("Max BLE auto-reconnect attempts reached.");
      }
    }

    this.reconnectAttempts = 0;
    this.isAutoReconnecting = false;
    this.updateStatus("Disconnected", false);
    this.notifyProgress("Complete", 0, 0);
  }

  async attemptReconnection() {
    if (this.isConnected || !this.device || !this.device.gatt || this.userRequestedDisconnect) return;

    const devName = this.getConnectedDeviceName();
    this.updateStatus(`🔄 Auto-Reconnecting to ${devName}...`);

    try {
      this.gattServer = await this.device.gatt.connect();

      const service = await this.gattServer.getPrimaryService(this.SERVICE_UUID);
      const chars = await service.getCharacteristics();

      this.txCharacteristic = null;
      this.rxCharacteristic = null;

      for (const char of chars) {
        const uuidLower = char.uuid.toLowerCase();
        if (uuidLower === this.TX_CHAR_UUID.toLowerCase() || char.properties.write || char.properties.writeWithoutResponse) {
          if (!this.txCharacteristic || uuidLower === this.TX_CHAR_UUID.toLowerCase()) {
            this.txCharacteristic = char;
          }
        }
        if (uuidLower === this.RX_CHAR_UUID.toLowerCase() || char.properties.notify || char.properties.indicate) {
          if (!this.rxCharacteristic || uuidLower === this.RX_CHAR_UUID.toLowerCase()) {
            this.rxCharacteristic = char;
          }
        }
      }

      if (!this.txCharacteristic || !this.rxCharacteristic) {
        throw new Error("Reconnection failed: missing characteristics.");
      }

      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', (e) => this.handleIncomingData(e));

      this.isConnected = true;
      this.isAutoReconnecting = false;
      this.reconnectAttempts = 0;
      this.updateStatus(`Connected to ${this.getConnectedDeviceName()}`, true);

      // Re-run handshake and start heartbeat
      this.sendHandshake();
      this.startHeartbeat();

    } catch (err) {
      console.warn("BLE Auto-Reconnect Attempt Failed:", err);
      // Trigger next reconnect cycle via onDisconnected logic
      this.onDisconnected();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (this.isConnected && this.txCharacteristic) {
        try {
          // Send CMD_GET_DEVICE_TIME (0x05) as light heartbeat ping (exact WardriveService.kt ping)
          await this.writeBytes(new Uint8Array([0x05]));
          console.log("💓 BLE Heartbeat ping sent (0x05)");
        } catch (e) {
          console.warn("💓 BLE Heartbeat ping failed:", e);
        }
      } else {
        this.stopHeartbeat();
      }
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getConnectedDeviceName() {
    // 1. Prioritize official node name received from SELF_INFO (0x05) (exact WardriveService.kt line 524)
    if (this.connectedNodeName && this.connectedNodeName.trim() !== '' && this.connectedNodeName !== 'Self') {
      const clean = this.connectedNodeName.trim();
      if (!clean.includes(':') && !/^MeshCore-[0-9a-fA-F]{8,}$/i.test(clean) && !/^[0-9a-fA-F]{12,}$/i.test(clean)) {
        return clean;
      }
    }

    // 2. Fall back to clean Bluetooth device name (strip trailing raw MAC addresses if present)
    if (this.device && this.device.name && this.device.name.trim() !== '') {
      let devName = this.device.name.trim();
      if (devName.includes(':')) {
        devName = devName.split(':')[0].trim();
      }
      if (/^MeshCore-[0-9a-fA-F]{8,}$/i.test(devName) || /^[0-9a-fA-F]{12,}$/i.test(devName)) {
        devName = "MeshCore Companion";
      }
      if (devName.length > 0) {
        return devName;
      }
    }

    // 3. Fallback (exact WardriveService.kt line 808)
    return "MeshCore Companion";
  }

  updateStatus(msg, isOnline = false) {
    if (this.onStatusChanged) {
      this.onStatusChanged(msg, isOnline);
    }
  }
}

window.MeshcoreBleManager = MeshcoreBleManager;
