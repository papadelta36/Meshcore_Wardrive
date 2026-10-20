/**
 * MeshCore Scope Engine for Web App
 * Handles Region Scopes (#be, #nl, #vlaanderen, etc.), SHA-256 scope keys, and HMAC-SHA256 transport codes.
 */

const MeshCoreScope = {
  learnedScopes: new Set(["#be", "#nl", "#test", "#mesh", "#vlaanderen", "#antwerpen", "#limburg"]),
  keyCache: new Map(),

  init() {
    const saved = localStorage.getItem("meshcore_learned_scopes");
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        arr.forEach(s => this.learnedScopes.add(s));
      } catch (e) {}
    }
  },

  normalize(name) {
    if (!name) return "";
    let n = name.trim().toLowerCase();
    if (n === "" || n === "*") return n;
    if (!n.startsWith("#")) {
      n = "#" + n;
    }
    return n;
  },

  addLearnedScope(name) {
    const normalized = this.normalize(name);
    if (!normalized || normalized === "*") return;
    if (!this.learnedScopes.has(normalized)) {
      this.learnedScopes.add(normalized);
      localStorage.setItem("meshcore_learned_scopes", JSON.stringify(Array.from(this.learnedScopes)));
    }
  },

  async calculateKey(scopeName) {
    const normalized = this.normalize(scopeName);
    if (!normalized || normalized === "*") {
      return new Uint8Array(16); // 16 zero bytes for unscoped
    }

    if (this.keyCache.has(normalized)) {
      return this.keyCache.get(normalized);
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(normalized);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const key = new Uint8Array(hashBuffer, 0, 16);
      this.keyCache.set(normalized, key);
      return key;
    } catch (e) {
      return new Uint8Array(16);
    }
  },

  async calculateTransportCode(scopeKey, payloadType, payload) {
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        scopeKey,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const msg = new Uint8Array(1 + payload.length);
      msg[0] = payloadType & 0xFF;
      msg.set(payload, 1);

      const sigBuffer = await crypto.subtle.sign("HMAC", key, msg);
      const sig = new Uint8Array(sigBuffer);

      let code = (sig[0] & 0xFF) | ((sig[1] & 0xFF) << 8);

      if (code === 0x0000) code = 0x0001;
      if (code === 0xFFFF) code = 0xFFFE;

      return code;
    } catch (e) {
      return 0;
    }
  },

  async detectScope(packet) {
    if (!packet) return null;
    if (packet.routeType === 1) return "Global"; // Standard Flood is Unscoped
    if (packet.routeType !== 0) return null; // Not a flood packet

    if (!packet.transportCodes || packet.transportCodes.length < 2) return null;

    const receivedCode = (packet.transportCodes[0] & 0xFF) | ((packet.transportCodes[1] & 0xFF) << 8);
    const rawPayload = packet.payload ? (packet.payload.rawPayload || new Uint8Array(0)) : new Uint8Array(0);

    const scopes = Array.from(this.learnedScopes);
    for (const scopeName of scopes) {
      const key = await this.calculateKey(scopeName);
      const code = await this.calculateTransportCode(key, packet.payloadType, rawPayload);
      if (code === receivedCode) {
        return scopeName;
      }
    }

    return `ID: 0x${receivedCode.toString(16).padStart(4, '0').toUpperCase()}`;
  }
};

MeshCoreScope.init();
window.MeshCoreScope = MeshCoreScope;
