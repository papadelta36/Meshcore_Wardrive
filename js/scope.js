/**
 * MeshCore Scope Engine for Web App
 * Handles Region Scopes (#be, #nl, #vlaanderen, etc.), SHA-256 scope keys, and HMAC-SHA256 transport codes.
 * Optimized with CryptoKey caching and parallel WebCrypto thread execution for ultra-fast scope detection.
 */

const MeshCoreScope = {
  learnedScopes: new Set([
    // Core & Common Scopes
    "#be", "#nl", "#public", "#test", "#mesh", "#general", "#chat", "#emergency", "#wardrive",
    // Flemish & Belgian Provinces / Regions
    "#vlaanderen", "#antwerpen", "#limburg", "#oost-vlaanderen", "#west-vlaanderen", "#vlaams-brabant",
    "#brussel", "#bruxelles", "#brussels", "#wallonie", "#luik", "#liege", "#henegouwen", "#namen", "#namur", "#luxemburg",
    // Netherlands Provinces & Regions
    "#noord-holland", "#zuid-holland", "#zeeland", "#noord-brabant", "#brabant", "#utrecht", "#gelderland",
    "#overijssel", "#drenthe", "#friesland", "#groningen", "#flevoland",
    // Major Cities & Areas
    "#gent", "#brugge", "#leuven", "#hasselt", "#mechelen", "#kortrijk", "#aalst", "#sint-niklaas",
    "#amsterdam", "#rotterdam", "#denhaag", "#utrecht-stad", "#eindhoven", "#tilburg", "#breda", "#nijmegen", "#arnhem", "#maastricht",
    // Germany & Neighboring Regions
    "#de", "#nrw", "#aachen", "#koeln", "#duesseldorf", "#fr"
  ]),
  keyCache: new Map(),
  hmacKeyCache: new Map(),

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

  async getHmacCryptoKey(scopeName) {
    const normalized = this.normalize(scopeName);
    if (this.hmacKeyCache.has(normalized)) {
      return this.hmacKeyCache.get(normalized);
    }

    const scopeKey = await this.calculateKey(normalized);
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        scopeKey,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      this.hmacKeyCache.set(normalized, key);
      return key;
    } catch (e) {
      return null;
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

    const msg = new Uint8Array(1 + rawPayload.length);
    msg[0] = packet.payloadType & 0xFF;
    msg.set(rawPayload, 1);

    const scopes = Array.from(this.learnedScopes);

    // Parallel HMAC evaluation across browser WebCrypto threads
    const checks = scopes.map(async (scopeName) => {
      try {
        const hmacKey = await this.getHmacCryptoKey(scopeName);
        if (!hmacKey) return null;

        const sigBuffer = await crypto.subtle.sign("HMAC", hmacKey, msg);
        const sig = new Uint8Array(sigBuffer);

        let code = (sig[0] & 0xFF) | ((sig[1] & 0xFF) << 8);
        if (code === 0x0000) code = 0x0001;
        if (code === 0xFFFF) code = 0xFFFE;

        return code === receivedCode ? scopeName : null;
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(checks);
    const matchedScope = results.find(s => s !== null);

    if (matchedScope) {
      if (matchedScope.startsWith('#')) {
        this.addLearnedScope(matchedScope);
      }
      return matchedScope;
    }

    return `ID: 0x${receivedCode.toString(16).padStart(4, '0').toUpperCase()}`;
  }
};

MeshCoreScope.init();
window.MeshCoreScope = MeshCoreScope;
