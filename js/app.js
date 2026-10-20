// --- Global Repositories & State ---
// Official MeshCore Default Public Channel PSK (Hex: 8b3387e9c5cdea6ac9e5edbaa115cd72)
const DEFAULT_PUBLIC_PSK = new Uint8Array([0x8b, 0x33, 0x87, 0xe9, 0xc5, 0xcd, 0xea, 0x6a, 0xc9, 0xe5, 0xed, 0xba, 0xa1, 0x15, 0xcd, 0x72]);

let syncedChannels = [
  { index: 0, name: "Public", psk: DEFAULT_PUBLIC_PSK, scope: null, isVisible: true },
  { index: 1, name: "Regio BE", psk: DEFAULT_PUBLIC_PSK, scope: "#be", isVisible: true },
  { index: 2, name: "Emergency NL", psk: DEFAULT_PUBLIC_PSK, scope: "#nl", isVisible: true },
  { index: 3, name: "Vlaanderen", psk: DEFAULT_PUBLIC_PSK, scope: "#vlaanderen", isVisible: true }
];
window.clearSyncedChannels = () => { syncedChannels.length = 0; };

let activeChannelIndex = 0;
let activeDirectNodeId = null;
let activeDirectNodeName = null;

// --- Global Fullscreen Toggle Function ---
window.toggleAppFullscreen = () => {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
    }
  }
};

// --- Webserver Offline Safety Guard & Hard Reset Manager ---
let isWebserverReachable = true;

window.setHardResetButtonState = (isOnline, titleText) => {
  isWebserverReachable = isOnline;
  const btn = document.getElementById('btnHardReset');
  if (!btn) return;

  btn.title = titleText || (isOnline ? "⚡ Force Reload Latest Version" : "⚠️ Offline Mode: Hard Reset is disabled");
  if (isOnline) {
    btn.style.opacity = "1.0";
    btn.style.cursor = "pointer";
    btn.style.filter = "none";
  } else {
    btn.style.opacity = "0.35";
    btn.style.cursor = "not-allowed";
    btn.style.filter = "grayscale(100%)";
  }
};

window.checkWebserverConnectivity = async () => {
  if (!navigator.onLine) {
    window.setHardResetButtonState(false, "⚠️ Offline Mode: Hard Reset is disabled to protect offline cache.");
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('./index.html?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);

    if (response && (response.ok || response.status === 200 || response.status === 304)) {
      window.setHardResetButtonState(true, "⚡ Force Reload Latest Version");
      return true;
    } else {
      window.setHardResetButtonState(false, "⚠️ Webserver unreachable: Hard Reset disabled to protect offline cache.");
      return false;
    }
  } catch (e) {
    window.setHardResetButtonState(false, "⚠️ Offline Mode: Hard Reset is disabled to protect offline cache.");
    return false;
  }
};

window.hardResetAppCache = async () => {
  // Offline Safety Check
  const online = await window.checkWebserverConnectivity();
  if (!online) {
    alert("⚠️ Hard Reset Geblokkeerd!\n\nJe bent momenteel OFFLINE of de webserver is niet bereikbaar.\n\nDe reset-knop is uitgeschakeld om te voorkomen dat je offline PWA-cache en gegevens verloren gaan.");
    return;
  }

  if (confirm("⚠️ CAUTION: Force Reload & Reset App Cache?\n\nThis will clear cached app files and reload the latest version from the webserver.")) {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) await caches.delete(k);
      }
    } catch(e) {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.pathname + '?v=' + Date.now();
  }
};

// --- PWA Installation Event Handling ---
let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  console.log('[PWA] App is ready for installation.');
});

window.installPwaApp = async () => {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    console.log(`[PWA] Install prompt choice: ${outcome}`);
    deferredPwaPrompt = null;
  } else {
    alert("To install this app as a standalone offline PWA:\n\n- Android / Chrome: Tap menu ⋮ -> 'Install app' or 'Add to Home screen'\n- iPhone / iPad (iOS): Open in Safari/Bluefy, tap Share ⎋ -> 'Add to Home Screen'\n- Desktop (Chrome/Edge): Click Install icon ⊕ in address bar");
  }
};

// --- Global UI Modal Functions ---
window.openSystemHub = () => {
  if (typeof window.refreshSystemHubChannelsList === 'function') {
    window.refreshSystemHubChannelsList();
  }
  const el = document.getElementById('modalSettings');
  if (el) el.classList.add('active');
};
window.closeSystemHub = () => {
  const el = document.getElementById('modalSettings');
  if (el) el.classList.remove('active');
};
window.openFilterHub = () => {
  const el = document.getElementById('modalFilters');
  if (el) el.classList.add('active');
};
window.closeFilterHub = () => {
  const el = document.getElementById('modalFilters');
  if (el) el.classList.remove('active');
};
window.openTripsManager = () => {
  if (typeof window.renderSavedTrips === 'function') {
    window.renderSavedTrips();
  }
  const el = document.getElementById('modalTrips');
  if (el) el.classList.add('active');
};
window.closeTripsManager = () => {
  const el = document.getElementById('modalTrips');
  if (el) el.classList.remove('active');
};
window.closeSignalDetails = () => {
  const el = document.getElementById('modalDetails');
  if (el) el.classList.remove('active');
};
window.openHelpInfoModal = () => {
  const el = document.getElementById('modalHelpInfo');
  if (el) el.classList.add('active');
};
window.closeHelpInfoModal = () => {
  const el = document.getElementById('modalHelpInfo');
  if (el) el.classList.remove('active');
};
window.openChannelPickerModal = () => {
  if (typeof window.populateChannelPickerList === 'function') {
    window.populateChannelPickerList();
  }
  const el = document.getElementById('modalChannelPicker');
  if (el) el.classList.add('active');
};
window.closeChannelPickerModal = () => {
  const el = document.getElementById('modalChannelPicker');
  if (el) el.classList.remove('active');
};
window.openMessengerSettingsModal = () => {
  if (typeof window.refreshMessengerChannelsList === 'function') {
    window.refreshMessengerChannelsList();
  }
  const chk = document.getElementById('chkDrivingModeManual');
  if (chk) chk.checked = isManualHighAccessibilityMode;
  const chkSound = document.getElementById('chkMessengerSound');
  if (chkSound) chkSound.checked = isMessengerSoundEnabled;
  const el = document.getElementById('modalMessengerSettings');
  if (el) el.classList.add('active');
};
window.closeMessengerSettingsModal = () => {
  const el = document.getElementById('modalMessengerSettings');
  if (el) el.classList.remove('active');
};
window.openChannelVisibilityModal = () => {
  if (typeof window.populateChannelVisibilityModal === 'function') {
    window.populateChannelVisibilityModal();
  }
  const el = document.getElementById('modalChannelVisibility');
  if (el) el.classList.add('active');
};
window.closeChannelVisibilityModal = () => {
  const el = document.getElementById('modalChannelVisibility');
  if (el) el.classList.remove('active');
};
window.openAutoReplyModal = () => {
  const el = document.getElementById('modalAutoReply');
  if (el) el.classList.add('active');
};
window.closeAutoReplyModal = () => {
  const el = document.getElementById('modalAutoReply');
  if (el) el.classList.remove('active');
};
window.openQuickRepliesModal = () => {
  if (typeof window.populateQuickRepliesInput === 'function') {
    window.populateQuickRepliesInput();
  }
  const el = document.getElementById('modalQuickReplies');
  if (el) el.classList.add('active');
};
window.closeQuickRepliesModal = () => {
  const el = document.getElementById('modalQuickReplies');
  if (el) el.classList.remove('active');
};
window.openEditScopeModal = () => {
  if (typeof window.populateScopeEditInput === 'function') {
    window.populateScopeEditInput();
  }
  const el = document.getElementById('modalEditScope');
  if (el) el.classList.add('active');
};
window.openEditScopeForChannel = (chIndex) => {
  window.editingScopeChannelIdx = chIndex;
  const ch = syncedChannels.find(c => c.index === chIndex);
  const input = document.getElementById('txtScopeName');
  if (input) {
    input.value = (ch && ch.scope) ? ch.scope : '';
  }
  const modalHeader = document.querySelector('#modalEditScope .modal-header h2');
  if (modalHeader && ch) {
    modalHeader.innerText = `🌐 Edit Region Scope (CH${ch.index}: ${ch.name})`;
  }
  const el = document.getElementById('modalEditScope');
  if (el) el.classList.add('active');
};
window.closeEditScopeModal = () => {
  const el = document.getElementById('modalEditScope');
  if (el) el.classList.remove('active');
};

// --- App Main State & Setup ---
  // Canvases & Renderers
  let radarCanvas = null;
  let radarCanvasFull = null;
  let compassCanvas = null;
  let vuRssiMeter = null;
  let vuSnrMeter = null;
  let signalGraphRenderer = null;
  let signalDistanceGraphRenderer = null;

  // MapLibre GL Map & Overlay Markers
  let map = null;
  let activePopup = null;
  let selectedNodeId = null;
  let selectedLogPositionKey = null;
  let carMarker = null;
  let signalMarkers = [];
  let repeaterMarkers = [];
  let trilaterationMarkers = [];
  let trajectoryMarkers = [];
  let rangeSpotlightMarkers = [];
  let wardriveTrackPoints = []; // Array of [lng, lat]

  // State Variables
  let bleManager = new MeshcoreBleManager();
  window.bleManager = bleManager; // Expose globally for inline HTML onclick calls
  let activeNavTab = 'map';
  let isWardriveActive = false;
  let isFollowingGps = false;
  let isProgrammaticPan = false;
  let isHeatmapVisible = false;
  let isRepeatersVisible = false;
  let isMapDarkMode = false;
  let bestSeenFilterMode = 0; // 0 = Best Seen SNR, 1 = All Received Time
  let nodeListFilterMode = 0; // 0 = All Contacts, 1 = Users (👤), 2 = Repeaters (📡)
  let showRepeaterNameInsteadOfId = true; // Toggle Short ID vs Repeater Name (Default to Node Name)
  let lastReceivedSignal = null;
  let currentAnalysisMode = 'trip'; // 'trip' vs 'global'
  let messageOverlayTimeout = null;

  window.toggleAppFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
      showToastMessage("📱 Fullscreen Mode Activated");
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      showToastMessage("📱 Fullscreen Mode Exited");
    }
  };

  // Data Repositories
  let allReceivedLogs = [];
  let bestSeenMap = new Map(); // nodeId -> SignalItem
  let locatedNodes = new Map(); // pubKey or shortId -> LocatedNode
  let mapSignalPoints = [];
  let sessionMessageHistory = []; // All chat messages (Incoming & Outgoing)
  let unreadCounts = new Map(); // targetKey -> count

  function loadUnreadCountsFromStorage() {
    try {
      const raw = localStorage.getItem('meshcore_unread_counts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          unreadCounts = new Map(parsed);
        }
      }
    } catch (e) {
      console.warn("Unread counts load notice:", e);
    }
  }

  function saveUnreadCountsToStorage() {
    try {
      const arr = Array.from(unreadCounts.entries());
      localStorage.setItem('meshcore_unread_counts', JSON.stringify(arr));
    } catch (e) {
      console.warn("Unread counts save notice:", e);
    }
  }
  window.saveUnreadCountsToStorage = saveUnreadCountsToStorage;
  let recentRfLogsByText = new Map(); // cleanText -> HeardPath
  let recentRfLogsByTimestamp = new Map(); // ts/hash -> HeardPath
  let recentRfLogsRawByText = new Map(); // cleanText -> rawHex (0x88)
  let recentRfLogsRawByTimestamp = new Map(); // ts/hash -> rawHex (0x88)

  function putAndTrimMap(map, key, val, maxSize = 50) {
    if (!key) return;
    map.set(key, val);
    if (map.size > maxSize) {
      const firstKey = map.keys().next().value;
      map.delete(firstKey);
    }
  }

  // GPS & Timer State
  let userLocation = null; // { lat, lng }
  let lastGpsPosition = null;
  let totalDistanceKm = 0;
  let sessionStartTime = Date.now();
  let lastSignalTime = 0;
  let sharedAudioCtx = null;

  // Auto-Discover State
  let autoDiscoverTimeSec = 0;
  let autoDiscoverDistMeters = 0;

  // Filters State
  let filters = {
    targetIds: [],
    idLength: 0,
    trafficType: 0,
    zeroHopOnly: false
  };

  // --- Touch & Click Helper for Tap vs Long-Press ---
  function addTouchAndClickListener(element, onClick, onLongClick) {
    if (!element) return;
    let touchTimer = null;
    let isLongPress = false;

    element.oncontextmenu = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      if (onLongClick) onLongClick(e);
      return false;
    };

    element.onclick = (e) => {
      if (isLongPress) {
        isLongPress = false;
        return;
      }
      if (onClick) onClick(e);
    };

    element.ontouchstart = () => {
      isLongPress = false;
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        isLongPress = true;
      }, 500);
    };

    element.ontouchend = () => {
      if (touchTimer) clearTimeout(touchTimer);
    };

    element.ontouchcancel = () => {
      if (touchTimer) clearTimeout(touchTimer);
    };
  }

  // --- Data Persistence Helpers (localStorage) ---
  function savePersistedData() {
    try {
      if (locatedNodes) {
        const nodesArray = Array.from(locatedNodes.entries());
        localStorage.setItem('meshcore_located_nodes', JSON.stringify(nodesArray));
      }
      if (sessionMessageHistory) {
        const msgsToSave = sessionMessageHistory.slice(-100);
        localStorage.setItem('meshcore_message_history', JSON.stringify(msgsToSave));
      }
    } catch (e) {
      console.error("Error saving persisted data to localStorage:", e);
    }
  }

  function loadPersistedData() {
    try {
      const rawNodes = localStorage.getItem('meshcore_located_nodes');
      if (rawNodes) {
        const parsedArray = JSON.parse(rawNodes);
        if (Array.isArray(parsedArray)) {
          locatedNodes.clear();
          parsedArray.forEach(([key, val]) => {
            locatedNodes.set(key, val);
          });
          console.log(`Restored ${locatedNodes.size} contacts from localStorage.`);
        }
      }

      const rawMsgs = localStorage.getItem('meshcore_message_history');
      if (rawMsgs) {
        const parsedMsgs = JSON.parse(rawMsgs);
        if (Array.isArray(parsedMsgs)) {
          sessionMessageHistory = parsedMsgs;
          console.log(`Restored ${sessionMessageHistory.length} messages from localStorage.`);
        }
      }

      loadUnreadCountsFromStorage();
      updateMessengerUnreadBadge();
    } catch (e) {
      console.error("Error loading persisted data from localStorage:", e);
    }
  }
  window.savePersistedData = savePersistedData;

  window.addEventListener('beforeunload', () => {
    savePersistedData();
  });

  // --- Initialize Components on DOMContentLoaded ---
  document.addEventListener("DOMContentLoaded", () => {
    try { loadPersistedData(); } catch (e) { console.error("Persistence load notice:", e); }
    try { initCanvases(); } catch (e) { console.error("Error initializing Canvases:", e); }
    try { initMap(); } catch (e) { console.error("Error initializing Map:", e); }
    try { initGpsTracking(); } catch (e) { console.warn("GPS Tracking notice:", e); }
    try { startDurationTimer(); } catch (e) { console.warn("Timer notice:", e); }
    try { startSignalTimeoutWatcher(); } catch (e) { console.error("Timeout watcher notice:", e); }
    try { initBleManager(); } catch (e) { console.error("BLE init notice:", e); }
    try { initAutoDiscover(); } catch (e) { console.error("Auto Discover notice:", e); }
    try {
      updateMessengerHeaderSelect();
      refreshMessengerHeaderTitle();
      refreshChatMessageHistory();
      updateUILists();
      if (typeof refreshRepeaterMarkersLayer === 'function') refreshRepeaterMarkersLayer();
    } catch (e) { console.error("Messenger init notice:", e); }
  });

  // --- Non-blocking Toast Notification Helper ---
  function showToastMessage(msg, durationMs = 2500) {
    let toast = document.getElementById('appToastMessage');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToastMessage';
      toast.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.95);
        color: #00FF00;
        border: 1px solid #4CAF50;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: bold;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        pointer-events: none;
        transition: opacity 0.3s;
        text-align: center;
        max-width: 90%;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    toast.style.display = 'block';

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, durationMs);
  }
  window.showToastMessage = showToastMessage;

  function sendDiscoverRepeaterCommand() {
    if (bleManager && bleManager.isConnected) {
      console.log("Sending Discover Repeater command to BLE device...");
      bleManager.sendDiscoverRepeaterCommand();
    } else {
      console.warn("Discover Repeater triggered while BLE disconnected.");
      showToastMessage("⚠️ BLE Disconnected - Connect BLE in System Hub!");
    }
  }

  function triggerManualDiscovery() {
    console.log("Manual Discovery triggered via Radar tap...");
    sendDiscoverRepeaterCommand();

    // Visual feedback: turn radar beam/grid RED for 2s (exact MainActivity.kt line 5239)
    if (radarCanvas) radarCanvas.isDiscovering = true;
    if (radarCanvasFull) radarCanvasFull.isDiscovering = true;

    setTimeout(() => {
      if (radarCanvas) radarCanvas.isDiscovering = false;
      if (radarCanvasFull) radarCanvasFull.isDiscovering = false;
    }, 2000);
  }
  window.triggerManualDiscovery = triggerManualDiscovery;

  function attachRadarTapListeners(element) {
    if (!element) return;
    let lastTap = 0;

    const handleTap = (e) => {
      const idText = document.getElementById('tvRepeaterId');
      if (idText && idText.style.display !== 'none' && (e.target === idText || idText.contains(e.target))) {
        return false;
      }

      const now = Date.now();
      if (now - lastTap < 300) return true;
      lastTap = now;

      triggerManualDiscovery();
      return true;
    };

    element.addEventListener('click', (e) => {
      const idText = document.getElementById('tvRepeaterId');
      if (idText && idText.style.display !== 'none' && (e.target === idText || idText.contains(e.target))) {
        return;
      }
      handleTap(e);
    });

    element.addEventListener('touchend', (e) => {
      const idText = document.getElementById('tvRepeaterId');
      if (idText && idText.style.display !== 'none' && (e.target === idText || idText.contains(e.target))) {
        return;
      }
      e.preventDefault();
      handleTap(e);
    });
  }

  function initCanvases() {
    radarCanvas = new RadarCanvas('canvasRadar');
    radarCanvas.start();

    attachRadarTapListeners(document.getElementById('canvasRadar'));
    attachRadarTapListeners(document.querySelector('.radar-container'));

    radarCanvasFull = new RadarCanvas('canvasRadarFull');
    attachRadarTapListeners(document.getElementById('canvasRadarFull'));

    compassCanvas = new CompassCanvas('canvasCompass');

    vuRssiMeter = new SegmentedVuMeter('vuRssiSegmented', true);
    vuSnrMeter = new SegmentedVuMeter('vuSnrSegmented', false);

    signalGraphRenderer = new SignalGraphRenderer('canvasSignalGraph');
    signalDistanceGraphRenderer = new SignalDistanceGraphRenderer('canvasSignalDistanceGraph');

    // Draw CRT Grid Background Canvas
    const gridCanvas = document.getElementById('canvasGridBg');
    if (gridCanvas && gridCanvas.parentElement) {
      const rect = gridCanvas.parentElement.getBoundingClientRect();
      gridCanvas.width = rect.width || 300;
      gridCanvas.height = rect.height || 120;
      const ctx = gridCanvas.getContext('2d');
      ctx.strokeStyle = "rgba(0, 255, 0, 0.11)";
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x < gridCanvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, gridCanvas.height); ctx.stroke();
      }
      for (let y = 0; y < gridCanvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(gridCanvas.width, y); ctx.stroke();
      }
    }
  }

  // --- Map Engine Initialization (Pure MapLibre GL JS GPU Engine) ---
  function getMapStyleDefinition(sourceKey) {
    if (sourceKey === 'ofm-dark') return 'https://tiles.openfreemap.org/styles/dark';
    if (sourceKey === 'ofm-liberty') return 'https://tiles.openfreemap.org/styles/liberty';
    if (sourceKey === 'esri-dark') {
      return {
        version: 8,
        sources: {
          'esri-dark-tiles': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri Dark Gray Canvas'
          }
        },
        layers: [{ id: 'esri-dark-layer', type: 'raster', source: 'esri-dark-tiles', minzoom: 0, maxzoom: 19 }]
      };
    }
    // esri-light or fallback
    return {
      version: 8,
      sources: {
        'esri-light-tiles': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri World Street Map'
        }
      },
      layers: [{ id: 'esri-light-layer', type: 'raster', source: 'esri-light-tiles', minzoom: 0, maxzoom: 19 }]
    };
  }

  function initMapSourcesAndLayers() {
    if (!map) return;

    // 1. Wardrive Track Line Source & Layer
    if (!map.getSource('wardrive-track-src')) {
      map.addSource('wardrive-track-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'wardrive-track-layer',
        type: 'line',
        source: 'wardrive-track-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#4CAF50', 'line-width': 4, 'line-opacity': 0.9 }
      });
    }

    // 2. Heatmap GeoJSON Source & Layer (Pure WebGL GPU Heatmap)
    if (!map.getSource('heatmap-src')) {
      map.addSource('heatmap-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap-src',
        maxzoom: 17,
        layout: { visibility: isHeatmapVisible ? 'visible' : 'none' },
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#9C27B0',
            0.4, '#F44336',
            0.6, '#FF9800',
            0.8, '#FFEB3B',
            1.0, '#00E676'
          ],
          'heatmap-radius': 32,
          'heatmap-opacity': 0.8
        }
      });
    }

    // 3. Deep Dive Trajectory Line Source & Layer
    if (!map.getSource('trajectory-src')) {
      map.addSource('trajectory-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'trajectory-layer',
        type: 'line',
        source: 'trajectory-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00E5FF', 'line-width': 4, 'line-opacity': 0.95 }
      });
    }

    // 4. Range Spotlight Circle / Line Source & Layers
    if (!map.getSource('range-spotlight-src')) {
      map.addSource('range-spotlight-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      // Dashed Red Range Boundary Line
      map.addLayer({
        id: 'range-circle-layer',
        type: 'line',
        source: 'range-spotlight-src',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'line-color': '#FF1744', 'line-width': 3, 'line-dasharray': [2, 2] }
      });
      // Transmission Line in SNR color
      map.addLayer({
        id: 'range-line-layer',
        type: 'line',
        source: 'range-spotlight-src',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': ['coalesce', ['get', 'color'], '#00E676'], 'line-width': 4 }
      });
    }

    // 5. Trilateration Circle Source & Layers
    if (!map.getSource('trilateration-src')) {
      map.addSource('trilateration-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'trilateration-fill-layer',
        type: 'fill',
        source: 'trilateration-src',
        paint: { 'fill-color': '#FF0055', 'fill-opacity': 0.25 }
      });
      map.addLayer({
        id: 'trilateration-line-layer',
        type: 'line',
        source: 'trilateration-src',
        paint: { 'line-color': '#FF0055', 'line-width': 2 }
      });
    }
  }

  function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl || typeof maplibregl === 'undefined') return;

    const savedSource = localStorage.getItem('selected_map_source') || 'ofm-liberty';
    const selMap = document.getElementById('selMapSource');
    if (selMap) selMap.value = savedSource;

    const styleDef = getMapStyleDefinition(savedSource);

    map = new maplibregl.Map({
      container: 'map',
      style: styleDef,
      center: [4.3517, 50.8503], // [lng, lat]
      zoom: 13,
      bearing: 0,
      pitch: 0,
      dragRotate: false,        // Disables right-click / ctrl-drag rotation
      touchPitch: false,         // Disables 2-finger pitch tilt
      attributionControl: true
    });

    map.doubleClickZoom.disable();
    if (map.touchZoomRotate) {
      map.touchZoomRotate.disableRotation(); // Disables 2-finger touch gesture rotation
    }

    const onUserPhysicalMapTouch = (e) => {
      if (isProgrammaticPan) return;
      if (e && e.originalEvent && !e.originalEvent.isTrusted) return;
      const target = (e && e.originalEvent && e.originalEvent.target) ? e.originalEvent.target : (e ? e.target : null);
      if (target && target.closest && target.closest('.map-btn')) return;

      if (isFollowingGps) {
        console.log("[GPS] Human physical map interaction -> Turning OFF GPS Follow Mode!");
        isFollowingGps = false;
        updateRecenterButtonUI();
      }
    };
    window.onUserPhysicalMapTouch = onUserPhysicalMapTouch;

    map.on('dragstart', onUserPhysicalMapTouch);
    map.on('touchstart', onUserPhysicalMapTouch);
    map.on('moveend', () => {
      // Only force North-Up during MANUAL mode (when NOT following GPS/driving)
      if (!isFollowingGps && map && map.getBearing() !== 0) {
        map.setBearing(0);
      }
    });

    map.on('load', () => {
      initMapSourcesAndLayers();
      refreshRepeaterMarkersLayer();
      updateMapSignalMarkers();
      if (savedSource === 'ofm-dark') {
        applyTacticalHighContrastRoads(map);
      }
    });

    map.on('zoomend', () => {
      if (isRepeatersVisible) {
        refreshRepeaterMarkersLayer();
      }
      try { updateMapSignalMarkers(); } catch (e) {}
    });

    map.on('click', (e) => {
      const origEvt = e ? e.originalEvent : null;
      if (origEvt && origEvt.defaultPrevented) return;
      const target = origEvt ? origEvt.target : null;
      if (target && target.closest && (
        target.closest('.map-btn') ||
        target.closest('.maplibregl-marker') ||
        target.closest('.maplibregl-popup') ||
        target.closest('.repeater-icon') ||
        target.closest('.rx-point-marker')
      )) {
        return;
      }

      // Tapping on empty map canvas clears all active temporary overlays (balloon popups, red highlight rings, contact pulse, trajectory lines)
      if (activePopup) {
        try { activePopup.remove(); } catch (err) {}
        activePopup = null;
      }
      selectedNodeId = null;
      selectedLogPositionKey = null;

      clearTemporaryMarkers();
      try { updateMapSignalMarkers(); } catch (err) {}
    });

    updateMapThemeButtonVisibility(savedSource);
    triggerMapResize();
  }

  let activeMapSource = 'ofm-liberty';

  function updateMapThemeButtonVisibility(sourceKey) {
    const btnMapTheme = document.getElementById('btnMapTheme');
    if (!btnMapTheme) return;

    const hasThemePair = (
      sourceKey === 'ofm-liberty' || sourceKey === 'ofm-dark' ||
      sourceKey === 'esri-light' || sourceKey === 'esri-dark' ||
      sourceKey === 'carto-voyager' || sourceKey === 'carto-dark'
    );

    btnMapTheme.style.display = hasThemePair ? 'flex' : 'none';

    if (hasThemePair) {
      const isDark = (sourceKey === 'ofm-dark' || sourceKey === 'esri-dark' || sourceKey === 'carto-dark');
      btnMapTheme.innerText = isDark ? '🌙' : '☀️';
    }
  }

  function triggerMapResize() {
    if (map) {
      try { map.resize(); } catch (e) {}
    }
  }

  function applyTacticalHighContrastRoads(glMap) {
    if (!glMap || typeof glMap.setPaintProperty !== 'function') return;

    const setPaint = (id, prop, val) => {
      try {
        if (glMap.getLayer(id)) {
          glMap.setPaintProperty(id, prop, val);
        }
      } catch (e) {}
    };

    setPaint('highway_motorway_inner', 'line-color', '#38bdf8');
    setPaint('highway_motorway_casing', 'line-color', '#0284c7');
    setPaint('highway_motorway_subtle', 'line-color', '#0369a1');

    setPaint('highway_major_inner', 'line-color', '#f1f5f9');
    setPaint('highway_major_casing', 'line-color', '#475569');
    setPaint('highway_major_subtle', 'line-color', '#64748b');

    setPaint('highway_minor', 'line-color', '#64748b');
    setPaint('highway_path', 'line-color', '#475569');

    setPaint('highway_name_other', 'text-color', '#f8fafc');
    setPaint('highway_name_other', 'text-halo-color', '#000000');
    setPaint('highway_name_other', 'text-halo-width', 2);

    setPaint('highway_name_motorway', 'text-color', '#38bdf8');
    setPaint('highway_name_motorway', 'text-halo-color', '#000000');
    setPaint('highway_name_motorway', 'text-halo-width', 2);
  }

  function setMapTileSource(type) {
    if (!type) type = 'ofm-liberty';

    activeMapSource = type;
    localStorage.setItem('selected_map_source', type);

    const mapEl = document.getElementById('map');
    if (mapEl) {
      const isDark = (type === 'ofm-dark' || type === 'esri-dark' || type === 'carto-dark');
      mapEl.classList.toggle('map-dark-theme', isDark);
      mapEl.classList.toggle('map-light-theme', !isDark);
    }

    updateMapThemeButtonVisibility(type);

    if (map) {
      const styleDef = getMapStyleDefinition(type);
      map.setStyle(styleDef);

      map.once('style.load', () => {
        initMapSourcesAndLayers();
        refreshRepeaterMarkersLayer();
        updateMapSignalMarkers();
        if (type === 'ofm-dark') {
          applyTacticalHighContrastRoads(map);
        }
      });
    }

    triggerMapResize();
  }

  // --- Periodic Radar & Auto-Discover Engine (1 Hz) ---
  function initAutoDiscover() {
    setInterval(() => {
      // 1. Live Radar Blips Synchronization Loop (exact MainActivity.kt line 793)
      try { updateRadarBlips(); } catch (e) {}

      // 2. Auto Discover Timer Check
      const cbAuto = document.getElementById('cbAutoDiscover');
      if (!cbAuto || !cbAuto.checked) return;

      autoDiscoverTimeSec++;
      const timeBar = document.getElementById('pbAutoTime');
      if (timeBar) timeBar.style.width = `${(autoDiscoverTimeSec / 60) * 100}%`;

      const distBar = document.getElementById('pbAutoDist');
      if (distBar) distBar.style.width = `${Math.min(100, (autoDiscoverDistMeters / 100) * 100)}%`;

      if (autoDiscoverTimeSec >= 60 && autoDiscoverDistMeters >= 100) {
        autoDiscoverTimeSec = 0;
        autoDiscoverDistMeters = 0;
        triggerAutoDiscoverPing();
      }
    }, 1000);
  }

  function triggerAutoDiscoverPing() {
    console.log("Auto-Discover: Triggering node discover request...");
    sendDiscoverRepeaterCommand();

    if (radarCanvas) radarCanvas.isDiscovering = true;
    if (radarCanvasFull) radarCanvasFull.isDiscovering = true;

    setTimeout(() => {
      if (radarCanvas) radarCanvas.isDiscovering = false;
      if (radarCanvasFull) radarCanvasFull.isDiscovering = false;
    }, 2000);
  }

  // --- Anti-Jitter Filters for Speed & Compass (exact 1:1 match with MainActivity.kt lines 4840-4875) ---
  let smoothedSpeedKmH = 0;
  let smoothedBearing = 0;
  let hasValidBearing = false;
  let lastGpsTime = Date.now();

  // --- Large UI / Driving Mode State (Exact MainActivity.kt lines 1065 & 7768: currentSpeedKmH > 5 || isManualHighAccessibilityMode) ---
  let isManualHighAccessibilityMode = localStorage.getItem('high_accessibility_messenger') === 'true';

  window.updateDrivingModeState = (currentSpeed) => {
    const spd = (currentSpeed !== undefined && currentSpeed !== null) ? currentSpeed : smoothedSpeedKmH;
    const isDriving = (spd > 5) || isManualHighAccessibilityMode;

    const chatContainer = document.getElementById('chatContainer');

    if (chatContainer) {
      if (isDriving) {
        chatContainer.classList.add('driving-mode');
        document.body.classList.add('driving-mode');
      } else {
        chatContainer.classList.remove('driving-mode');
        document.body.classList.remove('driving-mode');
      }
    }

    const chk = document.getElementById('chkDrivingModeManual');
    if (chk) chk.checked = isManualHighAccessibilityMode;
  };

  let isMessengerSoundEnabled = localStorage.getItem('messenger_sound_enabled') !== 'false';

  window.toggleManualDrivingMode = (enabled) => {
    isManualHighAccessibilityMode = !!enabled;
    try {
      localStorage.setItem('high_accessibility_messenger', isManualHighAccessibilityMode ? 'true' : 'false');
    } catch(e) {}
    window.updateDrivingModeState();
  };

  window.toggleMessengerSound = (enabled) => {
    isMessengerSoundEnabled = !!enabled;
    try {
      localStorage.setItem('messenger_sound_enabled', isMessengerSoundEnabled ? 'true' : 'false');
    } catch(e) {}
  };

  function filterSpeed(rawMps, hasSpeed) {
    let rawKmH = 0;
    if (hasSpeed && rawMps !== null && !isNaN(rawMps)) {
      rawKmH = rawMps * 3.6;
    } else if (lastGpsPosition && userLocation && lastGpsTime) {
      const dtSec = (Date.now() - lastGpsTime) / 1000;
      if (dtSec > 0.5) {
        const distKm = calculateDistanceKm(lastGpsPosition.lat, lastGpsPosition.lng, userLocation.lat, userLocation.lng);
        rawKmH = (distKm * 1000 / dtSec) * 3.6;
      }
    }

    // Clamp small speed jitter/drift (<= 3 km/h) to exactly 0 km/h when stationary (exact MainActivity.kt line 4858)
    if (rawKmH <= 3.0) {
      rawKmH = 0;
    }

    // Exponential Moving Average (EMA) Low-Pass Filter
    smoothedSpeedKmH = (smoothedSpeedKmH * 0.70) + (rawKmH * 0.30);
    if (smoothedSpeedKmH <= 2.5) {
      smoothedSpeedKmH = 0;
    }

    return Math.round(smoothedSpeedKmH);
  }

  function filterBearing(rawHeading, distanceMeters) {
    if (rawHeading === null || rawHeading === undefined || isNaN(rawHeading) || rawHeading < 0) {
      return smoothedBearing;
    }

    // Freeze bearing when stationary (distance <= 1.5m and speed <= 3km/h) to prevent compass jitter
    if (distanceMeters !== undefined && distanceMeters <= 1.5 && smoothedSpeedKmH <= 3) {
      return smoothedBearing;
    }

    if (!hasValidBearing) {
      smoothedBearing = rawHeading;
      hasValidBearing = true;
      return smoothedBearing;
    }

    // Shortest-path circular angle difference (-180° to +180°)
    let diff = rawHeading - smoothedBearing;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    // Ignore tiny jitter noise < 2.0°
    if (Math.abs(diff) < 2.0) {
      return smoothedBearing;
    }

    // Smooth low-pass interpolation (alpha = 0.25)
    smoothedBearing = (smoothedBearing + (diff * 0.25) + 360) % 360;
    return smoothedBearing;
  }

  function initDeviceCompassSensor() {
    if (window.DeviceOrientationEvent) {
      const handleOrientation = (e) => {
        let heading = null;
        if (e.webkitCompassHeading !== undefined) {
          heading = e.webkitCompassHeading;
        } else if (e.alpha !== null && e.alpha !== undefined) {
          heading = (360 - e.alpha) % 360;
        }

        if (heading !== null && !isNaN(heading) && smoothedSpeedKmH <= 3) {
          const finalHeading = filterBearing(heading, 0);
          if (compassCanvas) compassCanvas.setBearing(finalHeading);
          const compVal = document.getElementById('tvCompassValue');
          if (compVal) {
            compVal.innerText = `${getCardinalDirection(finalHeading)} ${Math.round(finalHeading)}°`;
          }
        }
      };

      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  let hasInitialGpsJump = false;

  // --- GPS Tracking & Bearing ---
  function initGpsTracking() {
    initDeviceCompassSensor();

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const rawMps = pos.coords.speed;
          const hasSpeed = pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed);
          const rawHeading = pos.coords.heading;

          let distMovedMeters = 0;
          if (lastGpsPosition) {
            distMovedMeters = calculateDistanceKm(lastGpsPosition.lat, lastGpsPosition.lng, lat, lng) * 1000;
          }

          // Apply Anti-Jitter Low-Pass Filter to Speed
          const speedKmH = filterSpeed(rawMps, hasSpeed);

          // Apply Anti-Jitter Shortest-Path Low-Pass Filter to Compass Heading
          let heading = smoothedBearing;
          if (rawHeading !== null && rawHeading !== undefined && !isNaN(rawHeading) && rawHeading >= 0) {
            heading = filterBearing(rawHeading, distMovedMeters);
          } else if (distMovedMeters > 2.0 && lastGpsPosition) {
            const trajHeading = getBearingFromCoords(lastGpsPosition.lat, lastGpsPosition.lng, lat, lng);
            heading = filterBearing(trajHeading, distMovedMeters);
          }

          // Update Speed UI
          const spdEl = document.getElementById('tvSpeedValue');
          if (spdEl) spdEl.innerText = speedKmH;

          // Update Driving Mode / Large UI for Messenger (> 5 km/h)
          if (typeof window.updateDrivingModeState === 'function') {
            window.updateDrivingModeState(speedKmH);
          }

          // Update Compass UI
          if (compassCanvas) compassCanvas.setBearing(heading);
          const compVal = document.getElementById('tvCompassValue');
          if (compVal) {
            const card = getCardinalDirection(heading);
            compVal.innerText = `${card} ${Math.round(heading)}°`;
          }

          // On Start / First GPS Fix: Jump immediately to GPS position!
          if (!hasInitialGpsJump && map) {
            hasInitialGpsJump = true;
            isProgrammaticPan = true;
            map.jumpTo({ center: [lng, lat], zoom: 15 });
            setTimeout(() => { isProgrammaticPan = false; }, 300);
          }

          // Update Distance
          if (lastGpsPosition && isWardriveActive && distMovedMeters > 3.0) {
            const d = distMovedMeters / 1000;
            totalDistanceKm += d;
            autoDiscoverDistMeters += distMovedMeters;
            const distEl = document.getElementById('tvTripDistDashboard');
            if (distEl) distEl.innerText = `${totalDistanceKm.toFixed(2)} km`;
            const distAn = document.getElementById('tvAnalysisTripDist');
            if (distAn) distAn.innerText = `${totalDistanceKm.toFixed(2)} km`;
          }

          lastGpsPosition = { lat, lng };
          userLocation = { lat, lng };
          lastGpsTime = Date.now();

          if (radarCanvas) radarCanvas.isGpsOffline = false;
          if (radarCanvasFull) radarCanvasFull.isGpsOffline = false;
          try { updateRadarBlips(); } catch (e) {}

          // GPS Status
          const gpsStatus = document.getElementById('tvGpsStatus');
          if (gpsStatus) {
            gpsStatus.innerText = `🟢 Speed: ${speedKmH} km/h | GPS Fix`;
            gpsStatus.className = "status-text status-on";
          }

          // Wardrive Trail Polyline (Green line following car GPS position in real-time)
          if (isWardriveActive) {
            if (wardriveTrackPoints.length === 0 || distMovedMeters > 1.0) {
              wardriveTrackPoints.push([lng, lat]);
              updateWardriveTrackLayer();
            }
          }

          updateCarMarker(lat, lng, heading);

          // Follow GPS Position during Wardrive or when Recenter is active
          if (isFollowingGps && map) {
            isProgrammaticPan = true;

            // Freeze rotation if stationary (speed <= 3km/h) to prevent GPS compass jitter
            const targetBearing = (smoothedSpeedKmH <= 3 && hasValidBearing) ? map.getBearing() : heading;

            map.easeTo({
              center: [lng, lat],
              bearing: targetBearing,
              duration: 1000,
              easing: (t) => t
            });

            setTimeout(() => { isProgrammaticPan = false; }, 300);
          }
        },
        (err) => {
          console.warn("GPS Tracking Error:", err.message);
          const gpsStatus = document.getElementById('tvGpsStatus');
          if (gpsStatus) {
            gpsStatus.innerText = `🔴 GPS: ${err.message || 'Offline'}`;
            gpsStatus.className = "status-text status-off";
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    }
  }

  function normalizeLngLat(p) {
    if (!p) return null;
    let lat = 0, lng = 0;

    if (Array.isArray(p)) {
      let v0 = parseFloat(p[0]);
      let v1 = parseFloat(p[1]);
      if (isNaN(v0) || isNaN(v1) || (v0 === 0 && v1 === 0)) return null;
      if (Math.abs(v0) > Math.abs(v1) && Math.abs(v0) > 30) {
        lat = v0;
        lng = v1;
      } else {
        lng = v0;
        lat = v1;
      }
    } else if (typeof p === 'object') {
      lat = parseFloat(p.lat !== undefined ? p.lat : (p.latitude !== undefined ? p.latitude : 0));
      lng = parseFloat(p.lng !== undefined ? p.lng : (p.longitude !== undefined ? p.longitude : (p.lon !== undefined ? p.lon : 0)));
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
      if (Math.abs(lat) < 30 && Math.abs(lng) > 30) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
    }

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

    return [lng, lat]; // ALWAYS returns [lng, lat] for MapLibre GL
  }

  function updateWardriveTrackLayer() {
    if (!map || !map.getSource('wardrive-track-src')) return;
    const normalizedPoints = wardriveTrackPoints
      .map(p => normalizeLngLat(p))
      .filter(p => p !== null);

    const features = [];
    if (normalizedPoints.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: normalizedPoints
        }
      });
    }

    try {
      map.getSource('wardrive-track-src').setData({
        type: 'FeatureCollection',
        features: features
      });
    } catch (e) {
      console.warn("Notice updating track layer:", e);
    }
  }

  function getBearingFromCoords(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  let carAnimationTarget = null;
  let carAnimationStart = null;
  let carAnimationStartTime = null;
  let carAnimationFrame = null;

  function updateCarMarker(targetLat, targetLng, targetHeading) {
    if (!map || typeof maplibregl === 'undefined') return;

    const now = performance.now();

    let startLat = targetLat;
    let startLng = targetLng;
    let startHeading = targetHeading || 0;

    if (carAnimationTarget && carAnimationStart && carAnimationStartTime) {
      const elapsed = Math.min(1000, now - carAnimationStartTime);
      const frac = elapsed / 1000;
      startLat = carAnimationStart.lat + (carAnimationTarget.lat - carAnimationStart.lat) * frac;
      startLng = carAnimationStart.lng + (carAnimationTarget.lng - carAnimationStart.lng) * frac;

      let diff = (carAnimationTarget.heading - carAnimationStart.heading) % 360;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      startHeading = (carAnimationStart.heading + diff * frac + 360) % 360;
    } else if (carMarker) {
      const pos = carMarker.getLngLat();
      startLng = pos.lng;
      startLat = pos.lat;
    }

    carAnimationStart = { lat: startLat, lng: startLng, heading: startHeading };
    carAnimationTarget = { lat: targetLat, lng: targetLng, heading: targetHeading || 0 };
    carAnimationStartTime = now;

    if (carAnimationFrame) {
      cancelAnimationFrame(carAnimationFrame);
    }

    function step(currentTime) {
      const elapsed = currentTime - carAnimationStartTime;
      const frac = Math.min(1.0, elapsed / 1000);

      const curLat = carAnimationStart.lat + (carAnimationTarget.lat - carAnimationStart.lat) * frac;
      const curLng = carAnimationStart.lng + (carAnimationTarget.lng - carAnimationStart.lng) * frac;

      let diff = (carAnimationTarget.heading - carAnimationStart.heading) % 360;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      const curHeading = (carAnimationStart.heading + diff * frac + 360) % 360;

      if (!carMarker) {
        const el = document.createElement('div');
        el.className = 'gps-car-icon';
        el.innerHTML = `<div class="car-marker-container" style="transform: rotate(${curHeading}deg);"><div class="car-arrow-head"></div><div class="car-dot-core"></div></div>`;
        carMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([curLng, curLat])
          .addTo(map);
      } else {
        carMarker.setLngLat([curLng, curLat]);
        const el = carMarker.getElement();
        if (el) {
          const container = el.querySelector('.car-marker-container');
          if (container) {
            container.style.transform = `rotate(${curHeading}deg)`;
          }
        }
      }

      if (frac < 1.0) {
        carAnimationFrame = requestAnimationFrame(step);
      }
    }

    carAnimationFrame = requestAnimationFrame(step);
  }

  function voltageToPercentage(voltage) {
    if (!voltage || voltage <= 0) return 0;
    if (voltage >= 4.2) return 100;
    if (voltage <= 3.3) return 0;
    return Math.min(100, Math.max(0, Math.round(((voltage - 3.3) / (4.2 - 3.3)) * 100)));
  }

  function getBatteryColor(voltage) {
    if (!voltage) return '#00FF00';
    const pct = voltageToPercentage(voltage);
    if (pct < 15 || voltage < 3.4) return '#F44336'; // Red
    if (pct < 40 || voltage < 3.7) return '#FF9800'; // Orange
    return '#00FF00'; // Green
  }

  window.updateBleStatusText = () => {
    const bleStatusEl = document.getElementById('tvBleStatus');
    const modalTextEl = document.getElementById('bleStatusTextModal');
    const modalDetailsEl = document.getElementById('bleDetailsTextModal');
    const btnDisconnectEl = document.getElementById('btnDisconnectBle');

    if (bleManager && bleManager.isConnecting) {
      const connectName = bleManager.getConnectedDeviceName();
      if (bleStatusEl) {
        bleStatusEl.innerHTML = `<span style="color:#FFEB3B;">🟡 Bluetooth: Connecting to <strong>${connectName}</strong>...</span>`;
        bleStatusEl.className = 'status-text status-connecting';
      }
      if (modalTextEl) {
        modalTextEl.innerText = `🟡 Connecting to ${connectName}...`;
        modalTextEl.style.color = '#FFEB3B';
      }
      if (modalDetailsEl) {
        modalDetailsEl.innerText = `Establishing BLE connection with ${connectName}...`;
      }
      if (typeof updateNavItemsVisibility === 'function') updateNavItemsVisibility();
      return;
    }

    if (bleManager && bleManager.isConnected) {
      const nameStr = bleManager.getConnectedDeviceName();
      const voltage = bleManager.connectedBatteryVoltage;
      const rssi = bleManager.connectedRssi;

      let vText = "";
      if (voltage && voltage > 2.0) {
        const pct = voltageToPercentage(voltage);
        vText = ` 🔋 ${pct}% (${voltage.toFixed(2)}V)`;
      }

      let rssiText = "";
      if (rssi !== null && rssi !== undefined) {
        rssiText = ` 📶 ${rssi} dBm`;
      }

      const dot = "🟢";

      if (bleStatusEl) {
        bleStatusEl.innerHTML = `<span style="color:#00FF00;">${dot} Bluetooth: Connected to <strong>${nameStr}</strong></span><span style="color:${getBatteryColor(voltage)};">${vText}</span><span style="color:#00FFC8;">${rssiText}</span>`;
        bleStatusEl.className = 'status-text status-on';
      }

      if (modalTextEl) {
        modalTextEl.innerText = `🟢 Connected to ${nameStr}`;
        modalTextEl.style.color = '#00FF00';
      }

      if (modalDetailsEl) {
        modalDetailsEl.innerText = `Node Name: ${nameStr} | ID: ${bleManager.connectedNodeId || 'Self'}${vText}${rssiText}`;
      }

      if (btnDisconnectEl) {
        btnDisconnectEl.style.display = 'block';
      }
    } else {
      if (bleStatusEl) {
        bleStatusEl.innerHTML = `<span style="color:var(--danger);">🔴 Bluetooth: Disconnected</span>`;
        bleStatusEl.className = 'status-text status-off';
      }

      if (modalTextEl) {
        modalTextEl.innerText = `🔴 Disconnected`;
        modalTextEl.style.color = 'var(--danger)';
      }

      if (modalDetailsEl) {
        modalDetailsEl.innerText = `Click 'Scan & Connect BLE' above to pair with your MeshCore node.`;
      }

      if (btnDisconnectEl) {
        btnDisconnectEl.style.display = 'none';
      }
    }

    if (typeof updateNavItemsVisibility === 'function') updateNavItemsVisibility();
  };

  window.showSyncProgress = (stepName, current = 0, total = 100) => {
    const area = document.getElementById('llSyncArea');
    const statusText = document.getElementById('tvSyncStatus');
    const progressBar = document.getElementById('pbSyncProgress');

    if (!area) return;

    if (stepName === "Complete" || (total > 0 && current >= total && stepName === "Complete")) {
      area.style.display = 'none';
      return;
    }

    area.style.display = 'flex';

    let displayMsg = `Sync: ${stepName}...`;
    if (stepName === "Channels") {
      displayMsg = `Syncing Channels (${current}/${total})...`;
    } else if (stepName === "Contacts") {
      displayMsg = `Syncing Contacts...`;
    } else if (stepName === "Messages") {
      displayMsg = `Syncing Messages...`;
    }

    if (statusText) statusText.innerText = displayMsg;

    if (progressBar) {
      const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;
      progressBar.style.width = `${pct}%`;
    }
  };

  // --- Bluetooth LE Event Listeners ---
  function initBleManager() {
    bleManager.onStatusChanged = (statusMsg, isOnline) => {
      updateBleStatusText();
      if (isOnline) {
        // Auto-close System Hub and jump to main screen when BLE successfully connects!
        setTimeout(() => {
          window.closeSystemHub();
          if (typeof switchNavTab === 'function') {
            switchNavTab('map');
          }
        }, 800);
      }
    };

    bleManager.onSyncProgress = (step, current, total) => {
      showSyncProgress(step, current, total);
    };

    bleManager.onSignalReceived = (rawBytes) => {
      const frame = ProtocolDecoder.decodeCompanionFrame(rawBytes);
      if (!frame) return;

      // 1. SelfInfo Frame (0x05)
      if (frame.type === "SelfInfo") {
        bleManager.connectedNodeId = frame.id;
        if (frame.name) {
          bleManager.connectedNodeName = frame.name;
        }
        console.log(`SelfInfo Received: ID=${frame.id}, Name=${frame.name}`);
        updateBleStatusText();

        // Trigger battery request & channel/contact sync upon identity lock (exact WardriveService.kt line 1366)
        if (!bleManager.isSyncStarted) {
          bleManager.isSyncStarted = true;
          setTimeout(() => {
            bleManager.requestBatteryStatus();
            bleManager.fetchCompanionChannels();
          }, 300);
        }
        return;
      }

      // 2. Battery Status Frame (0x0C = 12)
      if (frame.type === "BatteryStatus") {
        bleManager.connectedBatteryVoltage = frame.voltage;
        console.log(`Battery Status Received: ${frame.voltage.toFixed(2)}V`);
        updateBleStatusText();
        return;
      }

      // 3. Channel Info Frame (0x12 = 18)
      if (frame.type === "ChannelInfo") {
        const idx = frame.index;

        if (!frame.isEmpty) {
          bleManager.emptyChannelSequenceCount = 0;
          const savedScope = localStorage.getItem(`channel_scope_${idx}`);
          const effectiveScope = savedScope !== null ? (savedScope || null) : (frame.scope || null);

          let effectivePsk = frame.psk;
          if (!effectivePsk || effectivePsk.every(b => b === 0)) {
             effectivePsk = DEFAULT_PUBLIC_PSK;
          }

          const existing = syncedChannels.find(c => c.index === idx);
          if (existing) {
            existing.name = frame.name;
            existing.psk = effectivePsk;
            existing.scope = effectiveScope;
          } else {
            syncedChannels.push({
              index: idx,
              name: frame.name,
              psk: effectivePsk,
              scope: effectiveScope,
              isVisible: true
            });
          }
          console.log(`Synced Channel ${idx} from BLE: ${frame.name} (${effectiveScope})`);
        } else {
          bleManager.emptyChannelSequenceCount = (bleManager.emptyChannelSequenceCount || 0) + 1;
        }

        // Exact WardriveService.kt line 1265: If 3 consecutive channels are empty, stop channel sync early!
        if (bleManager.emptyChannelSequenceCount >= 3) {
          console.log(`Detected 3 consecutive empty channels. Stopping channel sync early at index ${idx}.`);
          bleManager.currentSyncChannelIdx = 40; // Force jump to end
        } else {
          bleManager.currentSyncChannelIdx = idx + 1;
        }

        bleManager.requestNextChannelIndex();

        updateMessengerHeaderSelect();
        if (typeof window.populateChannelPickerList === 'function') window.populateChannelPickerList();
        if (typeof window.refreshMessengerHeaderTitle === 'function') window.refreshMessengerHeaderTitle();
        if (typeof window.refreshSystemHubChannelsList === 'function') refreshSystemHubChannelsList();
        return;
      }

      // 4. Companion Contact Sync (0x03 / 0x10 / 0x8A)
      if (frame.type === "CompanionContact") {
        locatedNodes.set(frame.id.toUpperCase(), {
          id: frame.id.toUpperCase(),
          pubKey: frame.pubKey,
          name: frame.name,
          role: frame.role,
          lat: frame.lat,
          lng: frame.lon,
          lastSeen: Date.now()
        });

        if (frame.lat !== 0 && frame.lon !== 0) {
          addRepeaterMarkerToMap(frame.lat, frame.lon, frame.name, frame.id);
        }
        updateUILists();
        savePersistedData();
        return;
      }

      if (frame.type === "ContactsEnd") {
        console.log("Contacts sync finished by radio node. Requesting next queued message over BLE...");
        bleManager.notifyProgress("Messages", 0, 1);
        setTimeout(() => {
          bleManager.syncNextMessage();
        }, 500);
        return;
      }

      if (frame.type === "MessagesWaiting") {
        console.log("Radio node reported messages waiting (0x83). Requesting next message...");
        bleManager.syncNextMessage();
        return;
      }

      if (frame.type === "NoMoreMessages") {
        console.log("Radio node reported no more messages to sync (0x0A). Message sync complete.");
        bleManager.notifyProgress("Complete", 0, 0);
        setTimeout(() => {
          bleManager.requestBatteryStatus();
        }, 800);
        return;
      }

      if (frame.type === "PacketOk") {
        console.log("Radio confirmed PacketOk (0x00)");
        const pending = sessionMessageHistory.filter(m => m.isOutgoing && (!m.statusText || m.statusText.includes("Sending")));
        if (pending.length > 0) {
          const lastMsg = pending[pending.length - 1];
          lastMsg.statusText = "☁️ Sent";
          refreshChatMessageHistory();
        }
        return;
      }

      if (frame.type === "MessageStatus") {
        if (frame.status === 1) {
           const radioHash = frame.radioHash !== undefined ? frame.radioHash : frame.timeout;
           console.log(`Message Sent to Radio (AckTag: ${frame.ackTag}, RadioHash: ${radioHash})`);
           // 1 = Sent to node
           markMessageStatus(frame.ackTag, "☁️ Sent", radioHash);
        } else if (frame.status === 2) {
           console.log(`Message Delivered! (AckTag: ${frame.ackTag})`);
           // 2 = Delivered (ACK returned)
           markMessageStatus(frame.ackTag, "✅ Delivered");
        }
        return;
      }

      // 5. Decrypted Text Message (Companion Protocol 0x10, 0x11, 0x07, 0x08)
      if (frame.type === "Message") {
        const shortSender = (frame.senderId && frame.senderId.length > 8)
          ? frame.senderId.substring(0, 4)
          : frame.senderId;
        const realSender = frame.realSender || shortSender;
        const msgText = frame.text || "";

        // Self-echo check (exact MainActivity.kt line 264 & WardriveService.kt line 1435)
        const connectedSelfId = bleManager && bleManager.connectedNodeId ? bleManager.connectedNodeId.toUpperCase().trim() : "";
        const cleanSender = realSender.toUpperCase().trim();
        const isSenderSelf = connectedSelfId && (cleanSender === connectedSelfId || (cleanSender.length >= 4 && connectedSelfId.startsWith(cleanSender)) || (connectedSelfId.length >= 4 && cleanSender.startsWith(connectedSelfId)));

        const cleanMsgText = (msgText.startsWith("[") && msgText.includes("] ")) ? msgText.substring(msgText.indexOf("] ") + 2).trim() : msgText;
        const recentSent = sessionMessageHistory.filter(m => m.isOutgoing).slice(-3);
        const isSelfEcho = isSenderSelf && recentSent.some(m => {
          const cleanSent = (m.message.startsWith("[")) ? m.message.substring(m.message.indexOf("] ") + 2).trim() : m.message;
          return cleanSent.toLowerCase() === cleanMsgText.toLowerCase();
        });

        if (isSelfEcho) {
          console.log("Correlated self-echo at UI level for", realSender, "-> Marking message as Delivered (✔✔)");
          const matchingSent = recentSent.find(m => {
            const cleanSent = (m.message.startsWith("[")) ? m.message.substring(m.message.indexOf("] ") + 2).trim() : m.message;
            return cleanSent.toLowerCase() === cleanMsgText.toLowerCase();
          });
          if (matchingSent && matchingSent.ackTag) {
            markMessageStatus(matchingSent.ackTag, "✅ Delivered");
          } else {
            const pending = sessionMessageHistory.filter(m => m.isOutgoing && m.status < 2);
            if (pending.length > 0) {
              markMessageStatus(pending[pending.length - 1].ackTag, "✅ Delivered");
            }
          }
          return;
        }

        // Duplication check (exact MainActivity.kt line 230)
        const isDuplicate = sessionMessageHistory.some(m =>
          !m.isOutgoing &&
          (m.message === msgText || m.message.trim() === msgText.trim() || (m.senderId === realSender && m.message === msgText)) &&
          (Date.now() - m.timestamp) < 10000
        );
        if (isDuplicate) return;

        // Detect Scope Name using MeshCoreScope
        let detectedScopeName = frame.scopeName || null;

        const entry = {
          senderId: realSender,
          rawSenderId: frame.senderId,
          message: msgText,
          hopCount: frame.hopCount,
          timestamp: Date.now(),
          isOutgoing: false,
          scopeName: detectedScopeName,
          rawHex: frame.rawHex || (rawBytes ? Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('') : ""),
          meshPacket: frame.meshPacket || null
        };

        let targetKey = "";
        if (frame.isDM) {
           entry.recipientId = "Self"; // We received a DM
           entry.senderId = shortSender;
           entry.channelIdx = null;
           targetKey = `DM:${shortSender}`;
           if (!entry.scopeName) entry.scopeName = "Global";
        } else {
           const chMatch = frame.senderId.match(/^CH(\d+)$/);
           if (chMatch) {
              entry.channelIdx = parseInt(chMatch[1]);
           } else {
              entry.channelIdx = activeChannelIndex;
           }
           entry.recipientId = null;
           targetKey = `CH:${entry.channelIdx}`;

           const channelObj = syncedChannels ? syncedChannels.find(c => c.index === entry.channelIdx) : null;
           if (!entry.scopeName) {
             entry.scopeName = (channelObj && channelObj.scope) ? channelObj.scope : "Global";
           }
        }

        // Correlate with recent 0x88 RF Log using timestamp/hash or text fallback (exact WardriveService.kt line 1540)
        const searchMsgText = msgText ? msgText.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim() : "";
        const tsKey = frame.msgHash || frame.radioTimestamp || frame.ackTag;
        const recentPathByTs = tsKey ? recentRfLogsByTimestamp.get(tsKey) : null;
        const recentPathByText = searchMsgText ? recentRfLogsByText.get(searchMsgText) : null;
        const recentPath = recentPathByTs || recentPathByText;

        const rfRawByTs = tsKey ? recentRfLogsRawByTimestamp.get(tsKey) : null;
        const rfRawByText = searchMsgText ? recentRfLogsRawByText.get(searchMsgText) : null;
        const rfRaw = rfRawByTs || rfRawByText;

        if (rfRaw && (!entry.rawHex || !entry.rawHex.startsWith("88"))) {
          entry.rawHex = rfRaw;
        }

        if (recentPath && (Date.now() - recentPath.timestamp) < 60000) {
          entry.echoes = entry.echoes || [];
          const pathStr = recentPath.path.join(",");
          const alreadyHeard = entry.echoes.some(e =>
            typeof e === 'object' && e.path ? e.path.join(",") === pathStr : e === pathStr
          );
          if (!alreadyHeard) {
            entry.echoes.push(recentPath);
          }
        }

        // Update Unread Counts Map (exact 1:1 match with MainActivity.kt lines 345-358)
        const isViewingChat = activeNavTab === 'chat';
        const isViewingTarget = (frame.isDM && isSameNodeId(activeDirectNodeId, frame.senderId)) ||
                                (!frame.isDM && activeDirectNodeId === null && activeChannelIndex === entry.channelIdx);

        if (!isViewingChat || !isViewingTarget) {
          const key = frame.isDM ? `DM:${shortSender}` : `CH:${entry.channelIdx}`;
          const currentUnread = unreadCounts.get(key) || 0;
          unreadCounts.set(key, currentUnread + 1);
          saveUnreadCountsToStorage();
        }

        entry.isRead = (isViewingChat && isViewingTarget);
        sessionMessageHistory.push(entry);
        savePersistedData();

        // Always show Message Overlay on main screen when message arrives
        showMessageOverlay(entry.senderId, frame.text, frame.hopCount, entry.scopeName);

        updateMessengerUnreadBadge();
        refreshChatMessageHistory();

        // Play message notification tone (decoupled from main screen Beep)
        playNotificationTone(1);

        // V3 Packets (0x10/0x11) also contain SNR in the frame header! Update UI if SNR is valid.
        if (frame.snr !== undefined && frame.snr !== 5 && frame.snr !== 0) {
            updateVuMeters(frame.snr, -75);
            playSignalBeep(frame.snr);
        }

        // Request next queued message from radio node's flash memory (exact WardriveService.kt line 1330)
        setTimeout(() => {
          if (bleManager && bleManager.isConnected) {
            bleManager.syncNextMessage();
          }
        }, 150);
        return;
      }

      // 6. Encrypted RF Log Frame (0x88) -> Add points to map & graphs
      if (frame.type === "RfLog" && frame.rfLog) {
        const rfLog = frame.rfLog;
        const meshPacket = rfLog.meshPacket;
        const nodeId = (meshPacket && meshPacket.lastHopId) ? meshPacket.lastHopId : "UNKNOWN";

        // Filter invalid IDs and all zero IDs (e.g. 000000) (exact MainActivity.kt line 6049)
        const isInvalidZeroId = !nodeId ||
          /^0+$/.test(nodeId) ||
          nodeId === "UNKNOWN" ||
          nodeId === "UKWN" ||
          nodeId.startsWith("CH");

        if (isInvalidZeroId) return;

        // Suppress self-loopback (exact WardriveService.kt line 1435)
        const isSenderSelf = bleManager.connectedNodeId ? (() => {
          const cleanNodeId = nodeId.toUpperCase().trim();
          const cleanSelfId = bleManager.connectedNodeId.toUpperCase().trim();
          return cleanNodeId === cleanSelfId ||
                 (cleanNodeId.length >= 4 && cleanSelfId.startsWith(cleanNodeId)) ||
                 (cleanSelfId.length >= 4 && cleanNodeId.startsWith(cleanSelfId));
        })() : false;

        const hopCount = meshPacket ? meshPacket.hopCount : 0;
        if (isSenderSelf && hopCount <= 0) return;

        const snr = rfLog.snr;
        const rssi = rfLog.rssi;
        const timeStr = new Date().toLocaleTimeString();
        const rawHex = ProtocolDecoder.bytesToHex(rawBytes);

        const lat = userLocation ? userLocation.lat : 0;
        const lng = userLocation ? userLocation.lng : 0;

        const signalItem = {
          nodeId,
          snr,
          rssi,
          lat,
          lng,
          time: timeStr,
          rawHex,
          meshPacket,
          hopCount
        };

        lastSignalTime = Date.now();

        // Detect Scope
        if (meshPacket && window.MeshCoreScope) {
          MeshCoreScope.detectScope(meshPacket).then(scope => {
            if (scope) {
              signalItem.scopeName = scope;
              if (entry && (!entry.scopeName || entry.scopeName === "Global")) {
                entry.scopeName = scope;
                savePersistedData();
                refreshChatMessageHistory();
              }
            }
          });
        }

        // Only update Repeater ID display if this is an actual Last Hop Repeater (nodeId !== "DIRECT")
        if (nodeId !== "DIRECT") {
          updateRepeaterDisplay(nodeId, hopCount, signalItem.payloadType);
        }
        updateVuMeters(snr, rssi);
        playSignalBeep(snr);

        // Try Decrypting Over-the-Air Channel Messages (0x05 Group Text) using Synced Channel PSKs
        const msgHash = meshPacket ? meshPacket.messageHash : null;
        const repeaterList = (meshPacket && meshPacket.path && meshPacket.path.length > 0)
          ? meshPacket.path.filter(id => id && id !== "DIRECT" && id !== "UNKNOWN")
          : [];

        const heardPath = {
          path: repeaterList,
          snr: snr,
          rssi: rssi,
          timestamp: Date.now()
        };

        if (msgHash !== null && msgHash !== undefined) {
          putAndTrimMap(recentRfLogsByTimestamp, msgHash, heardPath);
          putAndTrimMap(recentRfLogsRawByTimestamp, msgHash, rawHex);
        }

        function correlateMessageWithRfLog(matchedMsg) {
          if (!matchedMsg) return;
          if (!matchedMsg.rawHex || !matchedMsg.rawHex.startsWith("88")) {
            matchedMsg.rawHex = rawHex;
          }
          if (signalItem.scopeName && (!matchedMsg.scopeName || matchedMsg.scopeName === "Global")) {
            matchedMsg.scopeName = signalItem.scopeName;
          }
          if (repeaterList.length > 0) {
            matchedMsg.echoes = matchedMsg.echoes || [];
            const pathStr = repeaterList.join(",");
            const alreadyHeard = matchedMsg.echoes.some(e =>
              (typeof e === 'object' && e.path ? e.path.join(",") === pathStr : e === pathStr)
            );
            if (!alreadyHeard) {
              matchedMsg.echoes.push(heardPath);
            }
          }
          if (msgHash && !matchedMsg.radioHash) matchedMsg.radioHash = msgHash;
          savePersistedData();
          refreshChatMessageHistory();
        }

        // Strategy 1: Match incoming/outgoing message by 32-bit transport hash / radioHash / ackTag
        let entry = null;
        if (msgHash !== null && msgHash !== undefined) {
          entry = sessionMessageHistory.findLast(m =>
            (Number(m.radioHash) === Number(msgHash) || Number(m.ackTag) === Number(msgHash) || Number(m.radioTimestamp) === Number(msgHash)) &&
            (Date.now() - m.timestamp) < 60000
          );
          if (entry) correlateMessageWithRfLog(entry);
        }

        // Strategy 2: Match message by decrypted text body (for Channel and Direct Msg)
        if (meshPacket && (meshPacket.payloadType === 0x05 || meshPacket.payloadType === 0x02) && meshPacket.payload && meshPacket.payload.rawPayload) {
          const raw = meshPacket.payload.rawPayload;
          if (meshPacket.payloadType === 0x05 && raw.length >= 6) {
            // Group / Channel Message
            const channelHash = raw[0] & 0xFF;
            const encrypted = raw.slice(1);

            for (const ch of syncedChannels) {
              const psk = (ch.psk && ch.psk.some && ch.psk.some(b => b !== 0)) ? ch.psk : DEFAULT_PUBLIC_PSK;
              ProtocolDecoder.Crypto.decryptAES(psk, encrypted).then(decrypted => {
                if (decrypted && decrypted.length >= 5) {
                  try {
                    const textBytes = decrypted.slice(5);
                    const decodedText = ProtocolDecoder.tryDecodePrefixed(textBytes);

                    if (ProtocolDecoder.isPrintable(decodedText)) {
                      const split = ProtocolDecoder.splitSenderAndText(decodedText);
                      const matchBody = (split.body ? split.body : decodedText).replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();

                      if (matchBody) {
                        const cleanMsgText = matchBody;
                        signalItem.decryptedContent = cleanMsgText;
                        signalItem.message = cleanMsgText;
                        putAndTrimMap(recentRfLogsByText, cleanMsgText, heardPath);
                        putAndTrimMap(recentRfLogsRawByText, cleanMsgText, rawHex);

                        const messageMatch = sessionMessageHistory.findLast(m => {
                          if ((Date.now() - m.timestamp) > 60000) return false;

                          const histText = m.message.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim().toLowerCase();
                          const targetText = cleanMsgText.toLowerCase();

                          return histText === targetText ||
                                 histText.endsWith(targetText) ||
                                 targetText.endsWith(histText) ||
                                 histText.includes(targetText) ||
                                 targetText.includes(histText);
                        });

                        correlateMessageWithRfLog(messageMatch);
                      }
                    }
                  } catch (e) {
                    console.warn("AES Channel Decrypt Exception:", e);
                  }
                }
              });
            }
          } else if (meshPacket.payloadType === 0x02 && raw.length >= 5) {
            // Direct Message
            try {
              const textBytes = raw.slice(5);
              const decodedText = ProtocolDecoder.tryDecodePrefixed(textBytes);
              if (ProtocolDecoder.isPrintable(decodedText)) {
                const split = ProtocolDecoder.splitSenderAndText(decodedText);
                const matchBody = (split.body ? split.body : decodedText).replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
                if (matchBody) {
                  const cleanMsgText = matchBody;
                  signalItem.decryptedContent = cleanMsgText;
                  signalItem.message = cleanMsgText;
                  putAndTrimMap(recentRfLogsByText, cleanMsgText, heardPath);
                  putAndTrimMap(recentRfLogsRawByText, cleanMsgText, rawHex);

                  const messageMatch = sessionMessageHistory.findLast(m => {
                    if ((Date.now() - m.timestamp) > 60000) return false;

                    const histText = m.message.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim().toLowerCase();
                    const targetText = cleanMsgText.toLowerCase();

                    return histText === targetText ||
                           histText.endsWith(targetText) ||
                           targetText.endsWith(histText) ||
                           histText.includes(targetText) ||
                           targetText.includes(histText);
                  });

                  correlateMessageWithRfLog(messageMatch);
                }
              }
            } catch (e) {}
          }
        }

        if (entry && repeaterList.length > 0) {
          entry.echoes = entry.echoes || [];
          const pathStr = repeaterList.join(",");
          const alreadyHeard = entry.echoes.some(e =>
            (typeof e === 'object' && e.path ? e.path.join(",") === pathStr : e === pathStr)
          );
          if (!alreadyHeard) {
            entry.echoes.push(heardPath);
            savePersistedData();
            refreshChatMessageHistory();
          }
        }

        // Only log real repeaters and mesh nodes to Best Seen & Session Logs (exact MainActivity.kt line 6049 & WardriveService.kt line 1805)
        if (nodeId !== "DIRECT") {
          allReceivedLogs.unshift(signalItem);
          if (allReceivedLogs.length > 1000) allReceivedLogs.pop();

          const key = nodeId.toUpperCase().trim();
          const currentBest = bestSeenMap.get(key);
          if (!currentBest || snr >= currentBest.snr) {
            bestSeenMap.set(key, signalItem);
          } else {
            // Preserve peak SNR, but update time and coordinates to reflect latest reception
            currentBest.time = signalItem.time;
            currentBest.timestamp = signalItem.timestamp;
            if (signalItem.rssi) currentBest.rssi = signalItem.rssi;
            if (signalItem.lat && signalItem.lng) {
              currentBest.lat = signalItem.lat;
              currentBest.lng = signalItem.lng;
            }
          }
        }

        // Add to Graph
        if (signalGraphRenderer) {
          const nodeObj = Array.from(locatedNodes.values()).find(n => n.id.toUpperCase() === nodeId.toUpperCase());
          const name = nodeObj && nodeObj.name ? nodeObj.name : nodeId;
          signalGraphRenderer.addValue(nodeId, name, rssi);
        }

        // Add to Advert / Contact if present
        if (meshPacket && meshPacket.payload && meshPacket.payload.type === "Advert") {
          const adv = meshPacket.payload;
          if (adv.pubKey) {
            const shortId = adv.pubKey.substring(0, 4).toUpperCase();
            const name = adv.name || shortId;
            const advLat = adv.lat || 0;
            const advLng = adv.lon || 0;
            const role = (adv.flags & 0x0F) || 2;

            locatedNodes.set(adv.pubKey, {
              id: shortId,
              name,
              role,
              lat: advLat,
              lng: advLng,
              publicKey: adv.pubKey
            });

            if (advLat !== 0 && advLng !== 0) {
              addRepeaterMarkerToMap(advLat, advLng, name, shortId);
            }
            savePersistedData();
          }
        }

        // Add to Map Points
        if (lat !== 0 && lng !== 0) {
          mapSignalPoints.push(signalItem);
          renderSignalPointOnMap(signalItem);
        }

        updateUILists();
        updateAnalysisData();
        updateRadarBlips();
      }
    };
  }

  function isSameNodeId(id1, id2) {
    if (!id1 || !id2) return false;
    const clean1 = id1.toString().toUpperCase().trim();
    const clean2 = id2.toString().toUpperCase().trim();
    if (clean1 === clean2) return true;
    const short1 = clean1.substring(0, 4);
    const short2 = clean2.substring(0, 4);
    return short1.length === 4 && short1 === short2;
  }

  function markMessageStatus(ackTag, statusText, radioHash = null) {
    if (!ackTag) return;
    const numTag = Number(ackTag);
    const numHash = radioHash ? Number(radioHash) : null;

    // 1. Update data history first so state persists permanently
    let item = sessionMessageHistory.find(m => m.isOutgoing && (
      Number(m.ackTag) === numTag ||
      Number(m.radioTimestamp) === numTag ||
      (m.radioHash && Number(m.radioHash) === numTag) ||
      (numHash && Number(m.radioHash) === numHash)
    ));

    // Fallback: If exact ackTag match isn't found, update the last pending outgoing message with status < 2
    if (!item) {
      const pending = sessionMessageHistory.filter(m => m.isOutgoing && m.status < 2 && (Date.now() - m.timestamp) < 60000);
      if (pending.length > 0) {
        item = pending[pending.length - 1];
      }
    }

    if (item) {
      item.statusText = statusText;
      if (statusText.includes("Delivered") || statusText.includes("✅")) {
        item.status = 2;
      } else if (statusText.includes("Sent") || statusText.includes("☁️")) {
        item.status = 1;
      } else if (statusText.includes("Failed") || statusText.includes("❌")) {
        item.status = -1;
      }

      if (numHash) {
        item.radioHash = numHash;
        console.log(`Mapped radioTimestamp ${numTag} to radioHash ${numHash} on outgoing message`);

        // Retroactive claim from recent RF logs (exact WardriveService.kt lines 1545-1560)
        item.echoes = item.echoes || [];
        const cleanMsgText = item.message.startsWith("[") && item.message.includes("] ") ? item.message.substring(item.message.indexOf("] ") + 2).trim() : item.message.trim();
        const recentPathByHash = recentRfLogsByTimestamp.get(numHash);
        const recentPathByText = recentRfLogsByText.get(cleanMsgText) || recentRfLogsByText.get(item.message.trim());
        const recentPath = recentPathByHash || recentPathByText;

        if (recentPath && recentPath.path && recentPath.path.length > 0 && (Date.now() - recentPath.timestamp) < 60000) {
          const pathStr = recentPath.path.join(",");
          const already = item.echoes.some(e => (typeof e === 'object' && e.path ? e.path.join(",") === pathStr : e === pathStr));
          if (!already) {
            item.echoes.push(recentPath);
          }
        }
      }
    }
    savePersistedData();

    // 2. Re-render chat view
    refreshChatMessageHistory();
  }

  window.refreshChatMessageHistory = () => {
    const box = document.getElementById('messengerChat');
    if (!box) return;
    box.innerHTML = ''; // Clear chat view

    // Filter messages for current target using robust Number() type-safe matching and isSameNodeId
    const currentMsgs = sessionMessageHistory.filter(msg => {
       if (activeDirectNodeId !== null) {
          // Direct Message filter (using isSameNodeId)
          return isSameNodeId(msg.recipientId, activeDirectNodeId) ||
                 isSameNodeId(msg.senderId, activeDirectNodeId);
       } else {
          // Channel Message filter (type-safe integer/string comparison)
          const isChanMatch = msg.channelIdx !== null && msg.channelIdx !== undefined && Number(msg.channelIdx) === Number(activeChannelIndex);
          const isNoRecipient = (!msg.recipientId || msg.recipientId === "Self");
          return isChanMatch && isNoRecipient;
       }
    });

    currentMsgs.forEach(msg => addChatMessageBubble(msg));
  };

  function addChatMessageBubble(entry) {
    const box = document.getElementById('messengerChat');
    if (!box) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${entry.isOutgoing ? 'outgoing' : 'incoming'}`;
    bubble.dataset.ackTag = entry.ackTag || "";

    const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Extract sender display name (exact MainActivity.kt line 8285)
    let displaySender = entry.isOutgoing ? "You" : (entry.senderId || "Unknown");
    const foundName = findNodeName(displaySender);
    if (foundName) displaySender = foundName;

    // Sender header div: ONLY for INCOMING messages (exact MainActivity.kt line 8312: if (!entry.isOutgoing))
    const senderHeaderHtml = !entry.isOutgoing
      ? `<div class="chat-sender" style="color: #00E5FF; font-weight: bold; margin-bottom: 4px;">${displaySender}</div>`
      : '';

    // Clean message body by removing [ChannelName] prefix and SenderName: prefix (exact MainActivity.kt lines 8342-8353)
    let rawMsg = entry.message ? entry.message.trim() : "";
    if (rawMsg.startsWith("[") && rawMsg.includes("] ")) {
      rawMsg = rawMsg.substring(rawMsg.indexOf("] ") + 2).trim();
    }
    let cleanBody = rawMsg;
    if (rawMsg.includes(": ")) {
      const potentialName = rawMsg.substring(0, rawMsg.indexOf(": ")).trim();
      if (potentialName.toLowerCase() === displaySender.toLowerCase() ||
          potentialName.toLowerCase() === (entry.senderId || '').toLowerCase() ||
          potentialName.toLowerCase() === 'you') {
        cleanBody = rawMsg.substring(rawMsg.indexOf(": ") + 2).trim();
      }
    }

    // Status icon formatting (exact MainActivity.kt lines 8430-8445: 🕒 / ✔ / ✔✔)
    const statusText = entry.statusText || (entry.isOutgoing ? "Sending..." : "");
    let statusIcon = "";
    if (entry.isOutgoing) {
      if (statusText.includes("Delivered") || entry.status === 2) {
        statusIcon = ' <span style="color: #00FF00; font-weight: bold;">✔✔</span>';
      } else if (statusText.includes("Sent") || entry.status === 1) {
        statusIcon = ' <span style="color: #00FF00; font-weight: bold;">✔</span>';
      } else if (statusText.includes("Failed")) {
        statusIcon = ' <span style="color: #FF5252;">❌</span>';
      } else {
        statusIcon = ' <span style="color: #888;">🕒</span>';
      }
    }

    const hopText = (entry.hopCount >= 0) ? ` (Hops: ${entry.hopCount})` : '';
    const scopeText = entry.scopeName ? (entry.scopeName === "Global" ? " [GLOBAL]" : ` [${entry.scopeName}]`) : '';

    const validEchoes = entry.echoes ? entry.echoes.filter(e => e && e.path && e.path.length > 0) : [];
    const echoCount = validEchoes.length;
    const echoesHtml = (entry.isOutgoing && echoCount > 0)
      ? `<div class="msg-echoes" style="font-size: 0.75rem; color: #4CAF50; margin-top: 4px; font-weight: bold;">📡 Heard by ${echoCount} repeater(s)</div>`
      : '';

    bubble.innerHTML = `
      ${senderHeaderHtml}
      <div class="chat-text" style="color: ${entry.isOutgoing ? '#FFFFFF' : '#FFEB3B'};">${cleanBody}</div>
      <div class="chat-footer">
        ${scopeText}${hopText} ${timeStr}${statusIcon}
        ${echoesHtml}
      </div>
    `;

    addTouchAndClickListener(
      bubble,
      () => {
        // Short Click on incoming -> pre-fill @Sender: into input field
        if (!entry.isOutgoing) {
          const input = document.getElementById('inputMessage');
          if (input) {
            input.value = `@${entry.senderId}: ${input.value}`;
            input.focus();
          }
        } else if (entry.echoes && entry.echoes.length > 0) {
          showEchoDetailsDialog(entry);
        }
      },
      () => {
        // Long Press -> Context Menu
        showMessageContextMenu(entry, bubble);
      }
    );

    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
  }

  function showMessageContextMenu(entry, element) {
    if (!entry) return;
    window.currentSelectedMessageEntry = entry;
    window.currentSelectedMessageElement = element;

    const modalDetailsBody = document.getElementById('detailsBody');
    if (!modalDetailsBody) return;

    const senderName = entry.isOutgoing ? "You" : (findNodeName(entry.senderId) || entry.senderId || "Unknown");
    let rawMsg = entry.message ? entry.message.trim() : "";
    if (rawMsg.startsWith("[") && rawMsg.includes("] ")) {
      rawMsg = rawMsg.substring(rawMsg.indexOf("] ") + 2).trim();
    }
    let cleanBody = rawMsg;
    if (rawMsg.includes(": ")) {
      const potentialName = rawMsg.substring(0, rawMsg.indexOf(": ")).trim();
      if (potentialName.toLowerCase() === senderName.toLowerCase() ||
          potentialName.toLowerCase() === (entry.senderId || '').toLowerCase() ||
          potentialName.toLowerCase() === 'you') {
        cleanBody = rawMsg.substring(rawMsg.indexOf(": ") + 2).trim();
      }
    }

    const shortBody = cleanBody.length > 30 ? cleanBody.substring(0, 30) + "…" : cleanBody;

    let optionsHtml = `
      <div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <h3 style="color: #4CAF50; font-size: 1.1rem; margin-bottom: 2px;">💬 Message Options</h3>
        <span style="color: #FFF; font-size: 0.85rem; font-weight: bold;">"${shortBody}"</span>
        <div style="color: #AAA; font-size: 0.75rem; margin-top: 2px;">From: ${senderName}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    // 1. Reply with Hop Info (Shown ONLY for incoming messages - exact MainActivity.kt line 8361)
    if (!entry.isOutgoing) {
      optionsHtml += `
        <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #00FFC8; border: 1px solid #00FFC8; border-radius: 6px;" onclick="replyWithHopInfo(window.currentSelectedMessageEntry);">💬 Reply with Hop Info</button>
      `;
    }

    // 2. Signal Deep Dive (Exact MainActivity.kt line 8363)
    optionsHtml += `
      <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="openSignalDeepDiveForMessage(window.currentSelectedMessageEntry);">🔬 Signal Deep Dive</button>
    `;

    // 3. Copy Text (Exact MainActivity.kt line 8364)
    optionsHtml += `
      <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="copyChatMessageText(window.currentSelectedMessageEntry);">📋 Copy Text</button>
    `;

    // 4. Delete Message (Exact MainActivity.kt line 8365)
    optionsHtml += `
      <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #FF5252; border: 1px solid #FF5252; border-radius: 6px;" onclick="deleteChatMessage(window.currentSelectedMessageEntry, window.currentSelectedMessageElement);">🗑️ Delete Message</button>
    `;

    optionsHtml += `
        <br>
        <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-weight: bold; background: #222; color: #888; border: 1px solid #333; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active');">Cancel</button>
      </div>
    `;

    modalDetailsBody.innerHTML = optionsHtml;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  function formatHopReplyText(entry) {
    if (!entry) return "";

    const senderName = findNodeName(entry.senderId) || entry.senderId || "Unknown";

    let rawData = entry.rawHex || "";
    let lastEcho = entry.echoes && entry.echoes.length > 0 ? entry.echoes[entry.echoes.length - 1] : null;

    let path = lastEcho ? lastEcho.path : null;
    let hops = entry.hopCount;

    if (!path && rawData && rawData.startsWith("88") && typeof ProtocolDecoder !== 'undefined') {
      try {
        const meshPacket = ProtocolDecoder.decodeRawHex(rawData);
        if (meshPacket && meshPacket.path && meshPacket.path.length > 0) {
          path = meshPacket.path;
          if ((hops === undefined || hops < 0) && meshPacket.hopCount >= 0) hops = meshPacket.hopCount;
        }
      } catch (e) {}
    }

    if ((hops === undefined || hops < 0) && path) {
      hops = path.length;
    }

    let hopDetails = null;
    if (path && path.length > 0) {
      const cleanPath = path.filter(p => p && p !== "DIRECT" && p !== "UNKNOWN");
      const count = hops > 0 ? hops : cleanPath.length;
      const countText = count === 1 ? "1 hop" : `${count} hops`;
      hopDetails = cleanPath.length > 0 ? `${countText} via ${cleanPath.join(",")}` : countText;
    } else if (hops === 0) {
      hopDetails = "0 hops direct";
    } else if (hops > 0) {
      hopDetails = hops === 1 ? "1 hop" : `${hops} hops`;
    }

    return hopDetails ? `@${senderName} (${hopDetails}): ` : `@${senderName}: `;
  }

  function replyWithHopInfo(entry) {
    if (!entry) return;
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');

    const input = document.getElementById('inputMessage');
    if (input) {
      const replyPrefix = formatHopReplyText(entry);
      if (!input.value.includes(replyPrefix.trim())) {
        input.value = replyPrefix + input.value;
      }
      input.focus();
    }
  }

  function showNoticeModal(title, text) {
    const detailsBody = document.getElementById('detailsBody');
    if (!detailsBody) return;

    detailsBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <h3 style="color: #4CAF50; font-size: 1.1rem; margin-bottom: 4px;">${title}</h3>
      </div>
      <p style="text-align: center; color: #FFF; font-size: 0.9rem; padding: 15px 0;">${text}</p>
      <br>
      <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active');">OK</button>
    `;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  function openSignalDeepDiveForMessage(entry) {
    if (!entry) return;
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');

    let rawHex = entry.rawHex;
    let cleanText = entry.message ? entry.message.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim() : "";
    let tsKey = entry.radioTimestamp || entry.ackTag || entry.radioHash;

    // Check if 0x88 RF log hex exists in recent buffers (exact WardriveService.kt lines 1540-1550)
    if (!rawHex || !rawHex.startsWith("88")) {
      rawHex = (tsKey ? recentRfLogsRawByTimestamp.get(tsKey) : null) ||
               (cleanText ? recentRfLogsRawByText.get(cleanText) : null);
      if (rawHex) entry.rawHex = rawHex;
    }

    // Check if matching 0x88 RF log item exists in allReceivedLogs by timestamp or message text
    // STRICT: Exclude Advert (0x04) packets! Only match actual chat/RF log packets (0x05, 0x02, 0x10, 0x11, 0x88)
    let log = null;
    if (entry.rawHex && entry.rawHex.startsWith("88") && entry.payloadType !== 0x04) {
      log = entry;
    } else {
      log = allReceivedLogs.find(l => {
        if (l.rawHex && l.rawHex.startsWith("88")) {
          const lPType = l.meshPacket ? l.meshPacket.payloadType : l.payloadType;
          if (lPType === 0x04) return false; // Never match Advert packets for chat Deep Dive!
          if (tsKey && l.radioTimestamp && Number(l.radioTimestamp) === Number(tsKey)) return true;
          if (cleanText && l.message && l.message.trim().toLowerCase() === cleanText.toLowerCase()) return true;
        }
        return false;
      });
    }

    // Extract cleanest repeater path from echoes or meshPacket
    let pathList = [];
    if (log && log.meshPacket && log.meshPacket.path && log.meshPacket.path.length > 0) {
      pathList = log.meshPacket.path;
    } else if (entry.meshPacket && entry.meshPacket.path && entry.meshPacket.path.length > 0) {
      pathList = entry.meshPacket.path;
    } else if (entry.echoes && entry.echoes.length > 0) {
      const validEcho = entry.echoes.find(e => e && e.path && e.path.length > 0);
      if (validEcho) pathList = validEcho.path;
    }

    const payloadTypeToUse = (log && log.meshPacket) ? log.meshPacket.payloadType :
                             (entry.meshPacket ? entry.meshPacket.payloadType :
                             (entry.channelIdx !== undefined && entry.channelIdx !== null ? 0x05 : 0x02));

    // Construct a clean Deep Dive item directly from the message entry
    const itemToDisplay = {
      nodeId: entry.senderId || entry.rawSenderId || "UKWN",
      sourceId: entry.senderId || entry.rawSenderId,
      senderName: entry.senderName,
      snr: (log && log.snr !== undefined) ? log.snr : entry.snr,
      rssi: (log && log.rssi !== undefined) ? log.rssi : entry.rssi,
      hops: entry.hopCount >= 0 ? entry.hopCount : (log && log.hopCount >= 0 ? log.hopCount : '-'),
      message: entry.message,
      rawHex: log ? log.rawHex : entry.rawHex,
      meshPacket: (log && log.meshPacket) ? log.meshPacket : (entry.meshPacket || {
        routeType: 0,
        payloadType: payloadTypeToUse,
        payloadVersion: 0,
        hopCount: entry.hopCount >= 0 ? entry.hopCount : 0,
        path: pathList
      }),
      echoes: entry.echoes,
      time: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      payloadType: payloadTypeToUse
    };

    showSignalDeepDive(itemToDisplay);
  }

  function copyChatMessageText(entry) {
    if (!entry) return;
    let rawMsg = entry.message ? entry.message.trim() : "";
    if (rawMsg.startsWith("[") && rawMsg.includes("] ")) {
      rawMsg = rawMsg.substring(rawMsg.indexOf("] ") + 2).trim();
    }
    if (rawMsg.includes(": ")) {
      rawMsg = rawMsg.substring(rawMsg.indexOf(": ") + 2).trim();
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(rawMsg);
    }
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');
  }

  function deleteChatMessage(entry, element) {
    if (!entry) return;
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');

    const idx = sessionMessageHistory.indexOf(entry);
    if (idx !== -1) {
      sessionMessageHistory.splice(idx, 1);
    }

    if (element && element.parentElement) {
      element.parentElement.removeChild(element);
    }

    savePersistedData();

    const box = document.getElementById('messengerChat');
    if (box && box.children.length === 0) {
      refreshChatMessageHistory();
    }
  }

  function showEchoDetailsDialog(entry) {
    const detailsBody = document.getElementById('detailsBody');
    if (!detailsBody) return;

    let echoesHtml = "";
    if (entry.echoes && entry.echoes.length > 0) {
      echoesHtml = entry.echoes.map((e, idx) => {
        let pathStr = "Direct";
        if (typeof e === 'object' && e.path && e.path.length > 0) {
          pathStr = e.path.map(hash => {
            const foundName = findNodeName(hash);
            return foundName ? `${hash} (${foundName})` : hash;
          }).join(" → ");
        } else if (typeof e === 'string') {
          pathStr = e;
        }
        const snrStr = (typeof e === 'object' && e.snr !== undefined) ? `${e.snr} dB` : '-';
        const rssiStr = (typeof e === 'object' && e.rssi !== undefined) ? `${e.rssi} dBm` : '-';

        return `
          <div style="padding: 10px; margin-bottom: 8px; background: #1A1A1A; border-radius: 8px; border: 1px solid #333;">
            <b>${idx + 1}. Path:</b> ${pathStr}<br>
            <small style="color: #888;">SNR: ${snrStr} | RSSI: ${rssiStr}</small>
          </div>
        `;
      }).join("");
    } else {
      echoesHtml = "<p style='color:#888;'>No repeater retransmissions recorded.</p>";
    }

    const cleanMsg = (entry.message && entry.message.startsWith("[")) ? entry.message.substring(entry.message.indexOf("] ") + 2).trim() : entry.message;
    detailsBody.innerHTML = `
      <h3>📡 Heard Retransmissions</h3>
      <p style="color:#CCC;"><b>Message:</b> "${cleanMsg}"</p>
      <p style="color:#888; font-size:0.85rem;">Total echoes: ${entry.echoes ? entry.echoes.length : 0}</p>
      <div style="margin-top: 10px;">
        ${echoesHtml}
      </div>
    `;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  window.hideMessageOverlay = () => {
    const overlay = document.getElementById('tvMessageOverlay');
    if (overlay) overlay.style.display = 'none';
    if (messageOverlayTimeout) clearTimeout(messageOverlayTimeout);
  };

  function showMessageOverlay(nodeId, text, hopCount, scopeName = null) {
    const cbMsg = document.getElementById('cbMsgEnabled');
    if (!cbMsg || !cbMsg.checked) return;

    const overlay = document.getElementById('tvMessageOverlay');
    if (!overlay) return;

    const contact = Array.from(locatedNodes.values()).find(n => n.id && isSameNodeId(n.id, nodeId));
    const dispName = contact ? contact.name : nodeId;
    const scopeTag = scopeName ? (scopeName === "Global" ? ' <span style="color:#00FFC8; font-size:0.9rem;">[GLOBAL]</span>' : ` <span style="color:#00FFC8; font-size:0.9rem;">[${scopeName}]</span>`) : '';

    overlay.innerHTML = `
      <div style="font-size: 1.3rem; color: #4CAF50; margin-bottom: 6px;">📩 Message from <strong>${dispName}</strong>${scopeTag}</div>
      <div style="font-size: 1.15rem; color: #FFEB3B; margin-bottom: 6px;">"${text}"</div>
      <div style="font-size: 0.85rem; color: #AAA;">Hops: ${hopCount >= 0 ? hopCount : 'Direct'} (Tap to dismiss)</div>
    `;
    overlay.style.display = 'flex';

    if (messageOverlayTimeout) clearTimeout(messageOverlayTimeout);
    messageOverlayTimeout = setTimeout(() => {
      overlay.style.display = 'none';
    }, 10000);

    triggerSystemNotification(nodeId, text, scopeName);
  }

  function triggerSystemNotification(nodeId, text, scopeName = null) {
    const cbMsg = document.getElementById('cbMsgEnabled');
    if (!cbMsg || !cbMsg.checked) return;

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const contact = Array.from(locatedNodes.values()).find(n => n.id && isSameNodeId(n.id, nodeId));
        const dispName = contact ? contact.name : nodeId;
        const scopeTag = scopeName ? ` [${scopeName}]` : '';

        const title = `💬 ${dispName}${scopeTag}`;
        const options = {
          body: text,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: `meshcore_msg_${Date.now()}`,
          renotify: true,
          vibrate: [200, 100, 200]
        };

        const notif = new Notification(title, options);
        notif.onclick = () => {
          try { window.focus(); } catch (e) {}
          switchNavTab('chat');
        };
      } catch (e) {
        console.warn("System Notification notice:", e);
      }
    }
  }
  window.triggerSystemNotification = triggerSystemNotification;

  window.requestNotificationPermission = () => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            showToastMessage("🔔 Web Notifications Enabled!");
          } else {
            showToastMessage("🔔 Notifications Permission Denied");
          }
        });
      } else if (Notification.permission === "granted") {
        showToastMessage("🔔 Notifications Already Enabled");
      } else {
        showToastMessage("⚠️ Notifications Blocked in Browser Settings");
      }
    } else {
      showToastMessage("⚠️ Browser does not support Web Notifications");
    }
  };

  function findNodeName(lookupId) {
    if (!lookupId) return null;
    const upper = lookupId.toUpperCase().trim();

    // Strictly return null for 1-byte IDs (length 2, e.g. "69" or "2F") to prevent incorrect naming (exact MainActivity.kt line 4645)
    if (upper.length < 4 || (upper.length !== 4 && upper.length !== 6 && upper.length !== 12)) {
      return null;
    }

    // 1. Direct match in locatedNodes
    for (const [key, node] of locatedNodes.entries()) {
      const nodeKeyUpper = key.toUpperCase().trim();
      const nodeObjIdUpper = node.id ? node.id.toUpperCase().trim() : '';

      if ((nodeKeyUpper === upper || nodeObjIdUpper === upper) && node.name) {
        return node.name;
      }
    }

    // 2. Prefix/Suffix matching ONLY for 4, 6, or 12 char IDs (exact MainActivity.kt line 4660)
    for (const [key, node] of locatedNodes.entries()) {
      const nodeKeyUpper = key.toUpperCase().trim();
      const nodeObjIdUpper = node.id ? node.id.toUpperCase().trim() : '';
      const pubKeyUpper = node.pubKey ? node.pubKey.toUpperCase().trim() : '';

      if (pubKeyUpper && pubKeyUpper.length >= 6 && pubKeyUpper.startsWith(upper)) {
        if (node.name) return node.name;
      }

      if (upper.length === 6 && (nodeKeyUpper.startsWith(upper) || nodeKeyUpper.endsWith(upper))) {
        if (node.name) return node.name;
      }
      if (nodeKeyUpper.length === 6 && (upper.startsWith(nodeKeyUpper) || upper.endsWith(nodeKeyUpper))) {
        if (node.name) return node.name;
      }
    }

    return null;
  }

  let repeaterDisplayTimeout = null;

  function autoFitRepeaterText(element, text) {
    if (!element) return;
    element.innerText = text;
    element.style.display = 'block';

    const container = element.parentElement || element.offsetParent || document.body;
    const containerWidth = container.clientWidth || window.innerWidth || 300;
    const containerHeight = container.clientHeight || 100;

    // Start with maximum possible font size (up to 72px / 4.5rem, matching Android 110sp max size)
    let fontSize = Math.min(containerHeight * 0.95, 72);
    element.style.fontSize = fontSize + 'px';
    element.style.lineHeight = '1.0';

    const minFontSize = 10;
    // Scale down font size until full string fits on 1 single line inside container
    while ((element.scrollWidth > containerWidth - 8 || element.scrollHeight > containerHeight - 4) && fontSize > minFontSize) {
      fontSize -= 0.5;
      element.style.fontSize = fontSize + 'px';
    }
  }

  function updateRepeaterDisplay(id, hopCount, payloadType = null, isFlooding = false) {
    if (radarFlashTimeout) {
      clearTimeout(radarFlashTimeout);
      radarFlashTimeout = null;
    }

    const textEl = document.getElementById('tvRepeaterId');
    const hopEl = document.getElementById('tvHopCount');
    const radarCanvasEl = document.getElementById('canvasRadar');

    if (payloadType === null && lastReceivedSignal && lastReceivedSignal.nodeId === id) {
      payloadType = lastReceivedSignal.payloadType;
    }

    lastReceivedSignal = { nodeId: id, hopCount, payloadType };

    if (hopEl) {
      let typeTag = '';
      if (payloadType !== null && payloadType !== undefined && typeof window.ProtocolDecoder !== 'undefined') {
        const typeName = ProtocolDecoder.getSignalTypeName(payloadType);
        if (typeName) typeTag = `[${typeName}] `;
      }

      // Check for node location & calculate distance in km if user location is known (strictly for 2-byte+ IDs)
      let distanceText = '';
      const cleanIdForDist = (id || '').trim();
      const node = locatedNodes.get(id.toUpperCase()) || Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, id));
      if (cleanIdForDist.length >= 4 && node && node.lat && node.lng && userLocation && userLocation.lat && userLocation.lng) {
        const distKm = calculateDistanceKm(userLocation.lat, userLocation.lng, node.lat, node.lng);
        if (!isNaN(distKm) && distKm > 0) {
          distanceText = `Distance: ${distKm.toFixed(2)} km`;
        }
      }

      const hopText = hopCount >= 0 ? ` | Hops: ${hopCount}` : ' | Hops: -';
      const floodText = isFlooding ? ' [! FLOODING !]' : '';

      if (distanceText) {
        hopEl.innerText = `${typeTag}${distanceText}${hopText}${floodText}`;
      } else {
        hopEl.innerText = `${typeTag}${hopText}${floodText}`.trim();
      }

      if (isFlooding) {
        hopEl.style.color = '#F44336';
      } else {
        hopEl.style.color = '#4CAF50';
      }
    }

    if (textEl) {
      const foundName = findNodeName(id);
      let displayStr = id;

      if (showRepeaterNameInsteadOfId) {
        displayStr = foundName ? foundName : id;
      } else {
        displayStr = (id.length > 6) ? id.substring(0, 6) : id;
      }

      // Ensure main large ID text is always WHITE
      textEl.style.color = '#FFFFFF';

      // Dynamically fit font size to maximum possible size inside center container without truncation
      autoFitRepeaterText(textEl, displayStr);

      // Short tap/click on ID text toggles between Short ID and Repeater Name (exact MainActivity.kt line 1514)
      const toggleNameId = (e) => {
        if (e) {
          e.stopPropagation();
        }
        showRepeaterNameInsteadOfId = !showRepeaterNameInsteadOfId;
        if (lastReceivedSignal) {
          updateRepeaterDisplay(lastReceivedSignal.nodeId, lastReceivedSignal.hopCount);
        }
      };

      textEl.onclick = toggleNameId;
      textEl.ontouchend = (e) => {
        e.preventDefault();
        toggleNameId(e);
      };

      // Hide small radar canvas during the 3-second ID display so ID is clearly visible at MAX size
      if (radarCanvasEl) {
        radarCanvasEl.style.display = 'none';
      }
      if (radarCanvas) {
        radarCanvas.stop();
      }

      // Reset 3-second timer
      if (repeaterDisplayTimeout) clearTimeout(repeaterDisplayTimeout);

      repeaterDisplayTimeout = setTimeout(() => {
        // After 3 seconds: hide large ID text and restore/start small sweeping radar
        textEl.style.display = 'none';
        if (radarCanvasEl && activeNavTab !== 'analysis' && activeNavTab !== 'chat') {
          radarCanvasEl.style.display = 'block';
        }
        if (radarCanvas) {
          radarCanvas.resize();
          radarCanvas.start();
        }
      }, 3000);
    }
  }

  let nodesOnRadarSet = new Set();
  let radarFlashTimeout = null;

  function flashRadarNode(nodeId) {
    if (!nodeId) return;
    const name = findNodeName(nodeId);
    const hexId = (nodeId.length > 6 ? nodeId.substring(0, 6) : nodeId).toUpperCase();
    const displayName = name || hexId;

    const textEl = document.getElementById('tvRepeaterId');
    const radarCanvasEl = document.getElementById('canvasRadar');

    if (textEl) {
      textEl.style.color = '#00E5FF'; // Cyan (exact MainActivity.kt line 4729)
      autoFitRepeaterText(textEl, displayName);
    }

    if (radarCanvasEl) {
      radarCanvasEl.style.display = 'none';
    }

    if (radarFlashTimeout) {
      clearTimeout(radarFlashTimeout);
    }

    radarFlashTimeout = setTimeout(() => {
      if (textEl) {
        textEl.style.display = 'none';
        textEl.innerText = '--';
      }
      if (radarCanvasEl && activeNavTab !== 'analysis' && activeNavTab !== 'chat') {
        radarCanvasEl.style.display = 'block';
      }
      radarFlashTimeout = null;
    }, 3000);
  }

  function isValidRadarNodeId(id) {
    if (!id) return false;
    const cleanId = id.trim().toUpperCase();
    if (cleanId.length < 4) return false;
    return cleanId.length === 4 || cleanId.length === 6 || cleanId.length >= 12;
  }

  function updateRadarBlips() {
    const activeUserLoc = userLocation || lastGpsPosition;

    // REQUIRE valid GPS position for radar target tracking (exact MainActivity.kt line 5205)
    if (!activeUserLoc || !activeUserLoc.lat || !activeUserLoc.lng || (activeUserLoc.lat === 0 && activeUserLoc.lng === 0)) {
      if (radarCanvas) {
        radarCanvas.isGpsOffline = true;
        radarCanvas.setBlipsFromLocations(null, 0, []);
      }
      if (radarCanvasFull) {
        radarCanvasFull.isGpsOffline = true;
        radarCanvasFull.setBlipsFromLocations(null, 0, []);
      }
      return;
    }

    // Collect candidate repeaters/nodes from locatedNodes with valid GPS coordinates (exact MainActivity.kt lines 860-880)
    const candidateNodes = [];

    locatedNodes.forEach((node) => {
      if (node && node.id && isValidRadarNodeId(node.id) && node.lat && node.lng && node.lat !== 0 && node.lng !== 0) {
        const cleanId = node.id.trim().toUpperCase();
        if (matchesFilter({ nodeId: node.id, ...node })) {
          candidateNodes.push({
            id: cleanId,
            name: node.name || cleanId,
            lat: node.lat,
            lng: node.lng
          });
        }
      }
    });

    // Use GPS driving movement vector (bearing) when speed > 3.6 km/h (1.0 m/s)
    let userBearing = smoothedBearing || 0;
    if (activeUserLoc.speed && activeUserLoc.speed > 1.0 && activeUserLoc.bearing !== undefined && !isNaN(activeUserLoc.bearing)) {
      userBearing = activeUserLoc.bearing;
    }

    // Calculate 1 km range targets
    const currentNodesInRange = new Set();
    candidateNodes.forEach(node => {
      const dMeters = calculateDistanceKm(activeUserLoc.lat, activeUserLoc.lng, node.lat, node.lng) * 1000;
      if (dMeters <= 1000) {
        currentNodesInRange.add(node.id.toUpperCase());
      }
    });

    // Sound notification tone for newly detected targets within 1 km & flash name on main ID
    let firstNewTargetId = null;
    currentNodesInRange.forEach(id => {
      if (!nodesOnRadarSet.has(id)) {
        if (!firstNewTargetId) firstNewTargetId = id;
      }
    });

    if (firstNewTargetId) {
      playNotificationTone(2); // Sonar radar tone (exact MainActivity.kt line 896)
      flashRadarNode(firstNewTargetId);
    }

    // Sync set with current 1 km range nodes
    nodesOnRadarSet.clear();
    currentNodesInRange.forEach(id => nodesOnRadarSet.add(id));

    if (radarCanvas) {
      radarCanvas.isGpsOffline = false;
      radarCanvas.setBlipsFromLocations(activeUserLoc, userBearing, candidateNodes);
    }
    if (radarCanvasFull) {
      radarCanvasFull.isGpsOffline = false;
      radarCanvasFull.setBlipsFromLocations(activeUserLoc, userBearing, candidateNodes);
    }
  }

  function updateVuMeters(snr, rssi) {
    const snrVal = document.getElementById('tvSnrValue');
    if (snrVal) snrVal.innerText = `${snr} dB`;

    const rssiVal = document.getElementById('tvRssiValue');
    if (rssiVal) rssiVal.innerText = `${rssi} dBm`;

    // Exact 1:1 match with Native Android MainActivity.kt lines 6010-6030:
    // SNR Range: -20 dB to +20 dB (Span 40 dB) -> (snr + 20) / 40.0
    // RSSI Range: -125 dBm to -40 dBm (Span 85 dBm) -> (rssi + 125) / 85.0
    const snrNormalized = Math.min(1.0, Math.max(0.0, (snr + 20) / 40.0));
    const rssiNormalized = Math.min(1.0, Math.max(0.0, (rssi + 125) / 85.0));

    if (vuSnrMeter) vuSnrMeter.setProgress(snrNormalized);
    if (vuRssiMeter) vuRssiMeter.setProgress(rssiNormalized);
  }

  function startSignalTimeoutWatcher() {
    setInterval(() => {
      if (lastSignalTime > 0 && Date.now() - lastSignalTime > 3000) {
        lastSignalTime = 0;
        const snrVal = document.getElementById('tvSnrValue');
        const rssiVal = document.getElementById('tvRssiValue');
        if (snrVal) snrVal.innerText = `- dB`;
        if (rssiVal) rssiVal.innerText = `- dBm`;
        if (vuSnrMeter) vuSnrMeter.setProgress(0);
        if (vuRssiMeter) vuRssiMeter.setProgress(0);
      }
    }, 500);
  }

  function startDurationTimer() {
    setInterval(() => {
      if (!isWardriveActive) return;
      const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
      const hours = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');

      const durDash = document.getElementById('tvTripDistDashboard');
      if (durDash) durDash.innerText = `${totalDistanceKm.toFixed(2)} km`;
      const durTime = document.getElementById('tvTripTimeDashboard');
      if (durTime) durTime.innerText = `${hours}:${mins}:${secs}`;
      const durAn = document.getElementById('tvAnalysisTripDuration');
      if (durAn) durAn.innerText = `${hours}:${mins}:${secs}`;
    }, 1000);
  }

  function playNotificationTone(type) {
    if (type === 1) {
      // Message Notification: decoupled from main screen Beep
      const isSoundEnabled = localStorage.getItem('messenger_sound_enabled') !== 'false';
      if (!isSoundEnabled) return;
    } else {
      // Radar or other notification: check main screen Beep
      const cbBeep = document.getElementById('cbBeepEnabled');
      if (!cbBeep || !cbBeep.checked) return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

      const now = sharedAudioCtx.currentTime;

      if (type === 1) {
        // Melodic Crystal Message Chime (D5 -> A5 -> D6)
        const notes = [
          { freq: 587.33, start: 0.00, dur: 0.18, vol: 0.22 },
          { freq: 880.00, start: 0.07, dur: 0.22, vol: 0.25 },
          { freq: 1174.66, start: 0.14, dur: 0.35, vol: 0.28 }
        ];

        notes.forEach(n => {
          const osc = sharedAudioCtx.createOscillator();
          const gain = sharedAudioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.start);

          // Smooth attack and natural bell-like exponential decay
          gain.gain.setValueAtTime(0.001, now + n.start);
          gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

          osc.connect(gain);
          gain.connect(sharedAudioCtx.destination);

          osc.start(now + n.start);
          osc.stop(now + n.start + n.dur);
        });

      } else if (type === 2) {
        // Radar Target Found: Rising sonar sweep (exact MainActivity.kt line 6106)
        const osc1 = sharedAudioCtx.createOscillator();
        const gain1 = sharedAudioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc1.connect(gain1);
        gain1.connect(sharedAudioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.05);

        const osc2 = sharedAudioCtx.createOscillator();
        const gain2 = sharedAudioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, now + 0.07);
        gain2.gain.setValueAtTime(0.2, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc2.connect(gain2);
        gain2.connect(sharedAudioCtx.destination);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.12);

        const osc3 = sharedAudioCtx.createOscillator();
        const gain3 = sharedAudioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(1300, now + 0.14);
        gain3.gain.setValueAtTime(0.25, now + 0.14);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc3.connect(gain3);
        gain3.connect(sharedAudioCtx.destination);
        osc3.start(now + 0.14);
        osc3.stop(now + 0.24);
      }
    } catch (e) {}
  }

  function playSignalBeep(snr) {
    const cbBeep = document.getElementById('cbBeepEnabled');
    if (!cbBeep || !cbBeep.checked) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();

      const freq = Math.min(1800, Math.max(400, 400 + (snr + 15) * 50));
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, sharedAudioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, sharedAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);

      osc.start();
      osc.stop(sharedAudioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  // --- Map Overlays ---
  function renderSignalPointOnMap(item) {
    if (!map || !matchesFilter(item)) return;

    if (item && item.lat && item.lng && parseFloat(item.lat) !== 0 && parseFloat(item.lng) !== 0) {
      mapSignalPoints.push(item);
      updateMapSignalMarkers();
      if (isHeatmapVisible) {
        updateMapHeatmap();
      }
    }
  }

  function createGeoJSONCircle(centerLngLat, radiusInMeters, points = 64) {
    const coords = {
      latitude: centerLngLat[1],
      longitude: centerLngLat[0]
    };
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = km / 110.574;

    let theta, x, y;
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ret]
      }
    };
  }

  let isRangeSpotlightActive = false;
  let isTrajectoryViewActive = false;

  function updateMapSignalMarkers() {
    if (!map) return;

    signalMarkers.forEach(m => m.remove());
    signalMarkers = [];

    // Keep trip signal dots hidden while in Range Spotlight OR Trajectory View mode so map is 100% clean
    if (isRangeSpotlightActive || isTrajectoryViewActive) return;

    if (!mapSignalPoints || mapSignalPoints.length === 0) return;

    const currentZoom = map.getZoom() || 15;

    let dotSize = 18;
    let fontSize = 10;
    if (currentZoom <= 10) {
      dotSize = 12;
      fontSize = 0;
    } else if (currentZoom <= 13) {
      dotSize = 18;
      fontSize = 9;
    } else if (currentZoom <= 15) {
      dotSize = 24;
      fontSize = 11;
    } else if (currentZoom <= 17) {
      dotSize = 30;
      fontSize = 12;
    } else {
      dotSize = 40;
      fontSize = 14;
    }

    const stackedMap = new Map();
    mapSignalPoints.forEach(item => {
      if (!item) return;
      const coords = normalizeLngLat(item);
      if (!coords) return;
      if (!matchesFilter(item)) return;

      const lng = coords[0];
      const lat = coords[1];

      const posKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (!stackedMap.has(posKey)) {
        stackedMap.set(posKey, []);
      }
      stackedMap.get(posKey).push({ ...item, lat: lat, lng: lng });
    });

    stackedMap.forEach((pointsList, posKey) => {
      if (pointsList.length === 0) return;

      const topPoint = pointsList.reduce((max, p) => (p.snr > max.snr ? p : max), pointsList[0]);
      const lng = topPoint.lng;
      const lat = topPoint.lat;
      const color = getSnrColor(topPoint.snr);
      const hexId = (topPoint.nodeId || '').toUpperCase();
      const shortId = hexId.length > 6 ? hexId.substring(0, 6) : hexId;

      const fontRatio = shortId.length > 4 ? 0.30 : 0.38;
      const calculatedFontSize = fontSize > 0 ? Math.max(7, Math.floor(dotSize * fontRatio)) : 0;
      const labelText = calculatedFontSize > 0 ? shortId : '';
      const stackCount = pointsList.length;

      // Check if this specific position matches selected position key OR selected node ID
      const isSelected = selectedLogPositionKey
        ? (posKey === selectedLogPositionKey)
        : (selectedNodeId && pointsList.some(p => p.nodeId && p.nodeId.toUpperCase() === selectedNodeId));

      const borderColor = isSelected ? '#FF1744' : '#FFFFFF';
      const borderWidth = isSelected ? '3.5px' : '2px';
      const boxShadow = '0 2px 6px rgba(0,0,0,0.6)'; // Clean solid border, NO glow!
      const zIndexVal = isSelected ? 999 : 2;
      const transformVal = isSelected ? 'scale(1.18)' : 'scale(1.0)';

      // Draw Stacked Shadow Disks (exact 1:1 match with native Android drawSignalDot)
      let shadowsHtml = '';
      if (stackCount > 1) {
        const numShadows = Math.min(3, stackCount - 1);
        for (let i = numShadows; i >= 1; i--) {
          const offset = i * 3.5;
          shadowsHtml += `
            <div style="position: absolute; top: ${offset}px; left: ${offset}px; width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%; background: rgba(0,0,0,0.55); border: 1.5px solid rgba(255,255,255,0.3); pointer-events: none;"></div>
          `;
        }
      }

      const el = document.createElement('div');
      el.className = 'rx-point-marker';
      el.style.cssText = `cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; width: ${dotSize + 16}px; height: ${dotSize + 16}px;`;
      el.innerHTML = `
        ${shadowsHtml}
        <div class="rx-dot-inside-container" style="position: relative; z-index: ${zIndexVal}; transform: ${transformVal}; width: ${dotSize}px; height: ${dotSize}px; background-color: ${color}; font-size: ${calculatedFontSize}px; font-family: monospace, system-ui, sans-serif; font-weight: 900; letter-spacing: -0.5px; line-height: 1; text-align: center; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; border: ${borderWidth} solid ${borderColor}; box-shadow: ${boxShadow}; transition: transform 0.2s ease, border 0.2s ease; box-sizing: border-box; padding: 0 1px; overflow: hidden; white-space: nowrap;">
          ${labelText}
        </div>
      `;

      el.onclick = (e) => {
        if (e) {
          e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
        }
        selectedNodeId = hexId;
        selectedLogPositionKey = posKey;
        updateMapSignalMarkers();
        if (pointsList.length === 1) {
          showPointInfoWindow(topPoint, [lat, lng]);
        } else {
          showOverlappingPointsModal(pointsList, [lat, lng]);
        }
      };

      el.oncontextmenu = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        selectedNodeId = hexId;
        selectedLogPositionKey = posKey;
        updateMapSignalMarkers();
        if (pointsList.length === 1) {
          showSignalDeepDive(topPoint);
        } else {
          showOverlappingPointsModal(pointsList, [lat, lng]);
        }
      };

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      signalMarkers.push(marker);
    });

    if (isHeatmapVisible) {
      updateMapHeatmap();
    }
  }
  window.updateMapSignalMarkers = updateMapSignalMarkers;

  function updateMapHeatmap() {
    if (!map || !map.getSource('heatmap-src')) return;

    const features = mapSignalPoints
      .filter(p => p && p.lat && p.lng && matchesFilter(p))
      .map(p => {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        const snrNorm = Math.max(0.1, Math.min(1.0, (p.snr + 20) / 40));
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { weight: snrNorm }
        };
      });

    map.getSource('heatmap-src').setData({
      type: 'FeatureCollection',
      features: features
    });
  }

  let activePopupItem = null;

  // --- White Balloon Info Window (1:1 Exact Match with Native Android MainActivity.kt lines 4065-4066) ---
  function showPointInfoWindow(item, latLng) {
    if (!map || !item) return;
    activePopupItem = item;

    const coords = getNodeCoordinates(item) || { lat: parseFloat(latLng ? latLng[0] : 0), lng: parseFloat(latLng ? latLng[1] : 0) };
    if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) return;

    const hexId = (item.nodeId || item.id || '').toUpperCase();
    const posKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    if (hexId && (selectedNodeId !== hexId || selectedLogPositionKey !== posKey)) {
      selectedNodeId = hexId;
      selectedLogPositionKey = posKey;
      updateMapSignalMarkers();
    }

    // Smoothly center map
    isProgrammaticPan = true;
    map.easeTo({ center: [coords.lng, coords.lat + 0.0005], duration: 300 });
    setTimeout(() => { isProgrammaticPan = false; }, 300);

    const color = getSnrColor(item.snr || 0);
    const rawName = findNodeName(item.nodeId);
    const displayName = rawName ? `${rawName} (${hexId})` : hexId;

    const rssiVal = parseInt(item.rssi) || 0;
    const timeVal = item.time || 'N/A';

    const popupContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #121212; padding: 2px; min-width: 170px; max-width: 260px; box-sizing: border-box; cursor: pointer;"
           onclick="showSignalDeepDiveFromLog('${hexId}')"
           oncontextmenu="event.preventDefault(); showSignalDeepDiveFromLog('${hexId}');"
           title="Tap or Long-Press for Signal Deep Dive">
        <div style="font-weight: 800; font-size: 0.92rem; color: #121212; border-bottom: 2px solid ${color}; padding-bottom: 3px; margin-bottom: 4px; word-break: break-word; white-space: normal; line-height: 1.3;">
          ${displayName}
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 3px 8px; font-size: 0.8rem; color: #333333; line-height: 1.3;">
          <span>SNR: <b>${item.snr}dB</b></span>
          ${rssiVal !== 0 ? `<span>RSSI: <b>${rssiVal}dBm</b></span>` : ''}
          <span>Time: <b>${timeVal}</b></span>
        </div>
        <div style="font-size: 0.72rem; color: #00897B; margin-top: 4px; font-weight: bold; text-align: center;">🔬 Tap for Signal Deep Dive</div>
      </div>
    `;

    if (activePopup) {
      try { activePopup.remove(); } catch (e) {}
    }

    activePopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      autoPan: true,
      anchor: 'bottom',
      offset: [0, -18],
      className: 'white-info-window-popup'
    })
      .setLngLat([coords.lng, coords.lat])
      .setHTML(popupContent)
      .addTo(map);
  }
  window.showPointInfoWindow = showPointInfoWindow;

  // --- Stacked Signals Chooser Modal (1:1 Match with Android showOverlappingPointsDialog) ---
  function showOverlappingPointsModal(matchingPoints, latLng) {
    if (!matchingPoints || matchingPoints.length === 0) return;

    let modal = document.getElementById('modalStackedSignals');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalStackedSignals';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
          <div class="modal-header">
            <h2 id="stackedModalTitle">📡 Stacked Signals</h2>
            <span class="close-modal" onclick="document.getElementById('modalStackedSignals').classList.remove('active')">&times;</span>
          </div>
          <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
            <p style="font-size: 0.8rem; color: #888; text-align: center; margin-bottom: 12px;">Tap a measurement to open white info balloon on map</p>
            <ul id="listStackedSignals" class="data-list-full"></ul>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = modal.querySelector('#stackedModalTitle');
    if (titleEl) titleEl.innerText = `📡 Stacked Signals (${matchingPoints.length})`;

    const listEl = modal.querySelector('#listStackedSignals');
    if (listEl) {
      let html = '';
      matchingPoints.forEach((point, idx) => {
        const color = getSnrColor(point.snr);
        const name = findNodeName(point.nodeId);
        const displayName = name ? `${name} (${point.nodeId})` : point.nodeId;

        html += `
          <li class="data-list-item" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);" onclick="selectStackedSignalPoint(${idx})">
            <div>
              <div style="font-weight: bold; color: #FFFFFF; font-size: 0.9rem;">${displayName}</div>
              <div style="font-size: 0.75rem; color: #AAA;">⏱️ ${point.time || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.5); color: ${color}; font-weight: bold; font-size: 0.85rem;">${point.snr} dB</span>
              <div style="font-size: 0.75rem; color: #888;">${point.rssi} dBm</div>
            </div>
          </li>
        `;
      });
      listEl.innerHTML = html;
    }

    window.currentStackedPoints = matchingPoints;
    window.selectStackedSignalPoint = (idx) => {
      modal.classList.remove('active');
      if (window.currentStackedPoints && window.currentStackedPoints[idx]) {
        const p = window.currentStackedPoints[idx];
        showBestSeenReceptionOnMap(p);
      }
    };

    modal.classList.add('active');
  }

  // --- Role Checkers (1:1 Exact Match with MainActivity.kt lines 5810-5825) ---
  function isUserRole(role) {
    return role === 1 || role === 3;
  }

  function isRepeaterRole(role) {
    return role === 2 || role === null || role === undefined || role === 0;
  }

  function isNodeARepeater(node) {
    if (!node) return false;
    const idStr = (node.id || '').toString().trim().toUpperCase();
    const nameStr = (node.name || '').toString().trim().toUpperCase();

    if (isRepeaterRole(node.role)) return true;
    if (idStr.length === 4 || idStr.length === 6) return true;
    if (nameStr.includes("REPEATER") || nameStr.includes("RPT") || nameStr.includes("REPEAT")) return true;

    return false;
  }
  window.isNodeARepeater = isNodeARepeater;

  function refreshRepeaterMarkersLayer() {
    if (!map) return;

    repeaterMarkers.forEach(m => m.remove());
    repeaterMarkers = [];

    if (!isRepeatersVisible) return;

    const zoom = map.getZoom() || 13;
    let iconPx = 14;
    if (zoom <= 10) iconPx = 10;
    else if (zoom <= 12) iconPx = 13;
    else if (zoom <= 14) iconPx = 16;
    else iconPx = 20;

    const repeaterMap = new Map();

    locatedNodes.forEach((node, key) => {
      if (!node) return;
      const idStr = (node.id || key || '').toString().trim().toUpperCase();
      if (!idStr) return;

      const lat = parseFloat(node.lat || node.latitude || 0);
      const lng = parseFloat(node.lng || node.longitude || 0);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      if (!isNodeARepeater(node)) return;

      repeaterMap.set(idStr, {
        id: idStr,
        name: findNodeName(idStr) || node.name || idStr,
        role: node.role || 2,
        lat: lat,
        lng: lng
      });
    });

    bestSeenMap.forEach((item, key) => {
      if (!item) return;
      const idStr = (item.nodeId || key || '').toString().trim().toUpperCase();
      if (!idStr) return;

      const lat = parseFloat(item.lat || 0);
      const lng = parseFloat(item.lng || 0);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      if (idStr.length === 4 || idStr.length === 6) {
        if (!repeaterMap.has(idStr)) {
          repeaterMap.set(idStr, {
            id: idStr,
            name: findNodeName(idStr) || idStr,
            role: 2,
            lat: lat,
            lng: lng
          });
        }
      }
    });

    repeaterMap.forEach((node) => {
      if (!matchesFilter({ nodeId: node.id, id: node.id, ...node })) return;

      const roleIcon = node.role === 3 ? '🏠' : (node.role === 4 ? '🌡️' : '📡');

      const el = document.createElement('div');
      el.className = 'repeater-icon';
      el.style.cssText = `font-size: ${iconPx}px; line-height: 1; text-align: center; filter: drop-shadow(0 0 4px #00FFC8); text-shadow: 0 0 4px #00FFC8; cursor: pointer;`;
      el.innerHTML = roleIcon;

      el.onclick = (e) => {
        e.stopPropagation();
        highlightContactOnMap(node);
      };

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      repeaterMarkers.push(marker);
    });
  }

  function addRepeaterMarkerToMap(lat, lng, name, id) {
    if (!map || lat === 0 || lng === 0 || typeof L === 'undefined') return;
    refreshRepeaterMarkersLayer();
  }

  function getSnrColor(snr) {
    if (snr >= 10) return '#00E676';
    if (snr >= 5)  return '#4CAF50';
    if (snr >= 0)  return '#8BC34A';
    if (snr >= -4) return '#CDDC39';
    if (snr >= -8) return '#FFEB3B';
    if (snr >= -12) return '#FFC107';
    if (snr >= -16) return '#FF9800';
    return '#FF5722';
  }

  function findSignalDetailsAt(lat, lng) {
    if (!mapSignalPoints || mapSignalPoints.length === 0) return;
    const searchRadiusDeg = 0.0015;
    const candidate = mapSignalPoints.find(pt =>
      Math.abs(pt.lat - lat) < searchRadiusDeg &&
      Math.abs(pt.lng - lng) < searchRadiusDeg
    );

    if (candidate) {
      showSignalDeepDive(candidate);
    }
  }

  function showContactOptionsMenu(node) {
    if (!node) return;
    window.currentSelectedNode = node;

    const modalOptionsBody = document.getElementById('detailsBody');
    if (!modalOptionsBody) return;

    const hexId = node.id.toUpperCase();
    const foundName = (node.name && node.name !== hexId) ? node.name : findNodeName(hexId);
    const dispName = foundName ? `${foundName} (${hexId})` : hexId;

    const coords = getNodeCoordinates(node);
    const canMessage = isUserRole(node.role) || node.role === null || node.role === undefined || node.role === 0;

    let optionsHtml = `
      <div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <h3 style="color: #4CAF50; font-size: 1.1rem; margin-bottom: 2px;">${dispName}</h3>
        <span style="color: #AAA; font-size: 0.75rem;">Contact Options</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active'); showContactDetailsDialog(window.currentSelectedNode);">ℹ️ Contact Info</button>
    `;

    if (canMessage) {
      optionsHtml += `
        <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #00FFC8; border: 1px solid #00FFC8; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active'); openDirectMessageWithNode(window.currentSelectedNode);">💬 Send Message</button>
      `;
    }

    if (coords) {
      optionsHtml += `
        <button class="btn btn-secondary" style="text-align: left; padding: 12px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="copyContactCoords(window.currentSelectedNode);">📋 Copy Coordinates</button>
      `;
    }

    optionsHtml += `
        <br>
        <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-weight: bold; background: #222; color: #888; border: 1px solid #333; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active');">Cancel</button>
      </div>
    `;

    modalOptionsBody.innerHTML = optionsHtml;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  function copyContactCoords(node) {
    const coords = getNodeCoordinates(node);
    if (!coords) return;
    const coordsStr = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(coordsStr);
    }
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');
  }

  function openDirectMessageWithNode(node) {
    if (!node) return;
    const pk = node.publicKey || node.pubKey || node.public_key || "";
    const fullId = (pk && pk.length >= 12) ? pk.substring(0, 12).toUpperCase() : (node.id ? node.id.toUpperCase() : "");
    activeDirectNodeId = fullId;
    activeDirectNodeName = node.name || fullId;
    switchNavTab('chat');
  }

  function showContactDetailsDialog(node) {
    if (!node) return;
    window.currentSelectedNode = node;

    const detailsBody = document.getElementById('detailsBody');
    if (!detailsBody) return;

    const hexId = node.id.toUpperCase();
    const nodeName = (node.name && node.name !== hexId) ? node.name : findNodeName(hexId) || "Unknown Node";

    const roleStr = node.role === 1 ? "User (👤)"
      : (node.role === 2 ? "Repeater (📡)"
      : (node.role === 3 ? "Room Server (🏠)"
      : (node.role === 4 ? "Sensor (🌡️)" : "Unspecified / Standard")));

    const coords = getNodeCoordinates(node);
    let distText = "Unknown";
    if (lastGpsPosition && coords) {
      const distKm = calculateDistanceKm(lastGpsPosition.lat, lastGpsPosition.lng, coords.lat, coords.lng);
      if (distKm < 1.0) {
        distText = `${Math.round(distKm * 1000)} m`;
      } else {
        distText = `${distKm.toFixed(2)} km`;
      }
    }

    const latestSignal = Array.from(bestSeenMap.values()).find(s => s.nodeId.toUpperCase() === hexId)
      || allReceivedLogs.find(s => s.nodeId.toUpperCase() === hexId);

    let html = `
      <div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <h3 style="color: #4CAF50; font-size: 1.1rem; margin-bottom: 2px;">👤 Contact Info</h3>
        <span style="color: #FFF; font-size: 0.9rem; font-weight: bold;">${nodeName}</span>
      </div>
    `;

    function addDetailRow(label, value, valueColor = null) {
      if (value === null || value === undefined || value === "") return;
      const valStr = valueColor ? `<span style="color: ${valueColor}; font-weight: bold;">${value}</span>` : value;
      html += `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;"><strong style="color: #AAA;">${label}:</strong> ${valStr}</div>`;
    }

    addDetailRow("Name", nodeName);
    addDetailRow("Node ID", hexId);
    addDetailRow("Role / Type", roleStr);

    if (node.publicKey) {
      addDetailRow("Public Key", node.publicKey.toUpperCase(), "#00FFC8");
    }

    if (coords) {
      addDetailRow("Coordinates", `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      addDetailRow("Distance", distText, "#00E5FF");
    } else {
      addDetailRow("Coordinates", "No location fix");
    }

    if (node.lastSeen) {
      const seenTimeStr = typeof node.lastSeen === 'number' ? new Date(node.lastSeen).toLocaleString() : node.lastSeen;
      addDetailRow("Last Seen", seenTimeStr);
    }

    if (latestSignal) {
      addDetailRow("Latest Peak SNR", `${latestSignal.snr} dB`, getSnrColor(latestSignal.snr));
      if (latestSignal.time) {
        addDetailRow("Latest Reception Time", latestSignal.time);
      }
    }

    html += `<br><div style="display: flex; flex-direction: column; gap: 8px;">`;

    if (node.publicKey) {
      html += `
        <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-weight: bold; background: #1A3A3A; color: #00FFC8; border: 1px solid #00FFC8; border-radius: 6px;" onclick="copyContactPublicKey(window.currentSelectedNode);">📋 Copy Public Key</button>
      `;
    }

    if (coords) {
      html += `
        <button class="btn btn-primary" style="width: 100%; padding: 10px; font-weight: bold;" onclick="document.getElementById('modalDetails').classList.remove('active'); highlightContactOnMap(window.currentSelectedNode);">🗺️ Show Contact on Map</button>
      `;
    }

    html += `
      <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active');">OK</button>
    </div>`;

    detailsBody.innerHTML = html;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  function copyContactPublicKey(node) {
    if (!node || (!node.publicKey && !node.pubKey)) return;
    const pkStr = (node.publicKey || node.pubKey).toUpperCase();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pkStr);
    }
  }

  function getTrajectoryDataForPath(item) {
    if (!item) return [];
    const hops = [];

    // Pre-decode meshPacket from rawHex if missing on loaded/imported CSV item (exact MainActivity.kt line 3847)
    let meshPacket = item ? item.meshPacket : null;
    if (!meshPacket && item && item.rawHex && typeof ProtocolDecoder !== 'undefined') {
      meshPacket = ProtocolDecoder.decodeRawHex(item.rawHex);
      if (meshPacket) item.meshPacket = meshPacket;
    }

    const pathList = (meshPacket && meshPacket.path && Array.isArray(meshPacket.path)) ? meshPacket.path : [];

    // Strictly filter out 1-byte IDs (length < 4). Require 2-byte+ hex IDs (length 4, 6 or 12+)
    const valid2or3ByteHops = pathList.filter(h => typeof h === 'string' && h.trim().length >= 4);

    const nodesArr = Array.from(locatedNodes.values());

    if (valid2or3ByteHops.length > 0) {
      // 1. Packet HAS intermediate repeater hops: resolve EACH hop hash in order (DO NOT duplicate origin node!)
      valid2or3ByteHops.forEach(hopHash => {
        const cleanHash = hopHash.trim().toUpperCase();
        if (cleanHash.length < 4) return;

        const match = nodesArr.find(contact => {
          if (!contact.lat || !contact.lng || (contact.lat === 0 && contact.lng === 0)) return false;
          const cId = (contact.id || '').trim().toUpperCase();
          if (cId.length < 4) return false;
          const cPk = (contact.publicKey || '').trim().toUpperCase();
          return cId.startsWith(cleanHash) || cleanHash.startsWith(cId) || (cPk && cPk.startsWith(cleanHash));
        });

        if (match) {
          const cCoords = getNodeCoordinates(match);
          if (cCoords) {
            const name = match.name || match.id;
            const isDuplicate = hops.some(h => (calculateDistanceKm(h.lat, h.lng, cCoords.lat, cCoords.lng) * 1000) < 5.0);
            if (!isDuplicate) {
              const stepType = hops.length === 0 ? 0 : 1;
              hops.push({ name, id: cleanHash, lat: cCoords.lat, lng: cCoords.lng, stepType });
            }
          }
        }
      });
    } else {
      // 2. Direct 0-hop packet: ONLY add Origin Node when path list is empty!
      const srcId = (item.nodeId || (meshPacket && meshPacket.lastHopId) || '').trim().toUpperCase();
      if (srcId.length >= 4) {
        const originNode = nodesArr.find(c => c.id && c.id.trim().toUpperCase().length >= 4 && isSameNodeId(c.id, srcId) && c.lat !== 0 && c.lng !== 0);
        if (originNode) {
          const cCoords = getNodeCoordinates(originNode);
          if (cCoords) {
            hops.push({ name: originNode.name || srcId, id: srcId, lat: cCoords.lat, lng: cCoords.lng, stepType: 0 });
          }
        }
      }
    }

    // 3. Final Step: Car / Receiver Position (RX location - exact MainActivity.kt line 3820)
    const rxLat = parseFloat(item.lat || 0);
    const rxLng = parseFloat(item.lng || 0);
    if (!isNaN(rxLat) && !isNaN(rxLng) && rxLat !== 0 && rxLng !== 0) {
      const isDuplicateWithLast = hops.length > 0 && (calculateDistanceKm(hops[hops.length - 1].lat, hops[hops.length - 1].lng, rxLat, rxLng) * 1000) < 5.0;
      if (!isDuplicateWithLast) {
        hops.push({ name: "Car GPS", id: "AUTO", lat: rxLat, lng: rxLng, stepType: 2 });
      }
    }

    return hops;
  }

  window.showSignalDeepDiveFromLog = (nodeId) => {
    if (!nodeId) return;
    if (activePopupItem && isSameNodeId(activePopupItem.nodeId, nodeId)) {
      showSignalDeepDive(activePopupItem);
      return;
    }
    const hexId = nodeId.trim().toUpperCase();
    const item = Array.from(bestSeenMap.values()).find(s => isSameNodeId(s.nodeId, hexId)) ||
                 allReceivedLogs.find(l => isSameNodeId(l.nodeId, hexId));
    if (item) {
      showSignalDeepDive(item);
    } else {
      showSignalDeepDive({ nodeId: hexId, snr: 0, rssi: -100, time: '' });
    }
  };

  async function showSignalDeepDive(item) {
    if (!item) return;
    window.currentDeepDiveItem = item;

    // 0. Pre-decode rawHex into meshPacket if missing (exact MainActivity.kt line 3847 & 9387)
    if (!item.meshPacket && item.rawHex && typeof ProtocolDecoder !== 'undefined') {
      item.meshPacket = ProtocolDecoder.decodeRawHex(item.rawHex);
    }

    const detailsBody = document.getElementById('detailsBody');
    if (!detailsBody) return;

    let html = "";

    function addDetailRow(label, value, valueColor = null) {
      if (value === null || value === undefined || value === "") return;
      const valStr = valueColor ? `<span style="color: ${valueColor}; font-weight: bold;">${value}</span>` : value;
      html += `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;"><strong style="color: #AAA;">${label}:</strong> ${valStr}</div>`;
    }

    const meshPacket = item.meshPacket || (item.rawHex && typeof ProtocolDecoder !== 'undefined' ? ProtocolDecoder.decodeRawHex(item.rawHex) : null);

    // 1. RF Radio Telemetry
    if (item.snr !== undefined) addDetailRow("SNR", `${item.snr} dB`);
    if (item.rssi !== undefined) addDetailRow("RSSI", `${item.rssi} dBm`);

    // 2. Est. Position (RSSI) if location not known from Advert / Contact
    const hexId = (item.nodeId || '').toUpperCase();
    const nodeObj = Array.from(locatedNodes.values()).find(n => n.id.toUpperCase() === hexId);
    const hasKnownLoc = (nodeObj && nodeObj.lat !== 0 && nodeObj.lng !== 0) || (item.lat !== 0 && item.lng !== 0);

    if (!hasKnownLoc && typeof window.calculateEstimatedRepeaterLocation === 'function') {
      const estTrilateration = window.calculateEstimatedRepeaterLocation(hexId);
      if (estTrilateration) {
        addDetailRow("Est. Position (RSSI)", `${estTrilateration.estimatedPos.lat.toFixed(6)}, ${estTrilateration.estimatedPos.lng.toFixed(6)} (±${Math.round(estTrilateration.confidenceRadiusMeters)}m, ${estTrilateration.sampleCount} samples)`, "#00FFC8");
      }
    }

    // 3. Packet Routing & Header (Exact MainActivity.kt lines 9295-9325)
    if (meshPacket) {
      const routeStr = meshPacket.routeType === 0 ? "0x00 (Flood)"
        : (meshPacket.routeType === 1 ? "0x01 (Direct)"
        : (meshPacket.routeType === 2 ? "0x02 (Local/Zero-Hop)"
        : (meshPacket.routeType === 3 ? "0x03 (Transport Direct)"
        : `0x${meshPacket.routeType.toString(16).padStart(2, '0').toUpperCase()}`)));

      addDetailRow("Route Type", routeStr);
      if (meshPacket.payloadVersion !== undefined) addDetailRow("Payload Version", `${meshPacket.payloadVersion}`);

      const realHopsCount = (meshPacket.path && meshPacket.path.length > 0) ? meshPacket.path.length : (meshPacket.hopCount >= 0 ? meshPacket.hopCount : '-');
      addDetailRow("Hops Count", `${realHopsCount}`);

      if (meshPacket.lastHopId) addDetailRow("Last Hop Node", meshPacket.lastHopId);

      // Full Repeater Path Box (Exact 1:1 match with MainActivity.kt lines 9287-9365)
      if (meshPacket.path && meshPacket.path.length > 0) {
        const valid2or3ByteHops = meshPacket.path.filter(p => typeof p === 'string' && p.trim().length >= 4);
        const pathHops = getTrajectoryDataForPath(item);
        // Only clickable if valid 2-byte+ hops exist AND at least 2 GPS coordinates on map
        const isPathClickable = valid2or3ByteHops.length > 0 && pathHops.length >= 2;
        const pathText = meshPacket.path.join(" → ");

        html += `
          <div style="background: ${isPathClickable ? '#1A3A3A' : '#2A2A2A'}; border: 1px solid ${isPathClickable ? '#00FFC8' : '#444'}; border-radius: 6px; padding: 8px; margin: 8px 0; ${isPathClickable ? 'cursor: pointer;' : ''}" ${isPathClickable ? 'onclick="if(window.currentDeepDiveItem){ document.getElementById(\'modalDetails\').classList.remove(\'active\'); drawTrajectoryPath(window.currentDeepDiveItem); }"' : ''}>
            <div style="color: ${isPathClickable ? '#4CAF50' : '#AAA'}; font-size: 0.8rem; font-weight: bold; margin-bottom: 4px;">🗺️ Full Repeater Path ${isPathClickable ? '<span style="color:#00FFC8;">(Click to show on map)</span>' : ''}</div>
            <div style="color: ${isPathClickable ? '#00FFC8' : '#FFF'}; font-family: monospace; font-size: 0.85rem; word-break: break-all;">${pathText}</div>
          </div>
        `;
      }

      if (meshPacket.messageHash !== undefined && meshPacket.messageHash !== null) {
        addDetailRow("Message Hash", `0x${(meshPacket.messageHash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`);
      }

      // Payload Specifics (Advert, AnonReq, TxtMsg - Exact MainActivity.kt lines 9370-9420)
      if (meshPacket.payload) {
        const p = meshPacket.payload;
        if (p.name) addDetailRow("Advert Node Name", p.name);
        if (p.publicKey) addDetailRow("Public Key", p.publicKey.toUpperCase());
        if (p.role !== undefined || p.flags !== undefined) {
          const roleVal = p.role !== undefined ? p.role : (p.flags & 0x0F);
          const roleStr = roleVal === 1 ? "User (👤)"
            : (roleVal === 2 ? "Repeater (📡)"
            : (roleVal === 3 ? "Room Server (🏠)"
            : (roleVal === 4 ? "Sensor (🌡️)" : `Standard (0x${roleVal.toString(16).toUpperCase()})`)));
          addDetailRow("Node Role / Flags", roleStr);
        }
        if (p.lat && p.lng && p.lat !== 0 && p.lng !== 0) {
          addDetailRow("Advert GPS Coords", `Lat: ${p.lat.toFixed(5)}, Lon: ${p.lng.toFixed(5)}`);
        }
        if (p.text) {
          addDetailRow("Txt Msg Payload", p.text, "#FFEB3B");
        }
      }
    }

    // Node ID & Protocol Types (Exact MainActivity.kt lines 9425-9450)
    addDetailRow("Node ID", hexId);
    if (item.sourceId && item.sourceId.toUpperCase() !== hexId) {
      addDetailRow("Source ID", item.sourceId.toUpperCase());
    }

    const pType = meshPacket ? meshPacket.payloadType : item.payloadType;
    if (pType !== undefined && pType !== null) {
      const typeHex = "0x" + pType.toString(16).padStart(2, '0').toUpperCase();
      const pName = ProtocolDecoder ? ProtocolDecoder.getSignalTypeName(pType) : "SIGNAL";
      addDetailRow("Payload Type", `${typeHex} (${pName})`);
    }

    const resolvedName = findNodeName(hexId);
    if (resolvedName) addDetailRow("Resolved Node Name", resolvedName);

    // Message Decryption / Extraction (Exact 1:1 match with MainActivity.kt lines 9375-9460)
    let extractedMsg = item.decryptedContent || item.message || item.text || item.body;

    if (!extractedMsg && meshPacket && meshPacket.payload) {
      const p = meshPacket.payload;
      if (p.text) {
        extractedMsg = p.text;
      } else if (p.body) {
        extractedMsg = p.body;
      } else if (p.rawPayload && p.rawPayload.length >= 6 && typeof ProtocolDecoder !== 'undefined') {
        // Attempt AES channel decryption (exact MainActivity.kt line 9387)
        const encrypted = p.rawPayload.slice(1);
        const channels = (window.syncedChannels && window.syncedChannels.length > 0) ? window.syncedChannels : [{ psk: DEFAULT_PUBLIC_PSK }];
        for (const ch of channels) {
          const psk = (ch.psk && Array.isArray(ch.psk) && ch.psk.some(b => b !== 0)) ? ch.psk : DEFAULT_PUBLIC_PSK;
          try {
            const decrypted = await ProtocolDecoder.Crypto.decryptAES(psk, encrypted);
            if (decrypted && decrypted.length >= 5) {
              const textBytes = decrypted.slice(5);
              const textRaw = new TextDecoder("utf-8").decode(textBytes).split('\0')[0];
              const decodedText = ProtocolDecoder.tryDecodePrefixed(textRaw);
              const { sender, body } = ProtocolDecoder.splitSenderAndText(decodedText);
              extractedMsg = sender ? `${sender}: ${body}` : body;
              if (extractedMsg) {
                item.decryptedContent = extractedMsg;
                break;
              }
            }
          } catch (e) {}
        }
      }
    }

    if (extractedMsg && typeof ProtocolDecoder !== 'undefined') {
      extractedMsg = ProtocolDecoder.cleanPrintableString(extractedMsg);
    }

    if (extractedMsg && extractedMsg.trim().length > 0) {
      addDetailRow("Decrypted Content", extractedMsg.trim(), "#FFEB3B");
    }

    if (item.time) addDetailRow("Time", item.time);
    if (item.lat && item.lng && (parseFloat(item.lat) !== 0 || parseFloat(item.lng) !== 0)) {
      addDetailRow("GPS Position", `Lat: ${parseFloat(item.lat).toFixed(5)}, Lon: ${parseFloat(item.lng).toFixed(5)}`);
    }

    if (item.rawHex) {
      html += `<div style="padding: 4px 0; margin-top: 6px; font-size: 0.85rem;"><strong style="color: #AAA;">Raw Hex:</strong> <code style="word-break: break-all; color:#00FFC8; font-size: 0.8rem;">${item.rawHex}</code></div>`;
    }

    html += `
      <br>
      <button class="btn btn-secondary" style="width: 100%; padding: 10px; font-size: 0.9rem; font-weight: bold; background: #2A2A2A; color: #FFF; border: 1px solid #444; border-radius: 6px;" onclick="document.getElementById('modalDetails').classList.remove('active');">OK</button>
    `;

    detailsBody.innerHTML = html;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.add('active');
  }

  let currentTrajectoryItem = null;

  function renderTrajectoryOnMap() {
    if (!map || !currentTrajectoryItem) return;

    trajectoryMarkers.forEach(m => m.remove());
    trajectoryMarkers = [];

    const hops = getTrajectoryDataForPath(currentTrajectoryItem);
    if (hops.length < 2) return;

    const currentZoom = map.getZoom() || 14;
    const zoomScale = Math.min(1.15, Math.max(0.35, (currentZoom - 9) / (17 - 9)));

    const dotDiameter = Math.max(12, Math.round(24 * zoomScale));
    const stepFontSize = Math.max(8, Math.round(12 * zoomScale));
    const labelFontSize = Math.max(9, Math.round(11 * zoomScale));

    const coordinates = hops.map(h => [h.lng, h.lat]);

    const lineFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };

    if (map.getSource('trajectory-src')) {
      map.getSource('trajectory-src').setData({
        type: 'FeatureCollection',
        features: [lineFeature]
      });
    }

    hops.forEach((hop, idx) => {
      const color = hop.stepType === 0 ? '#00E676' : (hop.stepType === 1 ? '#00E5FF' : '#FF1744');
      const dispName = (zoomScale >= 0.65 && hop.name && hop.name !== hop.id) ? `${hop.id} (${hop.name})` : hop.id;

      const dotEl = document.createElement('div');
      dotEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer;">
          <div style="font-family: system-ui, sans-serif; font-size: ${labelFontSize}px; font-weight: 800; color: #FFF; -webkit-text-stroke: 3px #000; paint-order: stroke fill; white-space: nowrap; margin-bottom: 3px;">
            ${dispName}
          </div>
          <div style="width: ${dotDiameter}px; height: ${dotDiameter}px; border-radius: 50%; background-color: ${color}; border: 2px solid #FFF; box-shadow: 0 0 6px ${color}, 0 2px 4px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #000; font-weight: 900; font-size: ${stepFontSize}px;">
            ${idx + 1}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: dotEl, anchor: 'bottom' })
        .setLngLat([hop.lng, hop.lat])
        .addTo(map);

      trajectoryMarkers.push(marker);
    });
  }

  function handleTrajectoryZoom() {
    if (currentTrajectoryItem) {
      renderTrajectoryOnMap();
    }
  }

  function drawTrajectoryPath(item) {
    if (!map) return;

    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) modalDetails.classList.remove('active');
    if (activePopup) {
      try { activePopup.remove(); } catch (e) {}
      activePopup = null;
    }

    window.currentDeepDiveItem = item;
    currentTrajectoryItem = item;

    const hops = getTrajectoryDataForPath(item);
    if (hops.length < 2) {
      showToastMessage("⚠️ Insufficient known 2-byte+ GPS points for this repeater path.");
      return;
    }

    switchNavTab('map');
    suppressBackgroundSignalLayers();
    renderTrajectoryOnMap();

    // Lock programmatic pan so moveend event listeners do NOT interrupt/cancel fitBounds!
    isProgrammaticPan = true;
    map.resize();

    setTimeout(() => {
      if (!map) return;
      map.resize();

      const lngs = hops.map(h => h.lng);
      const lats = hops.map(h => h.lat);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);

      const dMeters = calculateDistanceKm(minLat, minLng, maxLat, maxLng) * 1000;

      if (dMeters < 50) {
        // Very close points (< 50m) -> fly directly to center point with close zoom 16.5
        map.flyTo({
          center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
          zoom: 16.5,
          duration: 600
        });
      } else {
        // Fit camera smoothly around all hop coordinates with compact 25px padding so it zooms in close in all modes!
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
          padding: { top: 25, bottom: 25, left: 20, right: 20 },
          maxZoom: 17.0,
          duration: 800
        });
      }
      setTimeout(() => { isProgrammaticPan = false; }, 900);
    }, 60);

    map.off('zoomend', handleTrajectoryZoom);
    map.on('zoomend', handleTrajectoryZoom);
  }

  // --- Filtering Logic (Exact 1:1 Match with MainActivity.kt lines 4479 & 6276) ---
  function isTargetNode(id) {
    if (!filters.targetIds || filters.targetIds.length === 0) return true;
    if (!id) return false;
    const cleanId = id.toUpperCase().trim();

    // Exact match required for 2, 4, 6 char IDs
    if (filters.targetIds.includes(cleanId)) return true;

    // Full 12-char IDs can be matched by 2, 4 or 6 char short IDs
    if (cleanId.length === 12) {
      for (const target of filters.targetIds) {
        if ((target.length === 2 || target.length === 4 || target.length === 6) && cleanId.startsWith(target)) {
          return true;
        }
      }
    }

    return false;
  }
  window.isTargetNode = isTargetNode;

  function matchesFilter(item) {
    const cbFocus = document.getElementById('cbFocusEnabled');
    if (cbFocus && !cbFocus.checked) return true;

    if (!item) return false;

    // Extract Node ID (supports string ID, SignalLog item, or LocatedNode)
    const nodeId = typeof item === 'string' ? item : (item.nodeId || item.id || '');
    if (!nodeId) return false;

    const cleanId = nodeId.toUpperCase().trim();

    // 1. Target Focus IDs (exact match or 12-char prefix match via isTargetNode)
    if (filters.targetIds && filters.targetIds.length > 0) {
      if (!isTargetNode(cleanId)) return false;
    }

    // 2. ID Length
    if (filters.idLength && filters.idLength > 0) {
      const len = cleanId.length;
      if (filters.idLength === 1 && len !== 2) return false;
      if (filters.idLength === 2 && len !== 4) return false;
      if (filters.idLength === 3 && len !== 6) return false;
      if (filters.idLength === 6 && len < 12) return false;
    }

    // 3. Traffic / Payload Type
    if (filters.trafficType && filters.trafficType > 0) {
      const pType = item.meshPacket ? item.meshPacket.payloadType : (item.payloadType !== undefined && item.payloadType !== null ? item.payloadType : null);
      if (pType !== null) {
        if (filters.trafficType === 14) { // Discover (0x0E or 0x8E)
          if (pType !== 0x0E && pType !== 0x8E && pType !== 14) return false;
        } else if (pType !== filters.trafficType) {
          return false;
        }
      } else {
        // Exclude items with unknown payload type when traffic filter is active
        return false;
      }
    }

    // 4. Zero Hop Only
    if (filters.zeroHopOnly) {
      const hops = item.meshPacket ? item.meshPacket.hopCount : (item.hopCount !== undefined ? item.hopCount : (item.hops !== undefined ? item.hops : -1));
      if (hops > 0) return false;
    }

    return true;
  }
  window.matchesFilter = matchesFilter;

  // --- Repeater Trilateration Run ---
  window.runRepeaterTrilateration = () => {
    const targetInput = document.getElementById('filterTargetIds');
    const targetStr = targetInput ? targetInput.value.trim() : '';

    if (!targetStr) {
      alert("⚠️ Please enter a Target Repeater ID in Target Focus IDs above first.");
      return;
    }

    const targetId = targetStr.split(',')[0].trim();
    const result = TrilaterationEngine.calculateEstimatedRepeaterLocation(targetId, allReceivedLogs);

    if (!result) {
      alert(`⚠️ Insufficient historical zero-hop receptions (< 3 direct points) for '${targetId}'.`);
      return;
    }

    window.closeFilterHub();
    switchNavTab('map');
    showTrilaterationOnMap(result.estimatedPos.lat, result.estimatedPos.lng, result.confidenceRadiusMeters, targetId);
  };

  function showTrilaterationOnMap(lat, lng, confidenceRadius, targetId) {
    if (!map) return;
    clearTemporaryMarkers();

    const el = document.createElement('div');
    el.innerHTML = `🎯`;
    el.style.cssText = 'font-size: 30px; cursor: pointer; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));';

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);

    trilaterationMarkers.push(marker);

    const circlePoly = createGeoJSONCircle([lng, lat], confidenceRadius);
    if (map.getSource('trilateration-src')) {
      map.getSource('trilateration-src').setData(circlePoly);
    }

    switchNavTab('map');
    isFollowingGps = false;
    updateRecenterButtonUI();

    map.flyTo({
      center: [lng, lat],
      zoom: 16,
      bearing: 0,
      pitch: 0
    });
  }

  // --- UI Lists Filter Modes (Exact Android Cycle Logic) ---
  window.toggleBestSeenMode = () => {
    bestSeenFilterMode = (bestSeenFilterMode + 1) % 2;
    updateUILists();
  };

  window.toggleNodeListFilterMode = () => {
    nodeListFilterMode = (nodeListFilterMode + 1) % 3;
    updateUILists();
  };

  let spotlightCanvasOverlay = null;
  let activeSpotlightCenter = null;
  let activeSpotlightRadiusMeters = 0;

  function updateRadialSpotlightCanvas() {
    if (!activeSpotlightCenter || !map) {
      if (spotlightCanvasOverlay) spotlightCanvasOverlay.style.display = 'none';
      return;
    }

    let canvas = spotlightCanvasOverlay;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'spotlightCanvasOverlay';
      canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;';
      const container = document.getElementById('mapContainer') || document.body;
      container.appendChild(canvas);
      spotlightCanvasOverlay = canvas;
    }

    canvas.style.display = 'block';

    const dpr = window.devicePixelRatio || 1;
    const rect = map.getContainer().getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Center point in pixels
    const centerPx = map.project([activeSpotlightCenter.lng, activeSpotlightCenter.lat]);
    const cx = centerPx.x;
    const cy = centerPx.y;

    // Radius in pixels
    const latRad = activeSpotlightCenter.lat * Math.PI / 180;
    const metersPerDegLng = 111320 * Math.cos(latRad);
    const circleEdgeLng = activeSpotlightCenter.lng + (activeSpotlightRadiusMeters / (metersPerDegLng || 111320));
    const edgePx = map.project([circleEdgeLng, activeSpotlightCenter.lat]);
    const radiusPx = Math.max(10, Math.sqrt(Math.pow(edgePx.x - cx, 2) + Math.pow(edgePx.y - cy, 2)));

    // Exact 1:1 Match with Native Android MainActivity.kt line 5085 RadialGradient (All addColorStop values strictly in [0.0, 1.0])
    const maxRadiusPx = Math.max(20, radiusPx * 1.45);
    const r1Ratio = Math.min(0.70, (radiusPx * 0.74) / maxRadiusPx);
    const r2Ratio = Math.min(0.85, (radiusPx * 0.92) / maxRadiusPx);
    const r3Ratio = Math.min(0.95, radiusPx / maxRadiusPx);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadiusPx);
    grad.addColorStop(0.00, 'rgba(8, 8, 8, 0.00)');     // 0% dark inside circle (100% bright, crisp, clear map)
    grad.addColorStop(r1Ratio, 'rgba(8, 8, 8, 0.00)');  // 100% clear until near circle boundary
    grad.addColorStop(r2Ratio, 'rgba(8, 8, 8, 0.22)');  // Soft 22% dimming near circle boundary
    grad.addColorStop(r3Ratio, 'rgba(8, 8, 8, 0.55)');  // 55% dimming right at circle boundary
    grad.addColorStop(1.00, 'rgba(8, 8, 8, 0.88)');     // 88% deep CRT dark far outside circle (1.00 MAX allowed)

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  function clearTemporaryMarkers() {
    trilaterationMarkers.forEach(m => m.remove());
    trilaterationMarkers = [];

    trajectoryMarkers.forEach(m => m.remove());
    trajectoryMarkers = [];

    rangeSpotlightMarkers.forEach(m => m.remove());
    rangeSpotlightMarkers = [];

    activeSpotlightCenter = null;
    activeSpotlightRadiusMeters = 0;
    if (spotlightCanvasOverlay) spotlightCanvasOverlay.style.display = 'none';

    // Disable Range Spotlight & Trajectory View modes & re-render background trip signal dots & track line
    isRangeSpotlightActive = false;
    isTrajectoryViewActive = false;
    try { updateMapSignalMarkers(); } catch (e) {}

    repeaterMarkers.forEach(m => {
      try { if (m && m.getElement()) m.getElement().style.display = 'flex'; } catch (e) {}
    });

    if (carMarker && carMarker.getElement()) {
      try { carMarker.getElement().style.display = 'block'; } catch (e) {}
    }

    if (map) {
      if (map.getLayer('wardrive-track-layer')) {
        try { map.setLayoutProperty('wardrive-track-layer', 'visibility', 'visible'); } catch (e) {}
      }
      if (isHeatmapVisible && map.getLayer('heatmap-layer')) {
        try { map.setLayoutProperty('heatmap-layer', 'visibility', 'visible'); } catch (e) {}
      }

      if (map.getSource('trajectory-src')) {
        map.getSource('trajectory-src').setData({ type: 'FeatureCollection', features: [] });
      }
      if (map.getSource('range-spotlight-src')) {
        map.getSource('range-spotlight-src').setData({ type: 'FeatureCollection', features: [] });
      }
      if (map.getSource('trilateration-src')) {
        map.getSource('trilateration-src').setData({ type: 'FeatureCollection', features: [] });
      }

      if (activePopup) {
        try { activePopup.remove(); } catch (e) {}
        activePopup = null;
      }
    }

    if (map && typeof handleTrajectoryZoom === 'function') {
      map.off('zoomend', handleTrajectoryZoom);
    }
    currentTrajectoryItem = null;
    window.currentDeepDiveItem = null;
  }
  window.clearTemporaryMarkers = clearTemporaryMarkers;

  function suppressBackgroundSignalLayers() {
    isTrajectoryViewActive = true;
    try { updateMapSignalMarkers(); } catch (e) {}

    repeaterMarkers.forEach(m => {
      try { if (m && m.getElement()) m.getElement().style.display = 'none'; } catch (e) {}
    });
    if (carMarker && carMarker.getElement()) {
      try { carMarker.getElement().style.display = 'none'; } catch (e) {}
    }
    if (map && map.getLayer('wardrive-track-layer')) {
      try { map.setLayoutProperty('wardrive-track-layer', 'visibility', 'none'); } catch (e) {}
    }
    if (map && map.getLayer('heatmap-layer')) {
      try { map.setLayoutProperty('heatmap-layer', 'visibility', 'none'); } catch (e) {}
    }
  }
  window.suppressBackgroundSignalLayers = suppressBackgroundSignalLayers;

  function showRangeCircleOnMap(contact, log, distanceKm) {
    const cCoords = getNodeCoordinates(contact);
    const rxCoords = getNodeCoordinates(log) || (log && log.lat && log.lng ? { lat: parseFloat(log.lat), lng: parseFloat(log.lng) } : null);

    if (!map || !cCoords || !rxCoords) {
      alert("No valid GPS coordinates available for range circle visualization.");
      return;
    }

    const distanceMeters = distanceKm * 1000;
    const lineLinkColor = getSnrColor(log ? log.snr : 0);
    const textStr = `${distanceKm.toFixed(2)} km`;

    clearTemporaryMarkers();
    switchNavTab('map');

    // Enable Range Spotlight mode & hide ALL other background markers/layers for 100% clean spotlight focus!
    isRangeSpotlightActive = true;
    try { updateMapSignalMarkers(); } catch (e) {}

    repeaterMarkers.forEach(m => {
      try { if (m && m.getElement()) m.getElement().style.display = 'none'; } catch (e) {}
    });
    if (carMarker && carMarker.getElement()) {
      try { carMarker.getElement().style.display = 'none'; } catch (e) {}
    }
    if (map && map.getLayer('wardrive-track-layer')) {
      try { map.setLayoutProperty('wardrive-track-layer', 'visibility', 'none'); } catch (e) {}
    }
    if (map && map.getLayer('heatmap-layer')) {
      try { map.setLayoutProperty('heatmap-layer', 'visibility', 'none'); } catch (e) {}
    }

    const contactLng = cCoords.lng;
    const contactLat = cCoords.lat;
    const rxLng = rxCoords.lng;
    const rxLat = rxCoords.lat;

    // 2. Set active spotlight parameters for smooth radial gradient dimming canvas
    activeSpotlightCenter = { lat: contactLat, lng: contactLng };
    activeSpotlightRadiusMeters = distanceMeters;
    updateRadialSpotlightCanvas();

    // Hook map render event to update radial spotlight canvas on pan/zoom
    map.off('render', updateRadialSpotlightCanvas);
    map.on('render', updateRadialSpotlightCanvas);

    // 3. Create Dashed Red Boundary Circle & Transmission Line
    const circleFeature = createGeoJSONCircle([contactLng, contactLat], distanceMeters);

    const lineString = {
      type: 'Feature',
      properties: { color: lineLinkColor },
      geometry: {
        type: 'LineString',
        coordinates: [[contactLng, contactLat], [rxLng, rxLat]]
      }
    };

    if (map.getSource('range-spotlight-src')) {
      try {
        map.getSource('range-spotlight-src').setData({
          type: 'FeatureCollection',
          features: [circleFeature, lineString]
        });
      } catch (e) {}
    }

    // 3. Pulsating Contact Node Marker
    const roleIcon = contact.role === 2 ? '📡' : (contact.role === 3 ? '🏠' : (contact.role === 4 ? '🌡️' : '👤'));

    const nodeEl = document.createElement('div');
    nodeEl.className = 'selected-contact-marker-container';
    nodeEl.style.cssText = 'position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    nodeEl.innerHTML = `
      <div class="contact-pulse-ring"></div>
      <div class="repeater-icon" style="position: relative; z-index: 2; font-size: 22px; width: 36px; height: 36px;">
        ${roleIcon}
      </div>
    `;

    const nodeMarker = new maplibregl.Marker({ element: nodeEl, anchor: 'center' })
      .setLngLat([contactLng, contactLat])
      .addTo(map);
    rangeSpotlightMarkers.push(nodeMarker);

    // 4. Reception Point RX Marker
    const rxEl = document.createElement('div');
    rxEl.innerHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${lineLinkColor}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 10px ${lineLinkColor}; display: flex; align-items: center; justify-content: center; color: #000; font-size: 10px; font-weight: 900; cursor: pointer;">RX</div>`;
    const rxMarker = new maplibregl.Marker({ element: rxEl, anchor: 'center' })
      .setLngLat([rxLng, rxLat])
      .addTo(map);
    rangeSpotlightMarkers.push(rxMarker);

    // 5. Distance Label at Midpoint (Clean, borderless, transparent text)
    const midLng = (contactLng + rxLng) / 2;
    const midLat = (contactLat + rxLat) / 2;
    const labelEl = document.createElement('div');
    labelEl.innerHTML = `<div style="color: #FF1744; font-weight: 900; font-family: monospace, system-ui, sans-serif; font-size: 15px; text-shadow: 0 0 4px #000000, 0 1px 4px #000000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; pointer-events: none; white-space: nowrap;">${textStr}</div>`;
    const labelMarker = new maplibregl.Marker({ element: labelEl, anchor: 'center' })
      .setLngLat([midLng, midLat])
      .addTo(map);
    rangeSpotlightMarkers.push(labelMarker);

    // 6. Fit Map Camera Bounds around the Range Circle (compact 15px padding for tight/close zoom in all display modes)
    isProgrammaticPan = true;
    map.resize();

    setTimeout(() => {
      if (!map) return;
      map.resize();

      const latRad = contactLat * Math.PI / 180;
      const metersPerDegLng = 111320 * Math.cos(latRad);
      const degLat = distanceMeters / 111320;
      const degLng = distanceMeters / (metersPerDegLng || 111320);

      const bounds = [
        [contactLng - degLng, contactLat - degLat],
        [contactLng + degLng, contactLat + degLat]
      ];

      map.fitBounds(bounds, {
        padding: { top: 15, bottom: 15, left: 15, right: 15 },
        maxZoom: 16.5,
        duration: 800
      });

      setTimeout(() => { isProgrammaticPan = false; }, 900);
    }, 60);
  }
  window.showRangeCircleOnMap = showRangeCircleOnMap;

  // --- Pulsating Contact Highlight on Map (exact native Android showLocatedNodeDetail line 4180) ---
  let selectedContactPulseLayer = null;
  let selectedContactMarker = null;
  let pulseAnimationTimer = null;

  function highlightContactOnMap(node) {
    if (!map || !node) return;

    const coords = getNodeCoordinates(node);
    if (!coords) {
      alert(`No valid GPS coordinates available for ${node.name || node.id || 'selected node'}.`);
      return;
    }

    clearTemporaryMarkers();
    switchNavTab('map');
    isFollowingGps = false;
    map.setBearing(0);

    const roleIcon = node.role === 2 ? '📡' : (node.role === 3 ? '🏠' : (node.role === 4 ? '🌡️' : '👤'));
    const cleanName = findNodeName(node.id) || node.name || "Node";
    const hexId = node.id ? node.id.toUpperCase() : '';

    // 1. Create Pulsating Contact Marker Element at exact GPS coordinates
    const el = document.createElement('div');
    el.className = 'selected-contact-marker-container';
    el.style.cssText = 'position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    el.innerHTML = `
      <div class="contact-pulse-ring"></div>
      <div class="repeater-icon" style="position: relative; z-index: 2; font-size: 22px; width: 36px; height: 36px;">
        ${roleIcon}
      </div>
    `;

    const contactMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    trilaterationMarkers.push(contactMarker); // Cleaned up when temporary markers are cleared

    // 2. Smoothly center the map
    isProgrammaticPan = true;
    map.easeTo({
      center: [coords.lng, coords.lat + 0.0005],
      zoom: 16,
      duration: 500
    });
    setTimeout(() => { isProgrammaticPan = false; }, 500);

    // 3. Open Clean White Balloon Info Window (exact 1:1 match with MainActivity.kt line 4247)
    let distText = "";
    if (userLocation && userLocation.lat && userLocation.lng) {
      const km = calculateDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
      distText = ` | ${km.toFixed(2)} km`;
    }

    window.currentSelectedNode = node;
    const titleText = `${cleanName} (${hexId})${distText}`;
    const snippetText = `ID: ${hexId}`;

    const popupHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #121212; padding: 2px; min-width: 170px; max-width: 260px; box-sizing: border-box;">
        <div style="font-weight: 800; font-size: 0.92rem; color: #121212; border-bottom: 2px solid #00FFC8; padding-bottom: 3px; margin-bottom: 4px; word-break: break-word; white-space: normal; line-height: 1.3;">
          ${titleText}
        </div>
        <div style="font-size: 0.8rem; color: #333333; line-height: 1.3;">
          ${snippetText}
        </div>
      </div>
    `;

    if (activePopup) {
      try { activePopup.remove(); } catch (e) {}
    }

    activePopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      autoPan: true,
      anchor: 'bottom', // Anchored directly ABOVE the pulsating contact marker
      offset: [0, -22],
      className: 'white-info-window-popup'
    })
      .setLngLat([coords.lng, coords.lat])
      .setHTML(popupHtml)
      .addTo(map);
  }
  window.highlightContactOnMap = highlightContactOnMap;

  // --- Show Best Seen Signal Reception Location on Map (exact 1:1 match with MainActivity.kt showPointInfo) ---
  function showBestSeenReceptionOnMap(item) {
    if (!map || !item) return;

    const coords = getNodeCoordinates(item);
    if (!coords) {
      showToastMessage(`⚠️ No GPS coordinates recorded for signal from ${item.nodeId || 'selected item'}.`);
      return;
    }

    // Highlight ONLY the specific signal dot at this exact reception position with solid RED ring!
    if (item.nodeId) {
      selectedNodeId = item.nodeId.toUpperCase();
      selectedLogPositionKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
      updateMapSignalMarkers();
    }

    // 1. Clean up temporary map markers
    clearTemporaryMarkers();

    // 2. Switch tab to Map, stop auto-following GPS, and reset orientation to 0
    switchNavTab('map');
    isFollowingGps = false;
    map.setBearing(0);

    // 3. Center map on reception GPS location with zoom level 18.0
    isProgrammaticPan = true;
    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 18,
      duration: 1000
    });
    setTimeout(() => { isProgrammaticPan = false; }, 300);

    // 4. Open white balloon info window (exact custom_info_window.xml balloon)
    showPointInfoWindow(item, [coords.lat, coords.lng]);
  }
  window.showBestSeenReceptionOnMap = showBestSeenReceptionOnMap;

  function getNodeCoordinates(node) {
    if (!node) return null;

    let lat = 0;
    let lng = 0;

    if (node.lat !== undefined && node.lat !== null) lat = parseFloat(node.lat);
    else if (node.latitude !== undefined && node.latitude !== null) lat = parseFloat(node.latitude);
    else if (node.position && node.position.latitude !== undefined) lat = parseFloat(node.position.latitude);

    if (node.lng !== undefined && node.lng !== null) lng = parseFloat(node.lng);
    else if (node.longitude !== undefined && node.longitude !== null) lng = parseFloat(node.longitude);
    else if (node.lon !== undefined && node.lon !== null) lng = parseFloat(node.lon);
    else if (node.position && node.position.longitude !== undefined) lng = parseFloat(node.position.longitude);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat === 0 && lng === 0) return null;

    return { lat, lng };
  }

  // --- UI Lists Refresh (3 Strict Lines per Item with Horizontal Scroll) ---
  function updateUILists() {
    // 1. Best Seen / All Received List
    const listBestEl = document.getElementById('listBestSeen');
    const bestHeader = document.getElementById('tvBestSeenHeader');

    const cbFocus = document.getElementById('cbFocusEnabled');
    const isFilterMasterOn = !cbFocus || cbFocus.checked;
    const isFilterActive = isFilterMasterOn && (
      (filters.targetIds && filters.targetIds.length > 0) ||
      (filters.idLength && filters.idLength > 0) ||
      (filters.trafficType && filters.trafficType > 0) ||
      filters.zeroHopOnly
    );

    const filterTag = isFilterActive ? " [Filtered]" : "";

    if (listBestEl) {
      listBestEl.innerHTML = '';
      const items = bestSeenFilterMode === 0
        ? Array.from(bestSeenMap.values()).filter(matchesFilter).sort((a, b) => b.snr - a.snr)
        : allReceivedLogs.filter(matchesFilter).slice(0, 50);

      if (bestHeader) {
        bestHeader.innerText = bestSeenFilterMode === 0
          ? `Best Seen (SNR)${filterTag}: ${items.length}`
          : `All Received (Time)${filterTag}: ${items.length}`;
      }

      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-item';

        const hexId = item.nodeId.toUpperCase();
        const foundName = findNodeName(hexId);

        let typeName = "[SIGNAL]";
        const payloadType = item.meshPacket ? item.meshPacket.payloadType : (item.payloadType || null);
        if (payloadType !== null && payloadType !== undefined) {
          const typeHex = "0x" + payloadType.toString(16).padStart(2, '0').toUpperCase();
          const pName = ProtocolDecoder ? ProtocolDecoder.getSignalTypeName(payloadType) : "SIGNAL";
          typeName = `[${typeHex} ${pName}]`;
        }

        const line1Text = foundName ? `${foundName} (${hexId})` : hexId;
        const snrColor = getSnrColor(item.snr);
        const rssiPart = item.rssi ? ` (RSSI: ${item.rssi} dBm)` : '';
        const line2Text = `${typeName} Peak: ${item.snr} dB${rssiPart}`;
        const line3Text = `at ${item.time}`;

        li.innerHTML = `
          <div class="list-line list-line-1">${line1Text}</div>
          <div class="list-line list-line-2" style="color: ${snrColor};">${line2Text}</div>
          <div class="list-line list-line-3">${line3Text}</div>
        `;

        addTouchAndClickListener(
          li,
          () => {
            showBestSeenReceptionOnMap(item);
          },
          () => {
            showSignalDeepDive(item);
          }
        );

        listBestEl.appendChild(li);
      });
    }

    // 2. Located Nodes (Contacts) List (exact MainActivity.kt lines 1340-1350)
    const listNodesEl = document.getElementById('listLocatedNodes');
    const logHeader = document.getElementById('tvLogHeader');

    if (listNodesEl) {
      listNodesEl.innerHTML = '';
      const allNodes = Array.from(locatedNodes.values());

      const filteredNodes = allNodes.filter(node => {
        if (!matchesFilter(node)) return false;
        if (nodeListFilterMode === 1) return isUserRole(node.role);
        if (nodeListFilterMode === 2) return isNodeARepeater(node);
        return true; // Mode 0: All
      });

      if (logHeader) {
        const filterName = nodeListFilterMode === 0 ? "Contacts" : (nodeListFilterMode === 1 ? "👤 Users" : "📡 Repeaters");
        if (nodeListFilterMode === 0) {
          logHeader.innerText = `${filterName}: ${filteredNodes.length}`;
        } else {
          logHeader.innerText = `${filterName}: ${filteredNodes.length} / ${allNodes.length}`;
        }
      }

      filteredNodes.forEach(node => {
        const roleIcon = node.role === 2 ? '📡 ' : (node.role === 3 ? '🏠 ' : (node.role === 4 ? '🌡️ ' : (node.role === 1 ? '👤 ' : '')));
        const hexId = node.id.toUpperCase();
        const foundName = (node.name && node.name !== hexId) ? node.name : null;

        const line1Text = foundName ? `${roleIcon}${foundName} (${hexId})` : `${roleIcon}Node: ${hexId}`;

        const coords = getNodeCoordinates(node);
        let line2Text = "No Location Fix";
        if (coords) {
          line2Text = `Lat: ${coords.lat.toFixed(5)}, Lon: ${coords.lng.toFixed(5)}`;
        }

        const seenTimeStr = node.lastSeen ? (typeof node.lastSeen === 'number' ? new Date(node.lastSeen).toLocaleTimeString() : node.lastSeen) : "--:--:--";
        const line3Text = `Seen: ${seenTimeStr}`;

        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
          <div class="list-line list-line-1">${line1Text}</div>
          <div class="list-line list-line-2" style="color: ${coords ? '#4CAF50' : '#FF9800'};">${line2Text}</div>
          <div class="list-line list-line-3">${line3Text}</div>
        `;

        addTouchAndClickListener(
          li,
          () => {
            if (coords) {
              highlightContactOnMap({ ...node, lat: coords.lat, lng: coords.lng });
            } else {
              showContactDetailsDialog(node);
            }
          },
          () => {
            showContactOptionsMenu(node);
          }
        );

        listNodesEl.appendChild(li);
      });
    }

    // Range List (Exact 1:1 match with MainActivity.kt updateRangeList)
    const rangeListEl = document.getElementById('listRangeResults');
    if (rangeListEl) {
      rangeListEl.innerHTML = '';

      const maxDistances = new Map(); // cleanNodeId -> RangeRecord

      allReceivedLogs.filter(matchesFilter).forEach(log => {
        if (!log || !log.nodeId || log.nodeId.toUpperCase() === 'TRAIL') return;
        const cleanId = log.nodeId.trim().toUpperCase();
        if (cleanId.length < 4) return; // 1-byte IDs excluded from Range calculations

        const rxLat = parseFloat(log.lat || 0);
        const rxLng = parseFloat(log.lng || 0);
        if (isNaN(rxLat) || isNaN(rxLng) || (rxLat === 0 && rxLng === 0)) return;

        const contact = Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, cleanId));
        if (contact) {
          const cCoords = getNodeCoordinates(contact);
          if (cCoords && cCoords.lat !== 0 && cCoords.lng !== 0) {
            const km = calculateDistanceKm(cCoords.lat, cCoords.lng, rxLat, rxLng);
            const existing = maxDistances.get(cleanId);
            if (!existing || km > existing.distanceKm) {
              maxDistances.set(cleanId, {
                nodeId: cleanId,
                name: contact.name || cleanId,
                distanceKm: km,
                contactPos: cCoords,
                rxPos: { lat: rxLat, lng: rxLng },
                snr: log.snr,
                rssi: log.rssi,
                time: log.time,
                log: log,
                contact: contact
              });
            }
          }
        }
      });

      // Sort descending by max distance (longest range first at top)
      const sortedRecords = Array.from(maxDistances.values()).sort((a, b) => b.distanceKm - a.distanceKm);

      if (sortedRecords.length === 0) {
        rangeListEl.innerHTML = `<li style="text-align:center; padding:30px; color:#AAA; font-size:0.85rem;">No range records found. Ensure repeaters have known GPS positions.</li>`;
      } else {
        sortedRecords.forEach(rec => {
          const li = document.createElement('li');
          li.className = 'list-item';
          const nameStr = rec.name && rec.name !== rec.nodeId ? `${rec.name} (${rec.nodeId})` : rec.nodeId;
          const snrColor = getSnrColor(rec.snr);

          li.innerHTML = `
            <div class="list-line list-line-1" style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:bold; color:#FFFFFF;">📡 ${nameStr}</span>
              <span style="color:#00FFC8; font-weight:bold; font-size:0.95rem;">${rec.distanceKm.toFixed(2)} km</span>
            </div>
            <div class="list-line list-line-2" style="color:${snrColor};">Max Range | Peak SNR: ${rec.snr} dB (RSSI: ${rec.rssi} dBm)</div>
            <div class="list-line list-line-3">at ${rec.time || 'N/A'}</div>
          `;

          li.onclick = () => {
            showRangeCircleOnMap(rec.contact, rec.log, rec.distanceKm);
          };

          rangeListEl.appendChild(li);
        });
      }
    }

    if (typeof updateNavItemsVisibility === 'function') updateNavItemsVisibility();
  }

  // --- Analysis Engine Refresh (1:1 Exact Match with MainActivity.kt lines 5280-5500) ---
  function updateAnalysisData() {
    let logsToAnalyze = [];

    if (currentAnalysisMode === 'global') {
      // Collect logs across ALL unique saved & imported trips (RAM window.inMemoryTrips + localStorage)
      const analyzedTripIds = new Set();

      // 1. Read all imported/active trips stored in RAM memory (window.inMemoryTrips)
      if (window.inMemoryTrips && Array.isArray(window.inMemoryTrips)) {
        window.inMemoryTrips.forEach(trip => {
          if (!trip || !trip.id) return;
          analyzedTripIds.add(trip.id);
          if (trip.logs && Array.isArray(trip.logs)) {
            trip.logs.forEach(l => logsToAnalyze.push(l));
          }
        });
      }

      // 2. Read all saved trips in localStorage
      try {
        const rawTrips = localStorage.getItem('saved_trips');
        let savedTrips = [];
        try { savedTrips = rawTrips ? JSON.parse(rawTrips) : []; } catch (e) { savedTrips = []; }

        savedTrips.forEach(trip => {
          if (!trip || !trip.id || analyzedTripIds.has(trip.id)) return;
          analyzedTripIds.add(trip.id);

          if (trip.logs && Array.isArray(trip.logs) && trip.logs.length > 0) {
            trip.logs.forEach(l => logsToAnalyze.push(l));
          } else {
            const tripLogKey = `meshcore_trip_logs_${trip.id}`;
            const rawLogs = localStorage.getItem(tripLogKey);
            if (rawLogs) {
              try {
                const parsedLogs = JSON.parse(rawLogs);
                if (Array.isArray(parsedLogs)) {
                  parsedLogs.forEach(l => logsToAnalyze.push(l));
                }
              } catch (e) {}
            }
          }
        });
      } catch (e) {}

      // 3. Include active trip logs IF not already included in analyzedTripIds
      if (allReceivedLogs && allReceivedLogs.length > 0 && analyzedTripIds.size === 0) {
        allReceivedLogs.forEach(l => logsToAnalyze.push(l));
      }
    } else {
      // THIS TRIP: Only active/loaded trip logs
      logsToAnalyze = [...allReceivedLogs];
    }

    const filteredLogs = logsToAnalyze.filter(matchesFilter);

    // Calculate metrics
    const uniqueNodeSet = new Set();
    const repeaterCounts = new Map(); // nodeId -> packet count
    const maxDistanceMap = new Map(); // nodeId -> { distanceKm, snr, count, name }
    const packetTypeCounts = new Map(); // payloadType -> count
    let totalDistKm = 0;
    let prevLat = null, prevLng = null;

    filteredLogs.forEach(log => {
      if (!log || !log.nodeId || log.nodeId.toUpperCase() === 'TRAIL') return;
      const hexId = log.nodeId.trim().toUpperCase();
      uniqueNodeSet.add(hexId);

      // Repeater / Node Packet Counts (2-byte and 3-byte IDs)
      if (hexId.length === 4 || hexId.length === 6) {
        repeaterCounts.set(hexId, (repeaterCounts.get(hexId) || 0) + 1);
      }

      // Distance calculation between GPS coordinates
      const rxLat = parseFloat(log.lat || 0);
      const rxLng = parseFloat(log.lng || 0);
      if (!isNaN(rxLat) && !isNaN(rxLng) && rxLat !== 0 && rxLng !== 0) {
        if (prevLat !== null && prevLng !== null) {
          totalDistKm += calculateDistanceKm(prevLat, prevLng, rxLat, rxLng);
        }
        prevLat = rxLat;
        prevLng = rxLng;

        // Contact Max Distance Range
        const contact = Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, hexId));
        if (contact) {
          const cCoords = getNodeCoordinates(contact);
          if (cCoords && cCoords.lat !== 0 && cCoords.lng !== 0) {
            const km = calculateDistanceKm(cCoords.lat, cCoords.lng, rxLat, rxLng);
            const existing = maxDistanceMap.get(hexId);
            if (!existing || km > existing.distanceKm) {
              maxDistanceMap.set(hexId, {
                nodeId: hexId,
                name: contact.name || hexId,
                distanceKm: km,
                snr: log.snr,
                rssi: log.rssi,
                count: (existing ? existing.count : 0) + 1
              });
            } else {
              existing.count++;
            }
          }
        }
      }

      // Packet Types Breakdown
      const pType = log.meshPacket ? log.meshPacket.payloadType : (log.payloadType !== undefined && log.payloadType !== null ? log.payloadType : 0x88);
      if (pType !== null && pType !== undefined) {
        packetTypeCounts.set(pType, (packetTypeCounts.get(pType) || 0) + 1);
      }
    });

    // Update Cards
    const totalNodesEl = document.getElementById('tvTotalNodes');
    if (totalNodesEl) totalNodesEl.innerText = uniqueNodeSet.size;

    const totalPointsEl = document.getElementById('tvTotalPoints');
    if (totalPointsEl) totalPointsEl.innerText = filteredLogs.length;

    const distEl = document.getElementById('tvAnalysisTripDist');
    if (distEl) {
      const finalDist = currentAnalysisMode === 'trip' && totalDistanceKm > 0 ? totalDistanceKm : totalDistKm;
      distEl.innerText = `${finalDist.toFixed(2)} km`;
    }

    const durEl = document.getElementById('tvAnalysisTripDuration');
    if (durEl) {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      const hrs = Math.floor(mins / 60);
      durEl.innerText = `${String(hrs).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // 1. Top Infrastructure / Repeaters List
    const repeatersEl = document.getElementById('llTopRepeaters');
    if (repeatersEl) {
      repeatersEl.innerHTML = '';
      const sortedRepeaters = Array.from(repeaterCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (sortedRepeaters.length === 0) {
        repeatersEl.innerHTML = `<div style="color:#888; font-size:0.75rem; text-align:center; padding:10px;">No repeater data found</div>`;
      } else {
        sortedRepeaters.forEach(([id, count]) => {
          const name = findNodeName(id);
          const dispName = name ? `${name} (${id})` : id;
          const item = document.createElement('div');
          item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
          item.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; max-width:78%;"><b>${dispName}</b></span><span style="color:#00FFC8; font-weight:bold; flex-shrink:0;">${count} points</span>`;
          repeatersEl.appendChild(item);
        });
      }
    }

    // 2. Source Range Analysis List (Max Distance)
    const sourceStatsEl = document.getElementById('llSourceStats');
    if (sourceStatsEl) {
      sourceStatsEl.innerHTML = '';
      const sortedRange = Array.from(maxDistanceMap.values()).sort((a, b) => b.distanceKm - a.distanceKm).slice(0, 10);
      if (sortedRange.length === 0) {
        sourceStatsEl.innerHTML = `<div style="color:#888; font-size:0.75rem; text-align:center; padding:10px;">No range data found</div>`;
      } else {
        sortedRange.forEach(rec => {
          const name = findNodeName(rec.nodeId) || rec.name;
          const dispName = name ? `${name} (${rec.nodeId})` : rec.nodeId;
          const item = document.createElement('div');
          item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
          item.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; max-width:78%;"><b>${dispName}</b></span><span style="color:#FFD54F; font-weight:bold; flex-shrink:0;">${rec.distanceKm.toFixed(2)} km (${rec.snr}dB)</span>`;
          sourceStatsEl.appendChild(item);
        });
      }
    }

    // 3. Packet Types Breakdown
    const packetTypesEl = document.getElementById('llPacketTypes');
    if (packetTypesEl) {
      packetTypesEl.innerHTML = '';
      const sortedTypes = Array.from(packetTypeCounts.entries()).sort((a, b) => b[1] - a[1]);
      if (sortedTypes.length === 0) {
        packetTypesEl.innerHTML = `<div style="color:#888; font-size:0.75rem; text-align:center; padding:10px;">No packet type data</div>`;
      } else {
        const totalTypesCount = sortedTypes.reduce((sum, t) => sum + t[1], 0);
        sortedTypes.forEach(([type, count]) => {
          const typeName = ProtocolDecoder ? ProtocolDecoder.getSignalTypeName(type) : "SIGNAL";
          const hexStr = "0x" + type.toString(16).padStart(2, '0').toUpperCase();
          const pct = totalTypesCount > 0 ? ((count * 100) / totalTypesCount).toFixed(1) : "0.0";
          const item = document.createElement('div');
          item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
          item.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis;"><b>${typeName} (${hexStr})</b></span><span style="color:#00FFC8; font-weight:bold; flex-shrink:0;">${count} (${pct}%)</span>`;
          packetTypesEl.appendChild(item);
        });
      }
    }

    // 4. Signal Distance Graph Data
    if (signalDistanceGraphRenderer) {
      const distData = [];
      filteredLogs.forEach(log => {
        if (log.lat && log.lng && log.lat !== 0 && log.lng !== 0) {
          const contact = Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, log.nodeId));
          if (contact) {
            const cCoords = getNodeCoordinates(contact);
            if (cCoords && cCoords.lat !== 0 && cCoords.lng !== 0) {
              const distM = calculateDistanceKm(cCoords.lat, cCoords.lng, log.lat, log.lng) * 1000;
              distData.push({ distMeters: distM, snr: log.snr });
            }
          }
        }
      });
      signalDistanceGraphRenderer.setData(distData);
    }
  }

  // --- Bottom Navigation Items Enabled/Disabled State (Exact 1:1 Match with MainActivity.kt lines 8925-8945) ---
  function updateNavItemsVisibility() {
    const isConnected = !!(bleManager && bleManager.isConnected);
    const hasCurrentTrip = isWardriveActive || (typeof currentlyLoadedTrip !== 'undefined' && currentlyLoadedTrip !== null) || (wardriveTrackPoints && wardriveTrackPoints.length > 0);

    const rawTrips = localStorage.getItem('saved_trips');
    let savedTrips = [];
    try { savedTrips = rawTrips ? JSON.parse(rawTrips) : []; } catch(e) { savedTrips = []; }
    const hasSavedLogs = (savedTrips && savedTrips.length > 0) || (allReceivedLogs && allReceivedLogs.length > 0);

    const btnGraph = document.querySelector('.nav-item[data-tab="graph"]');
    const btnMap = document.querySelector('.nav-item[data-tab="map"]');
    const btnRange = document.querySelector('.nav-item[data-tab="range"]');
    const btnAnalysis = document.querySelector('.nav-item[data-tab="analysis"]');
    const btnChat = document.querySelector('.nav-item[data-tab="chat"]');

    if (btnGraph) {
      btnGraph.disabled = false;
      btnGraph.classList.remove('disabled');
    }
    if (btnMap) {
      btnMap.disabled = false;
      btnMap.classList.remove('disabled');
    }

    if (btnRange) {
      btnRange.disabled = !hasCurrentTrip;
      btnRange.classList.toggle('disabled', !hasCurrentTrip);
    }

    if (btnAnalysis) {
      btnAnalysis.disabled = !hasSavedLogs;
      btnAnalysis.classList.toggle('disabled', !hasSavedLogs);
    }

    if (btnChat) {
      btnChat.disabled = !isConnected;
      btnChat.classList.toggle('disabled', !isConnected);
    }

    // Safety fallback: If active tab is now disabled, fallback to 'map'
    if (activeNavTab === 'chat' && !isConnected) {
      switchNavTab('map');
    } else if (activeNavTab === 'range' && !hasCurrentTrip) {
      switchNavTab('map');
    } else if (activeNavTab === 'analysis' && !hasSavedLogs) {
      switchNavTab('map');
    }
  }
  window.updateNavItemsVisibility = updateNavItemsVisibility;

  // --- Bottom Navigation Tab Switcher ---
  window.switchNavTab = (tab) => {
    const isConnected = !!(bleManager && bleManager.isConnected);
    const hasCurrentTrip = isWardriveActive || (typeof currentlyLoadedTrip !== 'undefined' && currentlyLoadedTrip !== null) || (wardriveTrackPoints && wardriveTrackPoints.length > 0);

    const rawTrips = localStorage.getItem('saved_trips');
    let savedTrips = [];
    try { savedTrips = rawTrips ? JSON.parse(rawTrips) : []; } catch(e) { savedTrips = []; }
    const hasSavedLogs = (savedTrips && savedTrips.length > 0) || (allReceivedLogs && allReceivedLogs.length > 0);

    activeNavTab = tab;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const headerGroup = document.getElementById('dashboardHeaderGroup');
    const listsContainer = document.getElementById('llListsContainer');

    if (tab === 'analysis' || tab === 'chat') {
      if (headerGroup) headerGroup.style.display = 'none';
      if (listsContainer) listsContainer.style.display = 'none';
    } else {
      if (headerGroup) headerGroup.style.display = 'flex';
      if (listsContainer) listsContainer.style.display = 'flex';

      // Re-trigger Canvas resizes & draws when switching back to dashboard modes (Graph / Map / Range)
      setTimeout(() => {
        if (radarCanvas) {
          radarCanvas.resize();
          radarCanvas.start();
        }
        if (compassCanvas) {
          compassCanvas.resize();
          compassCanvas.draw();
        }
      }, 50);
    }

    document.querySelectorAll('.content-view').forEach(view => {
      view.style.display = 'none';
    });

    const graphLegendBar = document.getElementById('graphLegendBar');
    if (graphLegendBar) {
      graphLegendBar.style.display = (tab === 'graph') ? 'flex' : 'none';
    }

    if (tab === 'graph') {
      const el = document.getElementById('graphContainer');
      if (el) el.style.display = 'block';
      const refreshGraph = () => {
        if (signalGraphRenderer) {
          signalGraphRenderer.resize();
          signalGraphRenderer.draw();
        }
      };
      refreshGraph();
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refreshGraph);
      setTimeout(refreshGraph, 50);
      setTimeout(refreshGraph, 200);
    } else if (tab === 'map') {
      const el = document.getElementById('mapContainer');
      if (el) el.style.display = 'block';
      triggerMapResize();
      setTimeout(triggerMapResize, 50);
      setTimeout(triggerMapResize, 200);
    } else if (tab === 'range') {
      const el = document.getElementById('rangeContainer');
      if (el) el.style.display = 'block';
      updateUILists();
    } else if (tab === 'analysis') {
      const el = document.getElementById('analysisContainer');
      if (el) el.style.display = 'block';
      updateAnalysisData();
      if (signalDistanceGraphRenderer) signalDistanceGraphRenderer.resize();
    } else if (tab === 'chat') {
      const el = document.getElementById('chatContainer');
      if (el) el.style.display = 'flex';

      // 1. Find all distinct targets (Channels or DMs) with unread messages
      const unreadTargets = Array.from(unreadCounts.keys()).filter(k => (unreadCounts.get(k) || 0) > 0);

      // 2. Smart Navigation Rule: If unread messages in EXACTLY 1 target -> Open that specific target directly!
      if (unreadTargets.length === 1) {
        const target = unreadTargets[0];
        if (target.startsWith('DM:')) {
          const rawId = target.substring(3);
          activeDirectNodeId = rawId.replace(/^!/, '').toUpperCase();
        } else if (target.startsWith('CH:')) {
          activeDirectNodeId = null;
          activeChannelIndex = parseInt(target.substring(3)) || 0;
        } else {
          activeDirectNodeId = target.replace(/^!/, '').toUpperCase();
        }
      }

      // 3. Clear unreads for currently active target (exact 1:1 match with MainActivity.kt lines 7645 & 7710)
      const targetKey = activeDirectNodeId !== null ? `DM:${activeDirectNodeId}` : `CH:${activeChannelIndex}`;
      unreadCounts.delete(targetKey);
      if (activeDirectNodeId !== null) unreadCounts.delete(activeDirectNodeId);
      saveUnreadCountsToStorage();

      if (sessionMessageHistory && Array.isArray(sessionMessageHistory)) {
        sessionMessageHistory.forEach(m => {
          if (!m) return;
          const isTargetMatch = activeDirectNodeId !== null
            ? (m.recipientId && isSameNodeId(m.senderId, activeDirectNodeId))
            : (!m.recipientId && m.channelIdx === activeChannelIndex);
          if (isTargetMatch) {
            m.isRead = true;
          }
        });
        savePersistedData();
      }

      updateMessengerHeaderSelect();
      if (typeof window.refreshMessengerHeaderTitle === 'function') window.refreshMessengerHeaderTitle();
      refreshChatMessageHistory();
      if (typeof window.updateDrivingModeState === 'function') window.updateDrivingModeState();

      // 4. If unread messages in MULTIPLE targets -> Open the target selection picker!
      if (unreadTargets.length > 1) {
        if (typeof window.openChannelPickerModal === 'function') {
          window.openChannelPickerModal();
        }
      }

      window.updateMessengerUnreadBadge();
    }
  };

  window.updateMessengerUnreadBadge = () => {
    let totalUnread = 0;
    unreadCounts.forEach(val => {
      if (typeof val === 'number' && val > 0) totalUnread += val;
    });

    const badge = document.getElementById('badgeMessengerUnread');
    if (badge) {
      if (totalUnread > 0) {
        badge.innerText = totalUnread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  };

  // --- Helper to save completed trip to localStorage & optional CSV prompt ---
  function saveCurrentTripToStorage() {
    if (allReceivedLogs.length === 0 && wardriveTrackPoints.length === 0) {
      console.log("No data recorded during trip; skipping auto-save.");
      return;
    }

    const elapsedSec = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
    const now = new Date();
    const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTrip = {
      id: "trip_" + Date.now(),
      name: "Trip " + dateStr,
      timestamp: Date.now(),
      durationSec: elapsedSec,
      distanceKm: totalDistanceKm,
      pointCount: allReceivedLogs.length,
      trackPoints: [...wardriveTrackPoints],
      logs: [...allReceivedLogs]
    };

    // 1. Direct RAM & localStorage Save (100% Zero-Data-Loss Protection)
    if (!window.inMemoryTrips) window.inMemoryTrips = [];
    window.inMemoryTrips.unshift(newTrip);

    try {
      const raw = localStorage.getItem('saved_trips');
      let saved = raw ? JSON.parse(raw) : [];
      saved.unshift(newTrip);
      if (saved.length > 10) saved = saved.slice(0, 10);
      localStorage.setItem('saved_trips', JSON.stringify(saved));
      console.log("Trip saved to localStorage:", newTrip.id);
    } catch (e) {
      console.error("Failed to save trip to localStorage:", e);
    }

    if (typeof window.renderSavedTrips === 'function') {
      window.renderSavedTrips();
    }

    // 2. Display subtle bottom toast card asking if user wants to download CSV to device
    showCsvDownloadPromptCard(newTrip);
  }

  function showCsvDownloadPromptCard(newTrip) {
    let card = document.getElementById('toastCsvDownloadPrompt');
    if (!card) {
      card = document.createElement('div');
      card.id = 'toastCsvDownloadPrompt';
      document.body.appendChild(card);
    }

    card.style.cssText = `
      position: fixed;
      bottom: 75px;
      left: 50%;
      transform: translateX(-50%);
      background: #121212;
      border: 1.5px solid #00FFC8;
      color: #FFFFFF;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.85);
      z-index: 2500;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.85rem;
      text-align: center;
      max-width: 90vw;
      width: 320px;
      box-sizing: border-box;
    `;

    card.innerHTML = `
      <div style="font-weight: 800; margin-bottom: 4px; color: #00FFC8;">💾 '${newTrip.name || 'Trip'}' Saved!</div>
      <div style="font-size: 0.78rem; color: #BBB; margin-bottom: 10px;">Safely stored in Trips. Download CSV file to phone?</div>
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button style="font-size: 0.78rem; padding: 6px 12px; background: #00FFC8; color: #000; font-weight: 800; border: none; border-radius: 6px; cursor: pointer;" onclick="downloadPendingTripCsv('${newTrip.id}')">📄 YES, DOWNLOAD CSV</button>
        <button style="font-size: 0.78rem; padding: 6px 12px; background: #222; color: #FFF; font-weight: 800; border: 1px solid #666; border-radius: 6px; cursor: pointer;" onclick="dismissCsvDownloadPrompt()">✖ NO THANKS</button>
      </div>
    `;
  }
  window.showCsvDownloadPromptCard = showCsvDownloadPromptCard;

  window.downloadPendingTripCsv = (tripId) => {
    window.dismissCsvDownloadPrompt();
    if (typeof window.exportTripCsv === 'function') {
      window.exportTripCsv(tripId);
    }
  };

  window.dismissCsvDownloadPrompt = () => {
    const card = document.getElementById('toastCsvDownloadPrompt');
    if (card) {
      try { card.remove(); } catch (e) {}
    }
  };

  // --- Helper to update FILTERS button label & style ---
  function updateFilterButtonState() {
    const cbFocus = document.getElementById('cbFocusEnabled');
    const btnFilters = document.getElementById('btnFilters');
    if (!btnFilters) return;

    let activeCount = 0;
    if (filters.targetIds && filters.targetIds.length > 0) activeCount++;
    if (filters.idLength && filters.idLength > 0) activeCount++;
    if (filters.trafficType && filters.trafficType > 0) activeCount++;
    if (filters.zeroHopOnly) activeCount++;

    const isChecked = cbFocus ? cbFocus.checked : false;

    if (activeCount > 0 && isChecked) {
      btnFilters.innerText = `🔍 FILTERS (${activeCount})`;
      btnFilters.className = 'btn-filter-main active-on';
    } else if (activeCount > 0 && !isChecked) {
      btnFilters.innerText = `🔍 FILTERS (OFF)`;
      btnFilters.className = 'btn-filter-main active-off';
    } else {
      btnFilters.innerText = `🔍 FILTERS`;
      btnFilters.className = 'btn-filter-main';
    }
  }
  window.updateFilterButtonState = updateFilterButtonState;

  // --- Start/Stop Wardrive Toggle Button ---
  const btnStart = document.getElementById('btnStart');
  if (btnStart) {
    btnStart.onclick = () => {
      isWardriveActive = !isWardriveActive;
      if (isWardriveActive) {
        // --- START RECORDING ---
        btnStart.innerText = "● REC";
        btnStart.classList.add('recording');

        // Clear previous live session for fresh recording trip
        window.clearCurrentSessionData(false);

        sessionStartTime = Date.now();
        totalDistanceKm = 0;
        wardriveTrackPoints = [];
        isFollowingGps = true;

        if (userLocation && map) {
          isProgrammaticPan = true;
          map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 16 });
          setTimeout(() => { isProgrammaticPan = false; }, 200);
        }
      } else {
        // --- STOP RECORDING ---
        btnStart.innerText = "START";
        btnStart.classList.remove('recording');

        // Save trip recording to localStorage
        saveCurrentTripToStorage();
        if (typeof window.renderSavedTrips === 'function') {
          window.renderSavedTrips();
        }
      }
      if (typeof updateNavItemsVisibility === 'function') updateNavItemsVisibility();
    };
  }

  // --- Top Bar Controls Setup (Filter, Msg, Auto) ---
  const cbFocusEnabled = document.getElementById('cbFocusEnabled');
  if (cbFocusEnabled) {
    // Restore saved focus checkbox state
    const savedFocus = localStorage.getItem('focus_filter_enabled');
    if (savedFocus !== null) {
      cbFocusEnabled.checked = (savedFocus === 'true');
    }

    cbFocusEnabled.onchange = () => {
      let activeCount = 0;
      if (filters.targetIds && filters.targetIds.length > 0) activeCount++;
      if (filters.idLength && filters.idLength > 0) activeCount++;
      if (filters.trafficType && filters.trafficType > 0) activeCount++;
      if (filters.zeroHopOnly) activeCount++;

      // If user checks Filter checkbox but no filters are set, open Filter Hub modal
      if (cbFocusEnabled.checked && activeCount === 0) {
        window.openFilterHub();
      }

      localStorage.setItem('focus_filter_enabled', cbFocusEnabled.checked ? 'true' : 'false');
      applyGlobalFilterState();
    };
  }

  const cbMsgEnabled = document.getElementById('cbMsgEnabled');
  if (cbMsgEnabled) {
    const savedMsg = localStorage.getItem('msg_enabled');
    if (savedMsg !== null) {
      cbMsgEnabled.checked = (savedMsg === 'true');
    }

    cbMsgEnabled.onchange = () => {
      localStorage.setItem('msg_enabled', cbMsgEnabled.checked ? 'true' : 'false');
      if (!cbMsgEnabled.checked) {
        window.hideMessageOverlay();
      }
    };
  }

  function setAutoDiscoverUI(enabled) {
    const timeBar = document.getElementById('llAutoDiscoverTime');
    const distBar = document.getElementById('llAutoDiscoverDist');
    if (timeBar) timeBar.style.display = enabled ? 'flex' : 'none';
    if (distBar) distBar.style.display = enabled ? 'flex' : 'none';
  }

  const cbAutoDiscover = document.getElementById('cbAutoDiscover');
  if (cbAutoDiscover) {
    const savedAuto = localStorage.getItem('auto_discover_enabled');
    const isAutoOn = (savedAuto === 'true');
    cbAutoDiscover.checked = isAutoOn;
    setAutoDiscoverUI(isAutoOn);

    cbAutoDiscover.onchange = () => {
      if (cbAutoDiscover.checked) {
        const confirmed = confirm("Warning: Are you sure? Enabling automatic discovery can overload the network.");
        if (confirmed) {
          localStorage.setItem('auto_discover_enabled', 'true');
          setAutoDiscoverUI(true);
          autoDiscoverTimeSec = 0;
          autoDiscoverDistMeters = 0;
        } else {
          cbAutoDiscover.checked = false;
          localStorage.setItem('auto_discover_enabled', 'false');
          setAutoDiscoverUI(false);
        }
      } else {
        localStorage.setItem('auto_discover_enabled', 'false');
        setAutoDiscoverUI(false);
      }
    };
  }

  updateFilterButtonState();

  function updateRecenterButtonUI() {
    const btn = document.getElementById('btnRecenter');
    if (!btn) return;

    if (isFollowingGps) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
  window.updateRecenterButtonUI = updateRecenterButtonUI;

  // --- Global Recenter Button Click Handler ---
  window.onRecenterButtonClicked = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    isFollowingGps = true;
    updateRecenterButtonUI();

    if (userLocation && map) {
      isProgrammaticPan = true;
      map.easeTo({ center: [userLocation.lng, userLocation.lat] });
      setTimeout(() => { isProgrammaticPan = false; }, 400);
    }
  };

  // --- Global Physical Map Drag/Touch Handler ---
  window.onUserPhysicalMapTouch = (e) => {
    const target = e ? e.target : null;
    if (target && target.closest('.map-btn')) return;

    if (isFollowingGps) {
      console.log("[GPS] Physical map drag/touch -> Turning OFF GPS Follow Mode!");
      isFollowingGps = false;
      updateRecenterButtonUI();
    }
  };

  // --- Map Floating Action Buttons ---
  const btnRecenter = document.getElementById('btnRecenter');
  if (btnRecenter) {
    btnRecenter.onclick = (e) => window.onRecenterButtonClicked(e);
  }

  const btnMapTheme = document.getElementById('btnMapTheme');
  if (btnMapTheme) {
    btnMapTheme.onclick = () => {
      if (activeMapSource === 'ofm-liberty') {
        activeMapSource = 'ofm-dark';
      } else if (activeMapSource === 'ofm-dark') {
        activeMapSource = 'ofm-liberty';
      } else if (activeMapSource === 'esri-light') {
        activeMapSource = 'esri-dark';
      } else if (activeMapSource === 'esri-dark') {
        activeMapSource = 'esri-light';
      } else {
        activeMapSource = 'ofm-liberty';
      }

      setMapTileSource(activeMapSource);

      const sel = document.getElementById('selMapSource');
      if (sel) sel.value = activeMapSource;
    };
  }

  const btnToggleHeatmap = document.getElementById('btnToggleHeatmap');
  if (btnToggleHeatmap) {
    btnToggleHeatmap.onclick = () => {
      isHeatmapVisible = !isHeatmapVisible;
      btnToggleHeatmap.classList.toggle('active', isHeatmapVisible);

      if (map && map.getLayer('heatmap-layer')) {
        map.setLayoutProperty('heatmap-layer', 'visibility', isHeatmapVisible ? 'visible' : 'none');
      }
      if (isHeatmapVisible) {
        updateMapHeatmap();
      }
    };
  }

  const btnToggleRadar = document.getElementById('btnToggleRadar');
  if (btnToggleRadar) {
    btnToggleRadar.onclick = () => {
      const overlay = document.getElementById('fullRadarOverlay');
      const isVisible = overlay && overlay.style.display === 'flex';
      toggleFullRadar(!isVisible);
    };
  }

  window.toggleFullRadar = (show) => {
    const overlay = document.getElementById('fullRadarOverlay');
    const btnMapRadar = document.getElementById('btnToggleRadar');

    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
      if (btnMapRadar) {
        btnMapRadar.innerText = show ? "✖" : "📡";
      }

      if (show) {
        setTimeout(() => {
          const canvas = document.getElementById('canvasRadarFull');
          if (canvas) {
            const rect = overlay.getBoundingClientRect();
            const size = Math.floor(Math.min(rect.width * 0.85, rect.height * 0.85)) || 300;
            canvas.width = size;
            canvas.height = size;
          }
          if (!radarCanvasFull) {
            radarCanvasFull = new RadarCanvas('canvasRadarFull');
          } else {
            radarCanvasFull.resize();
          }
          radarCanvasFull.start();
          updateRadarBlips();
        }, 50);
      }
    }
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.toggleFullRadar(false);
      window.closeSystemHub();
      window.closeFilterHub();
      window.closeTripsManager();
      window.closeSignalDetails();
    }
  });

  const btnToggleLists = document.getElementById('btnToggleLists');
  if (btnToggleLists) {
    btnToggleLists.onclick = () => {
      const container = document.getElementById('llListsContainer');
      if (container) {
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'flex' : 'none';
        btnToggleLists.innerText = isHidden ? '▼' : '▲';

        triggerMapResize();
        setTimeout(triggerMapResize, 50);
        setTimeout(triggerMapResize, 150);
        setTimeout(triggerMapResize, 300);
      }
    };
  }

  window.toggleRepeatersOnMap = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    isRepeatersVisible = !isRepeatersVisible;

    const btn = document.getElementById('btnToggleRepeaters');
    if (btn) {
      btn.classList.toggle('active', isRepeatersVisible);
    }

    refreshRepeaterMarkersLayer();
  };

  const btnToggleRepeaters = document.getElementById('btnToggleRepeaters');
  if (btnToggleRepeaters) {
    btnToggleRepeaters.onclick = (e) => window.toggleRepeatersOnMap(e);
  }

  window.refreshMessengerHeaderTitle = () => {
    const titleEl = document.getElementById('txtMessengerHeaderTitle');
    if (!titleEl) return;

    if (activeDirectNodeId !== null) {
      const contact = Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, activeDirectNodeId) || isSameNodeId(n.publicKey, activeDirectNodeId));
      const name = contact ? contact.name : (activeDirectNodeName || (activeDirectNodeId.length > 8 ? activeDirectNodeId.substring(0, 4) : activeDirectNodeId));
      titleEl.innerHTML = `👤 DM: ${name} <span class="scope-badge">(Private)</span>`;
    } else {
      const ch = syncedChannels.find(c => c.index === activeChannelIndex) || syncedChannels[0];
      if (ch) {
        const scopeTag = ch.scope ? (ch.scope.startsWith('#') ? ch.scope : '#' + ch.scope) : 'Global';
        titleEl.innerHTML = `📡 CH${ch.index}: ${ch.name} <span class="scope-badge">(${scopeTag})</span>`;
      } else {
        titleEl.innerHTML = `📡 CH0: Public <span class="scope-badge">(Global)</span>`;
      }
    }
  };

  function updateMessengerHeaderSelect() {
    window.refreshMessengerHeaderTitle();
  }

  window.updateMessengerHeaderSelect = updateMessengerHeaderSelect;

  window.populateChannelPickerList = () => {
    const listEl = document.getElementById('llChannelsListModal');
    if (!listEl) return;

    listEl.innerHTML = '';

    // 1. SECTION: CHANNELS (📡)
    const chTitle = document.createElement('div');
    chTitle.style.cssText = "font-size:0.8rem; font-weight:bold; color:var(--accent-cyan); text-transform:uppercase; margin-bottom:8px;";
    chTitle.innerText = "📡 Select Channel";
    listEl.appendChild(chTitle);

    if (syncedChannels.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = "text-align:center; color:#AAA; padding:15px; font-size:0.85rem; background:#121212; border-radius:8px; margin-bottom:12px;";
      emptyDiv.innerHTML = `📡 No channels loaded from node yet.<br><br>Connect Bluetooth LE companion node to sync channels automatically, or add a custom channel below:`;
      listEl.appendChild(emptyDiv);
    } else {
      syncedChannels.forEach(ch => {
        if (ch.isVisible === false) return;
        const unread = unreadCounts.get(`CH:${ch.index}`) || 0;
        const isActive = activeDirectNodeId === null && activeChannelIndex === ch.index;

        const item = document.createElement('div');
        item.className = `channel-picker-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
          <div class="channel-info">
            <span class="channel-name">${unread > 0 ? '🔴 ' : ''}CH${ch.index}: ${ch.name} ${unread > 0 ? `(${unread})` : ''}</span>
            <span class="channel-scope">Scope: ${ch.scope || 'Global (Unscoped)'}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${isActive ? '<span class="channel-status">ACTIVE</span>' : ''}
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.7rem;" onclick="event.stopPropagation(); window.openEditScopeForChannel(${ch.index});">✏️ Edit Scope</button>
          </div>
        `;

        item.onclick = () => {
          activeChannelIndex = ch.index;
          activeDirectNodeId = null;
          activeDirectNodeName = null;
          unreadCounts.delete(`CH:${ch.index}`);
          updateMessengerUnreadBadge();
          updateMessengerHeaderSelect();
          if (typeof window.refreshMessengerHeaderTitle === 'function') refreshMessengerHeaderTitle();
          window.closeChannelPickerModal();
          refreshChatMessageHistory();
        };

        listEl.appendChild(item);
      });
    }

    // Add Custom Channel Button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.style.cssText = 'width: 100%; margin-top: 8px; margin-bottom: 16px;';
    addBtn.innerText = '➕ Add Custom Channel';
    addBtn.onclick = () => window.promptAddChannel();
    listEl.appendChild(addBtn);

    // 2. SECTION: DIRECT MESSAGES (💬)
    const dmSet = new Set();
    sessionMessageHistory.forEach(entry => {
      if (entry.recipientId === "Self" && entry.senderId) {
        dmSet.add(entry.senderId);
      } else if (entry.recipientId && entry.recipientId !== "Self") {
        dmSet.add(entry.recipientId);
      }
    });

    unreadCounts.forEach((val, key) => {
      if (key.startsWith("DM:")) {
        dmSet.add(key.substring(3));
      }
    });

    if (dmSet.size > 0) {
      const dmTitle = document.createElement('div');
      dmTitle.style.cssText = "font-size:0.8rem; font-weight:bold; color:#FFEB3B; text-transform:uppercase; margin-top:12px; margin-bottom:8px;";
      dmTitle.innerText = "💬 Direct Messages";
      listEl.appendChild(dmTitle);

      dmSet.forEach(nodeId => {
        const unread = unreadCounts.get(`DM:${nodeId}`) || 0;
        const isActive = isSameNodeId(activeDirectNodeId, nodeId);
        const contact = Array.from(locatedNodes.values()).find(n => isSameNodeId(n.id, nodeId) || isSameNodeId(n.publicKey, nodeId));
        const name = contact ? contact.name : (nodeId.length > 8 ? nodeId.substring(0, 4) : nodeId);

        const item = document.createElement('div');
        item.className = `channel-picker-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
          <div class="channel-info">
            <span class="channel-name">${unread > 0 ? '🔴 ' : ''}👤 DM: ${name} ${unread > 0 ? `(${unread})` : ''}</span>
            <span class="channel-scope">Private Node Conversation</span>
          </div>
          ${isActive ? '<span class="channel-status">ACTIVE</span>' : ''}
        `;

        item.onclick = () => {
          activeDirectNodeId = nodeId;
          activeDirectNodeName = name;
          unreadCounts.delete(`DM:${nodeId}`);
          unreadCounts.delete(nodeId);
          saveUnreadCountsToStorage();
          updateMessengerUnreadBadge();
          updateMessengerHeaderSelect();
          if (typeof window.refreshMessengerHeaderTitle === 'function') refreshMessengerHeaderTitle();
          window.closeChannelPickerModal();
          refreshChatMessageHistory();
        };

        listEl.appendChild(item);
      });
    }
  };

  window.promptAddChannel = () => {
    const name = prompt("Enter Channel Name (e.g. Regio BE, Emergency NL, Admin):", "Regio Channel");
    if (!name) return;
    const scope = prompt("Enter Region Scope for this channel (e.g. #be, #nl, #vlaanderen):", "#be");

    const newIdx = syncedChannels.length;
    syncedChannels.push({
      index: newIdx,
      name: name.trim(),
      scope: scope && scope.trim() && scope.trim() !== "*" ? (scope.trim().startsWith('#') ? scope.trim() : `#${scope.trim()}`) : null,
      isVisible: true
    });

    activeChannelIndex = newIdx;
    activeDirectNodeId = null;
    activeDirectNodeName = null;

    updateMessengerHeaderSelect();
    if (typeof window.refreshMessengerHeaderTitle === 'function') window.refreshMessengerHeaderTitle();
    window.populateChannelPickerList();
    refreshChatMessageHistory();
  };

  window.populateScopeEditInput = () => {
    const chIdx = (window.editingScopeChannelIdx !== undefined && window.editingScopeChannelIdx !== null)
      ? window.editingScopeChannelIdx
      : activeChannelIndex;
    const ch = syncedChannels.find(c => c.index === chIdx) || syncedChannels[0];
    const input = document.getElementById('txtScopeName');
    if (input) input.value = (ch && ch.scope) ? ch.scope : '';
  };

  window.saveChannelScope = async () => {
    const input = document.getElementById('txtScopeName');
    if (!input) return;
    const rawInput = input.value.trim();
    const normalized = MeshCoreScope.normalize(rawInput);
    const finalScope = (normalized === "" || normalized === "*") ? null : normalized;

    const chIdx = (window.editingScopeChannelIdx !== undefined && window.editingScopeChannelIdx !== null)
      ? window.editingScopeChannelIdx
      : activeChannelIndex;

    const ch = syncedChannels.find(c => c.index === chIdx);
    if (ch) {
      ch.scope = finalScope;
      if (finalScope) {
        localStorage.setItem(`channel_scope_${ch.index}`, finalScope);
        if (typeof MeshCoreScope !== 'undefined') {
          MeshCoreScope.addLearnedScope(finalScope);
        }
      } else {
        localStorage.removeItem(`channel_scope_${ch.index}`);
      }
      updateMessengerHeaderSelect();
      if (typeof window.refreshMessengerHeaderTitle === 'function') refreshMessengerHeaderTitle();
      if (typeof window.populateChannelPickerList === 'function') window.populateChannelPickerList();
      if (typeof window.refreshSystemHubChannelsList === 'function') refreshSystemHubChannelsList();
      refreshChatMessageHistory();
    }
    window.closeEditScopeModal();
  };

  window.populateChannelVisibilityModal = () => {
    const listEl = document.getElementById('llChannelVisibilityList');
    if (listEl) {
      listEl.innerHTML = '';

      if (syncedChannels.length === 0) {
        listEl.innerHTML = `<div style="color:#AAA; text-align:center; padding:20px;">No channels available.</div>`;
      } else {
        syncedChannels.forEach(ch => {
          const row = document.createElement('div');
          row.style.padding = '8px 0';
          row.style.borderBottom = '1px solid #333';

          row.innerHTML = `
            <label class="cb-label-block" style="margin:0; font-size:0.85rem; cursor:pointer;">
              <input type="checkbox" id="chkChanVis_${ch.index}" ${ch.isVisible !== false ? 'checked' : ''} />
              <span style="font-weight:bold; color:#FFF; margin-left:6px;">CH${ch.index}: ${ch.name}</span>
            </label>
          `;
          listEl.appendChild(row);
        });
      }
    }
  };

  window.saveChannelVisibilitySettings = () => {
    syncedChannels.forEach(ch => {
      const cb = document.getElementById(`chkChanVis_${ch.index}`);
      if (cb) ch.isVisible = cb.checked;
    });
    updateMessengerHeaderSelect();
    window.closeChannelVisibilityModal();
  };
  const DEFAULT_QUICK_REPLIES = ["🚗 Wardrive active", "📡 Test message", "🏁 End route"];

  window.loadSavedQuickReplies = () => {
    try {
      const raw = localStorage.getItem('quick_replies');
      if (raw) {
        const arr = raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (arr.length > 0) return arr;
      }
    } catch(e) {}
    return DEFAULT_QUICK_REPLIES;
  };

  window.renderQuickReplyChips = (replies) => {
    const chipsBar = document.querySelector('.quick-chips-bar');
    if (!chipsBar) return;

    const list = replies && replies.length > 0 ? replies : DEFAULT_QUICK_REPLIES;

    let html = `<button class="btn-chip-all" onclick="openQuickRepliesModal()" title="All Quick Replies">☰</button>`;
    html += `<button class="chip-btn" onclick="appendLocationToInput()">📍 Location</button>`;

    list.forEach(reply => {
      if (reply.includes("Location")) return;
      const safeReply = reply.replace(/'/g, "\\'");
      html += `<button class="chip-btn" onclick="appendQuickReply('${safeReply}')">${reply}</button>`;
    });

    chipsBar.innerHTML = html;
  };

  window.populateQuickRepliesInput = () => {
    const txt = document.getElementById('txtQuickReplies');
    if (txt) {
      const saved = window.loadSavedQuickReplies();
      txt.value = saved.join('\n');
    }
  };

  window.switchAnalysisMode = (mode) => {
    currentAnalysisMode = mode;
    const btnTrip = document.getElementById('btnAnalysisTrip');
    const btnGlobal = document.getElementById('btnAnalysisGlobal');
    if (btnTrip && btnGlobal) {
      if (mode === 'trip') {
        btnTrip.classList.add('active');
        btnGlobal.classList.remove('active');
      } else {
        btnGlobal.classList.add('active');
        btnTrip.classList.remove('active');
      }
    }
    updateAnalysisData();
  };

  window.sendLocationBeacon = () => {
    if (!userLocation) {
      showToastMessage("⚠️ Waiting for GPS fix...");
      return;
    }
    const locMsg = `📍 Position: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
    const input = document.getElementById('inputMessage');
    if (input) {
      input.value = locMsg;
      sendMessageFromInput();
    }
  };

  window.confirmClearChannelMessages = () => {
    if (confirm("Are you sure you want to clear all message history for this session?")) {
      sessionMessageHistory = [];
      savePersistedData();
      unreadCounts.clear();
      updateMessengerUnreadBadge();
      refreshChatMessageHistory();
      showToastMessage("🗑️ Message history cleared.");
    }
  };

  window.saveQuickReplies = () => {
    const txt = document.getElementById('txtQuickReplies');
    if (txt) {
      const lines = txt.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      try {
        localStorage.setItem('quick_replies', lines.join('\n'));
      } catch(e) {}
      window.renderQuickReplyChips(lines);
    }
    window.closeQuickRepliesModal();
  };

  window.refreshSystemHubChannelsList = () => {
    const listEl = document.getElementById('llChannelVisibilityList') || document.getElementById('llChannelScopesList');
    if (listEl) {
      listEl.innerHTML = '';

      if (syncedChannels.length === 0) {
        listEl.innerHTML = `
          <div style="color:#AAA; font-size:0.8rem; text-align:center; padding:15px; background:#121212; border-radius:6px;">
            📡 Geen kanalen gesynchroniseerd van node.<br>Verbind een Bluetooth LE compagnon-node.
          </div>
        `;
        return;
      }

      syncedChannels.forEach(ch => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '8px 10px';
        div.style.marginBottom = '6px';
        div.style.backgroundColor = '#121212';
        div.style.borderRadius = '6px';
        div.style.border = '1px solid var(--border)';

        div.innerHTML = `
          <div>
            <div style="font-weight: bold; color: #FFFFFF; font-size: 0.85rem;">CH${ch.index}: ${ch.name}</div>
            <div style="font-size: 0.75rem; color: var(--accent-cyan); margin-top:2px;">Scope: <strong>${ch.scope || 'Global (Unscoped)'}</strong></div>
          </div>
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="activeChannelIndex = ${ch.index}; window.openEditScopeModal();">✏️ Edit Scope</button>
        `;
        listEl.appendChild(div);
      });
    }
  };

  const btnMessengerTitle = document.getElementById('btnMessengerTitle');
  if (btnMessengerTitle) {
    btnMessengerTitle.onclick = () => window.openChannelPickerModal();
  }

  const btnMessengerSettings = document.getElementById('btnMessengerSettings');
  if (btnMessengerSettings) {
    btnMessengerSettings.onclick = () => window.openMessengerSettingsModal();
  }

  // Auto-Reply Bot Handler
  function handleAutoReplyBot(incomingSenderId, incomingText, channelIdx) {
    const chkAuto = document.getElementById('chkAutoReply');
    const txtAutoMsg = document.getElementById('txtAutoReplyMessage');
    if (!chkAuto || !chkAuto.checked) return;

    const replyMsg = txtAutoMsg ? txtAutoMsg.value.trim() : "🚗 Meshcore Wardrive Active - Auto-Reply";

    setTimeout(() => {
      console.log(`Auto-Reply Bot sending response to ${incomingSenderId}: "${replyMsg}"`);
      const autoEntry = {
        senderId: "Self (Bot)",
        message: replyMsg,
        hopCount: 0,
        timestamp: Date.now(),
        channelIdx: channelIdx,
        isOutgoing: true
      };
      sessionMessageHistory.push(autoEntry);
      savePersistedData();
      refreshChatMessageHistory();

      if (bleManager && bleManager.isConnected) {
        if (channelIdx !== undefined && channelIdx !== null) {
          bleManager.sendChannelMessage(channelIdx, replyMsg);
        } else {
          bleManager.sendDirectMessage(incomingSenderId, replyMsg);
        }
      }
    }, 1000);
  }

  window.changeMapSource = () => {
    const sel = document.getElementById('selMapSource');
    if (!sel) return;
    setMapTileSource(sel.value);
  };

  window.saveSettings = () => {
    const sel = document.getElementById('selMapSource');
    if (sel) {
      setMapTileSource(sel.value);
    }
    window.closeSystemHub();
    if (typeof switchNavTab === 'function') {
      switchNavTab('map');
    }
  };

  let voiceRecognitionInstance = null;
  let isVoiceListening = false;
  let isAutoSendCountdownActive = false;
  let autoSendTimerId = null;

  function clearAutoSendCountdown() {
    if (autoSendTimerId) {
      clearInterval(autoSendTimerId);
      autoSendTimerId = null;
    }
    isAutoSendCountdownActive = false;
    const btnMic = document.getElementById('btnVoiceDictation') || document.querySelector('.btn-chat-mic');
    if (btnMic) {
      btnMic.innerText = "🎙️";
      btnMic.style.color = "#FFFFFF";
    }
  }

  window.sendMessageFromInput = () => {
    clearAutoSendCountdown();

    const input = document.getElementById('inputMessage');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();

    // Exact same logical fallback as Android: Math.floor(Date.now() / 1000) for radio timestamp
    const ackTag = Math.floor(Date.now() / 1000);

    const activeCh = activeDirectNodeId === null ? syncedChannels.find(c => c.index === Number(activeChannelIndex)) : null;
    const entryScope = (activeCh && activeCh.scope) ? activeCh.scope : "Global";

    const entry = {
      senderId: "Self",
      message: text,
      hopCount: 0,
      timestamp: Date.now(),
      ackTag: Number(ackTag),
      radioTimestamp: Number(ackTag),
      radioHash: null,
      channelIdx: activeDirectNodeId === null ? Number(activeChannelIndex) : null,
      recipientId: activeDirectNodeId,
      scopeName: entryScope,
      isOutgoing: true,
      status: 0,
      statusText: "Sending...",
      echoes: []
    };

    // Reactive claim from recent RF logs (exact WardriveService.kt lines 1545-1560)
    const cleanSentText = text.startsWith("[") && text.includes("] ") ? text.substring(text.indexOf("] ") + 2).trim() : text.trim();
    const recentPathByTs = recentRfLogsByTimestamp.get(ackTag);
    const recentPathByText = recentRfLogsByText.get(cleanSentText) || recentRfLogsByText.get(text.trim());
    const recentPath = recentPathByTs || recentPathByText;

    if (recentPath && recentPath.path && recentPath.path.length > 0 && (Date.now() - recentPath.timestamp) < 60000) {
      entry.echoes.push(recentPath);
    }

    sessionMessageHistory.push(entry);
    savePersistedData();
    refreshChatMessageHistory();
    input.value = '';

    // Transmit over BLE
    if (bleManager && bleManager.isConnected) {
      if (activeDirectNodeId !== null) {
        bleManager.sendDirectMessage(activeDirectNodeId, text, null, ackTag).then(() => {
          markMessageStatus(ackTag, "☁️ Sent");
        }).catch(err => {
          console.error("BLE Send DM error:", err);
          markMessageStatus(ackTag, "❌ Failed");
        });
      } else {
        const ch = syncedChannels.find(c => c.index === activeChannelIndex);
        bleManager.sendChannelMessage(activeChannelIndex, text, ch ? ch.scope : null, ackTag).then(() => {
          markMessageStatus(ackTag, "☁️ Sent");
        }).catch(err => {
          console.error("BLE Send Channel error:", err);
          markMessageStatus(ackTag, "❌ Failed");
        });
      }
    } else {
      showToastMessage("⚠️ BLE Disconnected! Message not sent.");
      markMessageStatus(ackTag, "❌ Failed (Offline)");
    }
  };

  window.appendLocationToInput = () => {
    let coordsStr = "📍 0.00000, 0.00000";
    if (userLocation && userLocation.lat && userLocation.lng) {
      coordsStr = `📍 ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
    } else if (lastGpsPosition && lastGpsPosition.lat && lastGpsPosition.lng) {
      coordsStr = `📍 ${lastGpsPosition.lat.toFixed(5)}, ${lastGpsPosition.lng.toFixed(5)}`;
    }
    window.appendQuickReply(coordsStr);
  };

  window.appendQuickReply = (text) => {
    clearAutoSendCountdown();
    const input = document.getElementById('inputMessage');
    if (input) {
      const current = input.value || "";
      if (!current.trim()) {
        input.value = text;
      } else {
        input.value = current.endsWith(" ") ? `${current}${text}` : `${current} ${text}`;
      }
      input.focus();
      try {
        input.setSelectionRange(input.value.length, input.value.length);
      } catch(e) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  window.toggleVoiceInput = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btnMic = document.getElementById('btnVoiceDictation') || document.querySelector('.btn-chat-mic');
    const input = document.getElementById('inputMessage');

    if (!Speech) {
      alert("⚠️ Voice Dictation Notice:\n\nSpeech Recognition is not supported by your current browser.\n\nPlease use Chrome, Edge, or Safari on HTTPS or Localhost.");
      return;
    }

    // Toggle behavior when 5-second auto-send countdown is active (exact MainActivity.kt line 2898)
    if (isAutoSendCountdownActive) {
      clearAutoSendCountdown();
      if (input) input.value = ""; // Clear wrong message for fresh dictation
      // Fall through to start dictating again immediately
    }

    // Toggle OFF if already listening
    if (isVoiceListening && voiceRecognitionInstance) {
      try {
        voiceRecognitionInstance.stop();
      } catch (e) {}
      isVoiceListening = false;
      if (btnMic) {
        btnMic.innerText = "🎙️";
        btnMic.style.color = "#FFFFFF";
      }
      return;
    }

    try {
      voiceRecognitionInstance = new Speech();
      voiceRecognitionInstance.lang = navigator.language || 'nl-NL';
      voiceRecognitionInstance.continuous = false;
      voiceRecognitionInstance.interimResults = false;

      voiceRecognitionInstance.onstart = () => {
        isVoiceListening = true;
        if (btnMic) {
          btnMic.innerText = "👂...";
          btnMic.style.color = "#FF5252";
        }
      };

      voiceRecognitionInstance.onresult = (e) => {
        isVoiceListening = false;

        if (e.results && e.results[0] && e.results[0][0]) {
          const transcript = e.results[0][0].transcript.trim();
          if (input && transcript) {
            const currentVal = input.value.trim();
            input.value = currentVal ? `${currentVal} ${transcript}` : transcript;
            input.focus();

            // Auto-send logic: 5-second countdown in YELLOW text (exact MainActivity.kt lines 2955-2980)
            clearAutoSendCountdown();
            isAutoSendCountdownActive = true;
            let countdown = 5;

            if (btnMic) {
              btnMic.innerText = `${countdown}...`;
              btnMic.style.color = "#FFEB3B";
            }

            autoSendTimerId = setInterval(() => {
              countdown--;
              if (countdown > 0) {
                if (btnMic) {
                  btnMic.innerText = `${countdown}...`;
                  btnMic.style.color = "#FFEB3B";
                }
              } else {
                clearAutoSendCountdown();
                sendMessageFromInput();
              }
            }, 1000);
          } else if (btnMic) {
            btnMic.innerText = "🎙️";
            btnMic.style.color = "#FFFFFF";
          }
        } else if (btnMic) {
          btnMic.innerText = "🎙️";
          btnMic.style.color = "#FFFFFF";
        }
      };

      voiceRecognitionInstance.onerror = (e) => {
        isVoiceListening = false;
        clearAutoSendCountdown();

        let errText = "Speech recognition error";
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          errText = "Microphone permission denied by browser. Please allow microphone access in browser settings.";
        } else if (e.error === 'no-speech') {
          errText = "No speech detected. Please try again.";
        } else if (e.error === 'network') {
          errText = "Network error during speech recognition.";
        }

        showToastMessage("⚠️ " + errText);
      };

      voiceRecognitionInstance.onend = () => {
        isVoiceListening = false;
        if (!isAutoSendCountdownActive && btnMic) {
          btnMic.innerText = "🎙️";
          btnMic.style.color = "#FFFFFF";
        }
      };

      voiceRecognitionInstance.start();
    } catch (err) {
      isVoiceListening = false;
      clearAutoSendCountdown();
      showToastMessage("⚠️ Could not start voice dictation: " + err.message);
    }
  };

  // --- Send Message ---
  const btnSend = document.getElementById('btnSendMessage');
  if (btnSend) {
    btnSend.onclick = () => {
      window.sendMessageFromInput();
    };
  }

  // Quick reply chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.onclick = () => {
      const reply = btn.dataset.reply;
      const input = document.getElementById('inputMessage');
      if (input) {
        input.value = reply;
        input.focus();
      }
    };
  });

  // BLE Connect & Disconnect
  const btnBle = document.getElementById('btnConnectBle');
  if (btnBle) {
    btnBle.onclick = () => bleManager.connect();
  }

  const btnDisconnectBle = document.getElementById('btnDisconnectBle');
  if (btnDisconnectBle) {
    btnDisconnectBle.onclick = () => {
      if (bleManager) {
        bleManager.disconnect();
      }
    };
  }

  window.fetchCompanionContactsBLE = () => {
    if (!bleManager.isConnected) {
      alert("Not connected to BLE companion node. Please connect BLE first.");
      return;
    }
    bleManager.fetchCompanionContacts();
  };

  window.selectContactsJsonFile = () => {
    const fileInput = document.getElementById('fileContactsJson');
    if (fileInput) fileInput.click();
  };

  const fileContactsJson = document.getElementById('fileContactsJson');
  if (fileContactsJson) {
    fileContactsJson.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target.result);
          let count = 0;

          // Normalize items array from various JSON formats (array, object, contacts, nodes, located_nodes)
          let items = [];
          if (Array.isArray(json)) {
            items = json;
          } else if (typeof json === 'object' && json !== null) {
            items = json.contacts || json.nodes || json.located_nodes || json.locatedNodesList || Object.values(json);
          }

          items.forEach(item => {
            if (!item || typeof item !== 'object') return;

            // Extract PubKey & Short ID (Exact match with MainActivity.kt: pubKey.substring(0, 4).toUpperCase())
            let pubKey = item.public_key || item.publicKey || item.pubKey || '';
            if (typeof pubKey !== 'string') pubKey = String(pubKey);
            pubKey = pubKey.trim();

            let id = '';
            if (pubKey.length >= 4) {
              id = pubKey.substring(0, 4).toUpperCase();
            } else {
              let rawId = item.id || item.nodeId || item.node_id || item.num || (item.user ? item.user.id : null);
              if (!rawId) return;
              id = rawId.toString().trim().toUpperCase();
              if (id.startsWith('!')) id = id.substring(1);
              // If ID is a long numeric string or hex string, derive 4-char hex prefix
              if (id.length > 6) {
                if (/^[0-9]+$/.test(id)) {
                  // Decimal number to 4-char hex
                  const hex = parseInt(id, 10).toString(16).toUpperCase();
                  id = hex.padStart(4, '0').substring(0, 4);
                } else {
                  id = id.substring(0, 4).toUpperCase();
                }
              }
            }

            if (!id || id.length < 2) return;

            // Extract Name
            let name = item.name || item.contactName || item.contact_name || item.custom_name || item.alias || item.node_name || item.longName || (item.user ? (item.user.longName || item.user.shortName) : null) || id;

            // Extract Role / Type (Meshcore: 2 = Repeater, 1 = User)
            let role = item.role !== undefined ? item.role : (item.type !== undefined ? item.type : null);
            if (role === null || role === undefined || role === 0) {
              if (id.length === 4 || id.length === 6 || name.toUpperCase().includes("REPEATER") || name.toUpperCase().includes("RPT")) {
                role = 2; // Repeater
              } else {
                role = 1; // User
              }
            }

            // Extract Coordinates
            let lat = 0;
            let lng = 0;

            if (item.lat !== undefined) lat = parseFloat(item.lat);
            else if (item.latitude !== undefined) lat = parseFloat(item.latitude);
            else if (item.position && item.position.latitude !== undefined) lat = parseFloat(item.position.latitude);
            else if (item.position && item.position.latitudeI !== undefined) lat = item.position.latitudeI / 1e7;

            if (item.lng !== undefined) lng = parseFloat(item.lng);
            else if (item.lon !== undefined) lng = parseFloat(item.lon);
            else if (item.longitude !== undefined) lng = parseFloat(item.longitude);
            else if (item.position && item.position.longitude !== undefined) lng = parseFloat(item.position.longitude);
            else if (item.position && item.position.longitudeI !== undefined) lng = item.position.longitudeI / 1e7;

            if (isNaN(lat)) lat = 0;
            if (isNaN(lng)) lng = 0;

            if (!pubKey) pubKey = id;

            const uniqueKey = pubKey || id;

            locatedNodes.set(uniqueKey, {
              id,
              name,
              role,
              lat,
              lng,
              pubKey,
              lastSeen: Date.now()
            });

            count++;
          });

          if (isRepeatersVisible) {
            refreshRepeaterMarkersLayer();
          }

          alert(`Imported ${count} contacts successfully!`);
          updateUILists();
          savePersistedData();
          updateAnalysisData();
          if (lastReceivedSignal) {
            updateRepeaterDisplay(lastReceivedSignal.nodeId, lastReceivedSignal.hopCount);
          }
        } catch (err) {
          alert("Error parsing contacts JSON: " + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  window.confirmClearContacts = () => {
    if (confirm("Clear all stored contacts?")) {
      locatedNodes.clear();
      savePersistedData();
      updateUILists();
      alert("Contacts cleared.");
    }
  };

  // --- Global Re-render Function for Filters ---
  function applyGlobalFilterState() {
    updateFilterButtonState();
    updateMapSignalMarkers();
    updateMapHeatmap();
    updateRadarBlips();
    refreshRepeaterMarkersLayer();
    updateUILists();
    updateAnalysisData();
    if (signalGraphRenderer) signalGraphRenderer.draw();
  }
  window.applyGlobalFilterState = applyGlobalFilterState;

  // Filter Hub Functions
  window.applyFilters = () => {
    const targetInput = document.getElementById('filterTargetIds');
    if (targetInput) {
      filters.targetIds = targetInput.value.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    }
    const lenSel = document.getElementById('filterIdLength');
    if (lenSel) filters.idLength = parseInt(lenSel.value, 10);

    const typeSel = document.getElementById('filterTrafficType');
    if (typeSel) filters.trafficType = parseInt(typeSel.value, 10);

    const chkZero = document.getElementById('chkZeroHop');
    if (chkZero) filters.zeroHopOnly = chkZero.checked;

    const cbFocus = document.getElementById('cbFocusEnabled');
    if (cbFocus) {
      cbFocus.checked = filters.targetIds.length > 0 || filters.idLength > 0 || filters.trafficType > 0 || filters.zeroHopOnly;
      localStorage.setItem('focus_filter_enabled', cbFocus.checked ? 'true' : 'false');
    }

    window.closeFilterHub();
    applyGlobalFilterState();
  };

  window.resetFilters = () => {
    filters = { targetIds: [], idLength: 0, trafficType: 0, zeroHopOnly: false };
    const targetInput = document.getElementById('filterTargetIds');
    if (targetInput) targetInput.value = '';
    const lenSel = document.getElementById('filterIdLength');
    if (lenSel) lenSel.value = '0';
    const typeSel = document.getElementById('filterTrafficType');
    if (typeSel) typeSel.value = '0';
    const chkZero = document.getElementById('chkZeroHop');
    if (chkZero) chkZero.checked = false;

    const cbFocus = document.getElementById('cbFocusEnabled');
    if (cbFocus) {
      cbFocus.checked = false;
      localStorage.setItem('focus_filter_enabled', 'false');
    }

    applyGlobalFilterState();
  };

  // --- Trips Manager Engine ---
  window.renderSavedTrips = () => {
    const container = document.getElementById('listSavedTrips');
    if (!container) return;

    const raw = localStorage.getItem('saved_trips');
    let trips = [];
    try {
      trips = raw ? JSON.parse(raw) : [];
    } catch (e) {
      trips = [];
    }

    if (trips.length === 0) {
      container.innerHTML = `<li style="text-align:center; padding:30px; color:#AAA; font-size:0.85rem;">No saved trips found. Start a recording trip to save logs here.</li>`;
      return;
    }

    let html = '';
    trips.forEach((trip) => {
      const mins = Math.floor((trip.durationSec || 0) / 60);
      const secs = (trip.durationSec || 0) % 60;
      const durStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const distStr = `${(trip.distanceKm || 0).toFixed(2)} km`;
      const count = trip.pointCount || (trip.logs ? trip.logs.length : 0);

      html += `
        <li class="trip-card">
          <div class="trip-card-header">
            <span class="trip-card-title">📂 ${trip.name || 'Saved Trip'}</span>
            <span style="font-size:0.7rem; color:#888;">${new Date(trip.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="trip-card-stats">
            <span>⏱️ ${durStr}</span>
            <span>📏 ${distStr}</span>
            <span>📡 ${count} points</span>
          </div>
          <div class="trip-card-actions">
            <button class="btn-trip-action btn-trip-load" onclick="loadSavedTrip('${trip.id}')">📂 Load</button>
            <button class="btn-trip-action btn-trip-csv" onclick="exportTripCsv('${trip.id}')">📄 CSV</button>
            <button class="btn-trip-action btn-trip-kml" onclick="exportTripKml('${trip.id}')">🌍 KML</button>
            <button class="btn-trip-action btn-trip-delete" onclick="deleteSavedTrip('${trip.id}')">🗑️ Delete</button>
          </div>
        </li>
      `;
    });

    container.innerHTML = html;
  };

  window.loadSavedTrip = (tripId) => {
    let trip = null;
    const raw = localStorage.getItem('saved_trips');
    if (raw) {
      try {
        const trips = JSON.parse(raw);
        trip = trips.find(t => t.id === tripId);
      } catch (e) {}
    }
    if (!trip && window.inMemoryTrips && Array.isArray(window.inMemoryTrips)) {
      trip = window.inMemoryTrips.find(t => t.id === tripId);
    }

    if (!trip) {
      showToastMessage("⚠️ Trip not found in storage.");
      switchNavTab('map');
      if (typeof window.closeTripsManager === 'function') window.closeTripsManager();
      const modalTrips = document.getElementById('modalTrips');
      if (modalTrips) modalTrips.classList.remove('active');
      return;
    }

    if (typeof window.resetFilters === 'function') {
      window.resetFilters();
    }

    allReceivedLogs = [];
    bestSeenMap.clear();
    // Contacts (locatedNodes) are preserved and NOT cleared during trip load
    mapSignalPoints = [];
    wardriveTrackPoints = [];

    // Reset Focus Filter on trip load so all points are displayed
    const cbFocus = document.getElementById('cbFocusEnabled');
    if (cbFocus) cbFocus.checked = false;

    if (trip.trackPoints && Array.isArray(trip.trackPoints)) {
      wardriveTrackPoints = trip.trackPoints
        .map(p => normalizeLngLat(p))
        .filter(p => p !== null);
    }

    if (trip.logs && Array.isArray(trip.logs)) {
      trip.logs.forEach(rawItem => {
        if (!rawItem) return;
        if (rawItem.nodeId && rawItem.nodeId.toUpperCase() === 'TRAIL') return;

        const coords = normalizeLngLat(rawItem);
        const normLat = coords ? coords[1] : (parseFloat(rawItem.lat) || 0);
        const normLng = coords ? coords[0] : (parseFloat(rawItem.lng) || 0);
        const item = { ...rawItem, lat: normLat, lng: normLng };
        allReceivedLogs.push(item);
        if (item.nodeId) bestSeenMap.set(item.nodeId.toUpperCase(), item);
        if (normLat !== 0 && normLng !== 0) mapSignalPoints.push(item);
      });
    }

    totalDistanceKm = trip.distanceKm || 0;
    sessionStartTime = trip.timestamp || Date.now();

    updateWardriveTrackLayer();

    // Close Trips Modal & Switch to Map Tab FIRST so map container is visible (display: block)
    if (typeof window.closeTripsManager === 'function') window.closeTripsManager();
    switchNavTab('map');

    // Collect all valid normalized [lng, lat] points to calculate fitBounds
    let fitPoints = [];
    if (wardriveTrackPoints.length > 0) {
      fitPoints = wardriveTrackPoints;
    } else if (mapSignalPoints.length > 0) {
      fitPoints = mapSignalPoints.map(p => normalizeLngLat(p)).filter(p => p !== null);
    }

    if (map && fitPoints.length > 0) {
      isProgrammaticPan = true;
      map.resize();

      setTimeout(() => {
        if (!map) return;
        map.resize();

        const lngs = fitPoints.map(p => p[0]);
        const lats = fitPoints.map(p => p[1]);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);

        const dMeters = calculateDistanceKm(minLat, minLng, maxLat, maxLng) * 1000;

        if (minLng === maxLng && minLat === maxLat) {
          map.flyTo({ center: [minLng, minLat], zoom: 15.5 });
        } else if (dMeters < 50) {
          map.flyTo({ center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom: 16 });
        } else {
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
            padding: { top: 25, bottom: 25, left: 20, right: 20 },
            maxZoom: 16.5,
            duration: 800
          });
        }
        setTimeout(() => { isProgrammaticPan = false; }, 900);
      }, 60);
    }

    // Automatically render signal markers, heatmap, and signal RSSI graph on map load
    updateMapSignalMarkers();
    if (isHeatmapVisible) {
      updateMapHeatmap();
    }
    if (signalGraphRenderer && trip.logs) {
      signalGraphRenderer.importTripLogs(trip.logs);
    }

    updateUILists();
    updateAnalysisData();
    switchNavTab('map');
    if (typeof window.closeTripsManager === 'function') window.closeTripsManager();
    const modalTrips = document.getElementById('modalTrips');
    if (modalTrips) modalTrips.classList.remove('active');
    showToastMessage(`📂 Loaded '${trip.name || 'Trip'}' (${allReceivedLogs.length} points)`);
  };

  window.exportTripCsv = (tripId) => {
    const raw = localStorage.getItem('saved_trips');
    if (!raw) return;
    const trips = JSON.parse(raw);
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.logs || trip.logs.length === 0) {
      alert("No log data available in this trip.");
      return;
    }

    let csv = "Timestamp,Latitude,Longitude,NodeID,SNR,RSSI,Hops,PayloadType,RawData\n";
    trip.logs.forEach(item => {
      csv += `${item.time || ''},${item.lat || ''},${item.lng || ''},${item.nodeId || ''},${item.snr || 0},${item.rssi || 0},${item.hops || 0},,${item.rawHex || ''}\n`;
    });
    const safeName = (trip.name || 'trip').replace(/[^a-zA-Z0-9]/g, '_');
    downloadFile(csv, `${safeName}.csv`, 'text/csv');
  };

  window.exportTripKml = (tripId) => {
    const raw = localStorage.getItem('saved_trips');
    if (!raw) return;
    const trips = JSON.parse(raw);
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.trackPoints || trip.trackPoints.length === 0) {
      alert("No GPS track points available in this trip.");
      return;
    }

    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>${trip.name || 'Meshcore Track'}</name>\n<Placemark>\n<LineString>\n<coordinates>\n`;
    trip.trackPoints.forEach(pt => { kml += `${pt[1]},${pt[0]},0\n`; });
    kml += `</coordinates>\n</LineString>\n</Placemark>\n</Document>\n</kml>`;
    const safeName = (trip.name || 'track').replace(/[^a-zA-Z0-9]/g, '_');
    downloadFile(kml, `${safeName}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  window.deleteSavedTrip = (tripId) => {
    if (!confirm("Are you sure you want to delete this saved trip?")) return;
    const raw = localStorage.getItem('saved_trips');
    if (!raw) return;
    let trips = JSON.parse(raw);
    trips = trips.filter(t => t.id !== tripId);
    localStorage.setItem('saved_trips', JSON.stringify(trips));
    window.renderSavedTrips();
  };

  function importSessionJsonData(json, fileName) {
    if (!json) return;
    const rawLogs = json.logs || json.allReceivedLogs || [];
    const rawTracks = json.trackPoints || json.wardriveTrackPoints || [];

    const logs = [];
    const trackPoints = [];

    rawTracks.forEach(p => {
      const coords = normalizeLngLat(p);
      if (coords) trackPoints.push(coords);
    });

    rawLogs.forEach(rawItem => {
      const coords = normalizeLngLat(rawItem);
      const normLat = coords ? coords[1] : (parseFloat(rawItem.lat) || 0);
      const normLng = coords ? coords[0] : (parseFloat(rawItem.lng) || 0);
      logs.push({ ...rawItem, lat: normLat, lng: normLng });
    });

    const newTrip = {
      id: "trip_json_" + Date.now(),
      name: "📂 " + fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      timestamp: Date.now(),
      durationSec: 0,
      distanceKm: json.totalDistanceKm || 0,
      pointCount: logs.length,
      trackPoints: trackPoints,
      logs: logs
    };

    try {
      const raw = localStorage.getItem('saved_trips');
      let saved = raw ? JSON.parse(raw) : [];
      saved.unshift(newTrip);
      localStorage.setItem('saved_trips', JSON.stringify(saved));
      showToastMessage(`✅ Successfully imported '${fileName}'!`);
      if (typeof window.renderSavedTrips === 'function') window.renderSavedTrips();
      if (typeof window.loadSavedTrip === 'function') window.loadSavedTrip(newTrip.id);
    } catch (e) {
      showToastMessage("⚠️ Failed to save imported session JSON.");
    }
  }
  window.importSessionJsonData = importSessionJsonData;

  // --- Import External CSV / KML File from Downloads into Trips Manager ---
  window.triggerImportTripFile = () => {
    const input = document.getElementById('inputImportTripFile');
    if (input) {
      input.value = '';
      input.click();
    }
  };

  window.handleImportTripFile = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target.result;
      if (!content || !content.trim()) {
        showToastMessage("⚠️ Selected file is empty.");
        return;
      }

      if (fileName.toLowerCase().endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          if (json.logs || json.allReceivedLogs) {
            importSessionJsonData(json, fileName);
          } else {
            showToastMessage("⚠️ Invalid JSON session format.");
          }
        } catch (err) {
          showToastMessage("⚠️ Failed to parse JSON file.");
        }
      } else if (fileName.toLowerCase().endsWith('.csv')) {
        importTripFromCsv(content, fileName);
      } else if (fileName.toLowerCase().endsWith('.kml')) {
        showToastMessage("ℹ️ KML tracks are best imported as CSV logs for full signal telemetry.");
      }
    };

    reader.readAsText(file);
  };

  function importTripFromCsv(csvText, fileName) {
    if (!csvText || !csvText.trim()) {
      showToastMessage("⚠️ CSV file is empty.");
      return;
    }

    if (typeof window.resetFilters === 'function') {
      window.resetFilters();
    }

    const rawLines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length <= 1) {
      showToastMessage("⚠️ CSV file contains no data entries.");
      return;
    }

    const firstLine = rawLines[0];
    const sep = (firstLine.includes(';') && !firstLine.includes(',')) || (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    const headerLine = firstLine.toLowerCase();
    const headers = headerLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

    let idxTime = -1, idxLat = -1, idxLng = -1, idxNode = -1, idxSnr = -1, idxRssi = -1, idxHops = -1, idxPayload = -1, idxRaw = -1;

    headers.forEach((h, idx) => {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanH === 'timestamp' || cleanH === 'time' || cleanH === 'date') idxTime = idx;
      else if (cleanH === 'latitude' || cleanH === 'lat') idxLat = idx;
      else if (cleanH === 'longitude' || cleanH === 'lon' || cleanH === 'lng') idxLng = idx;
      else if (cleanH === 'node_id' || cleanH === 'nodeid' || cleanH === 'node') idxNode = idx;
      else if (cleanH === 'snr_db' || cleanH === 'snr' || cleanH === 'snrdb') idxSnr = idx;
      else if (cleanH === 'rssi_dbm' || cleanH === 'rssi' || cleanH === 'rssidbm') idxRssi = idx;
      else if (cleanH === 'hop_count' || cleanH === 'hopcount' || cleanH === 'hops' || cleanH === 'hop') idxHops = idx;
      else if (cleanH === 'payload_type' || cleanH === 'payloadtype' || cleanH === 'payload' || cleanH === 'type') idxPayload = idx;
      else if (cleanH === 'raw_data' || cleanH === 'rawdata' || cleanH === 'rawhex' || cleanH === 'raw' || cleanH === 'data') idxRaw = idx;
    });

    const logs = [];
    const trackPoints = [];
    let prevLat = null, prevLng = null;
    let totalDist = 0;

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;
      const parts = line.split(sep).map(p => (p !== undefined && p !== null ? String(p).trim().replace(/^["']|["']$/g, '') : ''));
      if (parts.length < 3) continue;

      let time = '', lat = NaN, lng = NaN, nodeId = '', snr = 0, rssi = 0, hops = 0, payloadType = null, rawHex = '';

      if (idxLat >= 0 && idxLng >= 0) {
        time = (idxTime >= 0 && parts[idxTime] !== undefined) ? parts[idxTime] : '';
        const rawLatStr = (parts[idxLat] !== undefined && parts[idxLat] !== null) ? String(parts[idxLat]) : '';
        const rawLngStr = (parts[idxLng] !== undefined && parts[idxLng] !== null) ? String(parts[idxLng]) : '';
        lat = parseFloat(rawLatStr.replace(',', '.'));
        lng = parseFloat(rawLngStr.replace(',', '.'));
        nodeId = (idxNode >= 0 && parts[idxNode] !== undefined) ? parts[idxNode] : '';
        snr = (idxSnr >= 0 && parts[idxSnr] !== undefined) ? parseInt(parts[idxSnr]) || 0 : 0;
        rssi = (idxRssi >= 0 && parts[idxRssi] !== undefined) ? parseInt(parts[idxRssi]) || 0 : 0;
        hops = (idxHops >= 0 && parts[idxHops] !== undefined) ? parseInt(parts[idxHops]) || 0 : 0;
        rawHex = (idxRaw >= 0 && parts[idxRaw] !== undefined) ? parts[idxRaw] : '';
      } else {
        // Fallback for headerless CSVs
        const p1Str = parts[1] !== undefined ? String(parts[1]) : '';
        const p1Num = parseFloat(p1Str.replace(',', '.'));
        if (!isNaN(p1Num) && Math.abs(p1Num) > 20) {
          // Format B (MainActivity): Time=0, Lat=1, Lon=2, Node=3, SNR=4, RSSI=5, Hops=6
          time = parts[0] || '';
          lat = parseFloat(String(parts[1] || '').replace(',', '.'));
          lng = parseFloat(String(parts[2] || '').replace(',', '.'));
          nodeId = parts[3] || '';
          snr = parseInt(parts[4]) || 0;
          rssi = parseInt(parts[5]) || 0;
          hops = parts[6] ? parseInt(parts[6]) || 0 : 0;
          rawHex = parts[8] || '';
        } else {
          // Format A (WardriveService): Time=0, Node=1, SNR=2, RSSI=3, Lat=4, Lon=5, Hops=8
          time = parts[0] || '';
          nodeId = parts[1] || '';
          snr = parseInt(parts[2]) || 0;
          rssi = parseInt(parts[3]) || 0;
          lat = parseFloat(String(parts[4] || '').replace(',', '.'));
          lng = parseFloat(String(parts[5] || '').replace(',', '.'));
          hops = parts[8] ? parseInt(parts[8]) || 0 : 0;
          rawHex = parts[10] || '';
        }
      }

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) continue;

      const normCoords = normalizeLngLat({ lat, lng });
      const normLat = normCoords ? normCoords[1] : lat;
      const normLng = normCoords ? normCoords[0] : lng;

      if (prevLat !== null && prevLng !== null) {
        totalDist += calculateDistanceKm(prevLat, prevLng, normLat, normLng);
      }
      prevLat = normLat;
      prevLng = normLng;

      trackPoints.push([normLng, normLat]);

      if (nodeId && nodeId.toUpperCase() !== 'TRAIL') {
        let meshPacket = null;
        if (rawHex && typeof ProtocolDecoder !== 'undefined') {
          meshPacket = ProtocolDecoder.decodeRawHex(rawHex);
        }
        logs.push({
          time,
          lat: normLat,
          lng: normLng,
          nodeId: nodeId.toUpperCase(),
          snr,
          rssi,
          hops,
          payloadType,
          rawHex,
          meshPacket
        });
      }
    }

    if (logs.length === 0 && trackPoints.length === 0) {
      showToastMessage("⚠️ No valid GPS records found in CSV.");
      return;
    }

    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const newTrip = {
      id: "trip_imp_" + Date.now(),
      name: "📂 " + cleanName,
      timestamp: Date.now(),
      durationSec: 0,
      distanceKm: totalDist,
      pointCount: logs.length,
      trackPoints: trackPoints,
      logs: logs
    };

    if (!window.inMemoryTrips) window.inMemoryTrips = [];
    window.inMemoryTrips.unshift(newTrip);

    try {
      const raw = localStorage.getItem('saved_trips');
      let saved = raw ? JSON.parse(raw) : [];
      saved.unshift(newTrip);
      if (saved.length > 10) saved = saved.slice(0, 10);
      localStorage.setItem('saved_trips', JSON.stringify(saved));
    } catch (e) {
      console.warn("localStorage quota notice, saved in RAM:", e);
    }

    if (typeof window.renderSavedTrips === 'function') window.renderSavedTrips();
    if (typeof window.loadSavedTrip === 'function') window.loadSavedTrip(newTrip.id);
  }

  // Import / Export
  window.exportCsv = () => {
    if (allReceivedLogs.length === 0) {
      alert("No logs available to export.");
      return;
    }
    let csv = "Timestamp,Latitude,Longitude,NodeID,SNR,RSSI,RawHex\n";
    allReceivedLogs.forEach(item => {
      csv += `${item.time},${item.lat},${item.lng},${item.nodeId},${item.snr},${item.rssi},${item.rawHex || ''}\n`;
    });
    downloadFile(csv, `meshcore_wardrive_${Date.now()}.csv`, 'text/csv');
  };

  window.exportKml = () => {
    if (wardriveTrackPoints.length === 0) {
      alert("No track points available to export as KML.");
      return;
    }
    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>Meshcore Track</name>\n<Placemark>\n<LineString>\n<coordinates>\n`;
    wardriveTrackPoints.forEach(pt => { kml += `${pt[1]},${pt[0]},0\n`; });
    kml += `</coordinates>\n</LineString>\n</Placemark>\n</Document>\n</kml>`;
    downloadFile(kml, `meshcore_track_${Date.now()}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  window.exportSessionJson = () => {
    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      totalDistanceKm,
      allReceivedLogs,
      locatedNodes: Array.from(locatedNodes.entries()),
      wardriveTrackPoints
    };
    downloadFile(JSON.stringify(data, null, 2), `meshcore_session_${Date.now()}.json`, 'application/json');
  };

  window.clearCurrentSessionData = (promptConfirm = true) => {
    if (promptConfirm && !confirm("Clear current session logs and map markers?")) {
      return;
    }

    // 1. Clear session data in RAM
    allReceivedLogs = [];
    bestSeenMap.clear();
    mapSignalPoints = [];
    wardriveTrackPoints = [];
    selectedNodeId = null;
    selectedLogPositionKey = null;
    totalDistanceKm = 0;
    sessionStartTime = Date.now();

    // 2. Clear MapLibre GL HTML markers & popups
    signalMarkers.forEach(m => m.remove());
    signalMarkers = [];

    clearTemporaryMarkers();

    if (activePopup) {
      try { activePopup.remove(); } catch (e) {}
      activePopup = null;
    }

    // 3. Clear MapLibre GL GeoJSON vector layers
    try { updateWardriveTrackLayer(); } catch (e) {}
    try { updateMapSignalMarkers(); } catch (e) {}
    if (isHeatmapVisible) {
      try { updateMapHeatmap(); } catch (e) {}
    }

    if (map) {
      if (map.getSource('trajectory-src')) {
        try { map.getSource('trajectory-src').setData({ type: 'FeatureCollection', features: [] }); } catch (e) {}
      }
      if (map.getSource('range-spotlight-src')) {
        try { map.getSource('range-spotlight-src').setData({ type: 'FeatureCollection', features: [] }); } catch (e) {}
      }
      if (map.getSource('trilateration-src')) {
        try { map.getSource('trilateration-src').setData({ type: 'FeatureCollection', features: [] }); } catch (e) {}
      }
    }

    // 4. Clear graphs & dashboards
    if (signalGraphRenderer) {
      try { signalGraphRenderer.clear(); } catch (e) {}
    }

    const durDash = document.getElementById('tvTripDistDashboard');
    if (durDash) durDash.innerText = `0.00 km`;
    const durTime = document.getElementById('tvTripTimeDashboard');
    if (durTime) durTime.innerText = `00:00:00`;

    // 5. Refresh UI lists & close Trips modal
    updateUILists();
    updateAnalysisData();
    switchNavTab('map');
    if (typeof window.closeTripsManager === 'function') window.closeTripsManager();
    const modalTrips = document.getElementById('modalTrips');
    if (modalTrips) modalTrips.classList.remove('active');

    showToastMessage("🧹 Session logs & map cleared!");
  };

  window.clearCurrentSession = () => {
    window.clearCurrentSessionData(true);
  };

  // Import Session File Handler
  const fileSessionJson = document.getElementById('fileSessionJson');
  if (fileSessionJson) {
    fileSessionJson.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          allReceivedLogs = [];
          bestSeenMap.clear();
          mapSignalPoints = [];
          wardriveTrackPoints = [];

          if (Array.isArray(importedData)) {
            allReceivedLogs = importedData;
          } else if (importedData.allReceivedLogs || importedData.logs) {
            allReceivedLogs = importedData.allReceivedLogs || importedData.logs || [];
            if (importedData.wardriveTrackPoints || importedData.trackPoints) {
              wardriveTrackPoints = importedData.wardriveTrackPoints || importedData.trackPoints || [];
            }
          }

          allReceivedLogs.forEach(item => {
            bestSeenMap.set(item.nodeId.toUpperCase(), item);
            if (item.lat && item.lng) mapSignalPoints.push(item);
          });

          updateUILists();
          updateAnalysisData();
          window.closeTripsManager();
          alert(`Successfully imported session data! (${allReceivedLogs.length} points)`);
        } catch (err) {
          alert("Error parsing imported JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Initial Nav Visibility Check & Connectivity Guard on Page Load
  const initAppOnLoad = () => {
    if (typeof updateNavItemsVisibility === 'function') updateNavItemsVisibility();
    if (typeof window.renderQuickReplyChips === 'function') {
      window.renderQuickReplyChips(window.loadSavedQuickReplies());
    }
    if (typeof window.checkWebserverConnectivity === 'function') {
      window.checkWebserverConnectivity();
    }
  };

  window.addEventListener('online', () => { if (typeof window.checkWebserverConnectivity === 'function') window.checkWebserverConnectivity(); });
  window.addEventListener('offline', () => { if (typeof window.setHardResetButtonState === 'function') window.setHardResetButtonState(false, "⚠️ Offline Mode: Hard Reset is disabled to protect offline cache."); });
  setInterval(() => { if (typeof window.checkWebserverConnectivity === 'function') window.checkWebserverConnectivity(); }, 15000);

  setTimeout(initAppOnLoad, 50);
  window.addEventListener('load', initAppOnLoad);
  document.addEventListener('DOMContentLoaded', initAppOnLoad);

  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    let dLat = (lat2 - lat1) * Math.PI / 180;
    let dLon = (lon2 - lon1) * Math.PI / 180;
    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getCardinalDirection(bearing) {
    const b = (bearing % 360 + 360) % 360;
    if (b >= 337.5 || b < 22.5) return "N";
    if (b >= 22.5 && b < 67.5) return "NE";
    if (b >= 67.5 && b < 112.5) return "E";
    if (b >= 112.5 && b < 157.5) return "SE";
    if (b >= 157.5 && b < 202.5) return "S";
    if (b >= 202.5 && b < 247.5) return "SW";
    if (b >= 247.5 && b < 292.5) return "W";
    return "NW";
  }

  // Expose global helper functions on window to prevent ReferenceErrors
  window.triggerMapResize = triggerMapResize;
  window.setMapTileSource = setMapTileSource;
  window.applyTacticalHighContrastRoads = applyTacticalHighContrastRoads;

  // Mobile Soft Keyboard Layout Adjustment: Keep inputMessage visible above keyboard
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const inputMsg = document.getElementById('inputMessage');
      if (inputMsg && document.activeElement === inputMsg) {
        setTimeout(() => {
          inputMsg.scrollIntoView({ block: 'end', behavior: 'smooth' });
          const chatBox = document.getElementById('messengerChat');
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        }, 50);
      }
    });
  }

  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.id === 'inputMessage') {
      setTimeout(() => {
        e.target.scrollIntoView({ block: 'end', behavior: 'smooth' });
        const chatBox = document.getElementById('messengerChat');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }, 250);
    }
  });
  window.isSameNodeId = isSameNodeId;
  window.markMessageStatus = markMessageStatus;
  window.showMessageOverlay = showMessageOverlay;
  window.findNodeName = findNodeName;
  window.updateRepeaterDisplay = updateRepeaterDisplay;
  window.updateVuMeters = updateVuMeters;
  window.playSignalBeep = playSignalBeep;
  window.updateUILists = updateUILists;
  window.saveCurrentTripToStorage = saveCurrentTripToStorage;
  window.calculateDistanceKm = calculateDistanceKm;
  window.getSnrColor = getSnrColor;
  window.addRepeaterMarkerToMap = addRepeaterMarkerToMap;
  window.showContactDetailsDialog = showContactDetailsDialog;
  window.showSignalDeepDive = showSignalDeepDive;
  window.drawTrajectoryPath = drawTrajectoryPath;
  window.updateMapHeatmap = updateMapHeatmap;
  window.refreshRepeaterMarkersLayer = refreshRepeaterMarkersLayer;

  // --- Global Window Resize & Load Handlers for Map Canvas Auto-Expansion ---
  window.addEventListener('resize', () => {
    triggerMapResize();
  });

  window.addEventListener('load', () => {
    if (typeof maplibregl !== 'undefined' && map && activeMapSource) {
      setMapTileSource(activeMapSource);
    } else {
      triggerMapResize();
    }
  });

