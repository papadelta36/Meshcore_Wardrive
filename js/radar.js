/**
 * Canvas Renderers for Tactical UI Components:
 * - RadarView (360° sweeping CRT radar with phosphor blips decay)
 * - CompassArrowView (Military triangular compass arrow always pointing North)
 * - VuMeterView (70 discrete LED segment VU meter bar)
 * - GridBackgroundView (Tactical CRT grid background)
 * Implements High-DPI (Retina / DevicePixelRatio) Vector Sharpness
 */

class RadarCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.sweepAngle = 0;
    this.isDiscovering = false;
    this.isGpsOffline = true;
    this.blips = []; // { id, angle, distanceRatio, opacity }
    this.lastFrameTime = performance.now();
    this.isAnimating = false;
    this.dpr = window.devicePixelRatio || 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    let w = 0, h = 0;

    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }

    if (w <= 0 || h <= 0) {
      w = window.innerWidth || 300;
      h = window.innerHeight || 300;
    }

    const cssSize = Math.floor(Math.min(w, h));
    const dpr = window.devicePixelRatio || 1;
    const bufferSize = Math.floor(cssSize * dpr);

    if (cssSize > 0 && (this.canvas.width !== bufferSize || this.canvas.height !== bufferSize)) {
      this.canvas.width = bufferSize;
      this.canvas.height = bufferSize;
      this.canvas.style.width = cssSize + "px";
      this.canvas.style.height = cssSize + "px";
      this.dpr = dpr;
      this.cssSize = cssSize;
    }
  }

  setBlipsFromNodes(nodeIds) {
    const newBlips = [];
    nodeIds.forEach(id => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0;
      }
      const uHash = Math.abs(hash);
      const angle = (uHash % 360);
      const distanceRatio = 0.25 + (((uHash * 31) >>> 1) % 55) / 100.0;

      const existing = this.blips.find(b => b.id === id);
      newBlips.push({
        id,
        angle,
        distanceRatio,
        opacity: existing ? existing.opacity : 0
      });
    });
    this.blips = newBlips;
  }

  setBlipsFromLocations(userLocation, userBearing, locatedNodes) {
    if (!userLocation || userLocation.lat === undefined || userLocation.lng === undefined) {
      this.isGpsOffline = true;
      this.blips = [];
      return;
    }

    this.isGpsOffline = false;
    const userLat = userLocation.lat;
    const userLng = userLocation.lng;
    const bearing = userBearing || 0;
    const newBlips = [];

    if (Array.isArray(locatedNodes)) {
      locatedNodes.forEach(node => {
        if (!node || node.lat === undefined || node.lng === undefined || node.lat === 0 || node.lng === 0) return;

        // Distance calculation via shared Haversine helper
        const distanceKm = (typeof window.calculateDistanceKm === 'function')
          ? window.calculateDistanceKm(userLat, userLng, node.lat, node.lng)
          : (() => {
              const dLat = (node.lat - userLat) * Math.PI / 180;
              const dLon = (node.lng - userLng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLat * Math.PI / 180) * Math.cos(node.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
              return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            })();
        const distanceMeters = distanceKm * 1000.0;

        if (distanceMeters <= 1000) { // 1 km radius filter
          // Bearing calculation from user position to node position
          const y = Math.sin((node.lng - userLng) * Math.PI / 180) * Math.cos(node.lat * Math.PI / 180);
          const x = Math.cos(userLat * Math.PI / 180) * Math.sin(node.lat * Math.PI / 180) -
                    Math.sin(userLat * Math.PI / 180) * Math.cos(node.lat * Math.PI / 180) * Math.cos((node.lng - userLng) * Math.PI / 180);
          const nodeBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

          const relativeAngle = (nodeBearing - bearing + 360) % 360;
          // Canvas 0° is East (3 o'clock), so subtract 90° to orient 0° North at top
          const drawAngle = (-90 + relativeAngle + 360) % 360;
          const distanceRatio = Math.min(1.0, Math.max(0.05, distanceMeters / 1000.0));

          const rawHexId = (node.id || "").trim().toUpperCase();
          const hexDisplayId = rawHexId.length > 6 ? rawHexId.substring(0, 6) : rawHexId;

          const existing = this.blips.find(b => b.id === hexDisplayId || b.id === node.id);
          newBlips.push({
            id: hexDisplayId,
            angle: drawAngle,
            distanceRatio: distanceRatio,
            opacity: existing ? existing.opacity : 0
          });
        }
      });
    }

    this.blips = newBlips;
  }

  start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.lastFrameTime = performance.now();
    const animate = (now) => {
      if (!this.isAnimating) return;
      this.draw(now);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  stop() {
    this.isAnimating = false;
  }

  draw(now) {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const dpr = this.dpr || window.devicePixelRatio || 1;
    const w = this.cssSize || (this.canvas.width / dpr);
    const h = this.cssSize || (this.canvas.height / dpr);
    if (w <= 0 || h <= 0) return;

    const deltaTime = (now - this.lastFrameTime) / 1000.0;
    this.lastFrameTime = now;

    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 6;

    if (radius <= 0) {
      ctx.restore();
      return;
    }

    ctx.clearRect(0, 0, w, h);

    // 1. CRT Background
    ctx.fillStyle = this.isDiscovering ? "#120202" : "#000A02";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    const primaryColor = this.isDiscovering ? "#F44336" : "#00FF00";
    const gridColor = this.isDiscovering ? "rgba(244, 67, 54, 0.25)" : "rgba(0, 255, 0, 0.25)";
    const crossColor = this.isDiscovering ? "rgba(244, 67, 54, 0.12)" : "rgba(0, 255, 0, 0.12)";

    // 2. Concentric Grid Rings
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = Math.max(1, radius * 0.015);
    [1.0, 0.75, 0.5, 0.25].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Distance Ring Label ("1km")
    ctx.fillStyle = this.isDiscovering ? "rgba(244, 67, 54, 0.6)" : "rgba(0, 255, 0, 0.6)";
    ctx.font = `bold ${Math.max(10, Math.floor(radius * 0.08))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("1km", cx - radius * 0.875, cy - 4);

    // Crosshair axes
    ctx.strokeStyle = crossColor;
    ctx.lineWidth = Math.max(1, radius * 0.01);
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Radial Spoke Lines
    const angles = [30, 60, 120, 150, 210, 240, 300, 330];
    angles.forEach(a => {
      const rad = (a * Math.PI) / 180.0;
      ctx.beginPath();
      ctx.moveTo(cx + (radius * 0.9) * Math.cos(rad), cy + (radius * 0.9) * Math.sin(rad));
      ctx.lineTo(cx + radius * Math.cos(rad), cy + radius * Math.sin(rad));
      ctx.stroke();
    });

    // GPS Offline Warning
    if (this.isGpsOffline) {
      ctx.fillStyle = this.isDiscovering ? "rgba(244, 67, 54, 0.7)" : "rgba(0, 255, 0, 0.7)";
      ctx.font = `bold ${Math.max(11, Math.floor(radius * 0.09))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("GPS OFFLINE", cx, cy + radius * 0.4);
    }

    // 3. Sweeping Radar Cone & Lead Line (Trailing Afterglow BEHIND Lead Line)
    const sweepRad = (this.sweepAngle * Math.PI) / 180.0;

    // Start 60° (Math.PI / 3) behind the lead line so afterglow trails BEHIND the sweep line
    const startAngle = sweepRad - (Math.PI / 3);
    const grad = ctx.createConicGradient(startAngle, cx, cy);
    if (this.isDiscovering) {
      grad.addColorStop(0, "rgba(244, 67, 54, 0)");
      grad.addColorStop(0.10, "rgba(244, 67, 54, 0.15)");
      grad.addColorStop(0.1667, "rgba(244, 67, 54, 0.5)");
      grad.addColorStop(0.1668, "rgba(244, 67, 54, 0)");
      grad.addColorStop(1.0, "rgba(244, 67, 54, 0)");
    } else {
      grad.addColorStop(0, "rgba(0, 255, 0, 0)");
      grad.addColorStop(0.10, "rgba(0, 255, 0, 0.15)");
      grad.addColorStop(0.1667, "rgba(0, 255, 0, 0.5)");
      grad.addColorStop(0.1668, "rgba(0, 255, 0, 0)");
      grad.addColorStop(1.0, "rgba(0, 255, 0, 0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Sweep Head Line
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = Math.max(2, radius * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(sweepRad), cy + radius * Math.sin(sweepRad));
    ctx.stroke();

    // 4. Phosphor Fading Blips
    this.blips.forEach(blip => {
      const angleDiff = (this.sweepAngle - blip.angle + 360) % 360;
      if (angleDiff >= 0 && angleDiff <= 10) {
        blip.opacity = 1.0;
      } else {
        blip.opacity = Math.max(0, blip.opacity - (0.72 * deltaTime));
      }

      if (blip.opacity > 0) {
        const rad = (blip.angle * Math.PI) / 180.0;
        const bx = cx + (radius * blip.distanceRatio) * Math.cos(rad);
        const by = cy + (radius * blip.distanceRatio) * Math.sin(rad);

        const blipRadius = Math.max(3, radius * 0.03);

        // Outer Glow
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = blip.opacity * 0.45;
        ctx.beginPath();
        ctx.arc(bx, by, blipRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = blip.opacity;
        ctx.beginPath();
        ctx.arc(bx, by, blipRadius, 0, Math.PI * 2);
        ctx.fill();

        // Alphanumeric ID Label
        if (blip.id) {
          ctx.fillStyle = primaryColor;
          ctx.globalAlpha = blip.opacity * 0.95;
          ctx.font = `bold ${Math.max(10, Math.floor(radius * 0.08))}px monospace`;
          ctx.textAlign = "left";
          ctx.fillText(blip.id, bx + (blipRadius * 2), by - 3);
        }
        ctx.globalAlpha = 1.0;
      }
    });

    // Update angle (180 degrees/sec)
    this.sweepAngle = (this.sweepAngle + (180.0 * deltaTime)) % 360;

    ctx.restore();
  }
}

class CompassCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.bearing = 0;
    this.targetBearing = 0;
    this.color = "#00FF00";
    this.dpr = window.devicePixelRatio || 1;
    this.isAnimating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startAnimation();
  }

  resize() {
    if (!this.canvas) return;
    let size = 32;
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      size = Math.floor(Math.min(rect.width, rect.height)) || 32;
    }

    const dpr = window.devicePixelRatio || 1;
    const bufferSize = Math.floor(size * dpr);

    if (size > 0 && (this.canvas.width !== bufferSize || this.canvas.height !== bufferSize)) {
      this.canvas.width = bufferSize;
      this.canvas.height = bufferSize;
      this.canvas.style.width = size + "px";
      this.canvas.style.height = size + "px";
      this.dpr = dpr;
      this.cssSize = size;
    }
    this.draw();
  }

  setBearing(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return;
    this.targetBearing = (deg + 360) % 360;
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    const animate = () => {
      if (!this.isAnimating) return;

      // Shortest-path circular angle difference (-180° to +180°)
      let diff = this.targetBearing - this.bearing;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;

      if (Math.abs(diff) > 0.2) {
        this.bearing = (this.bearing + (diff * 0.18) + 360) % 360;
        this.draw();
      } else {
        this.bearing = this.targetBearing;
        this.draw();
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  setColor(c) {
    this.color = c;
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const dpr = this.dpr || window.devicePixelRatio || 1;
    const w = this.cssSize || (this.canvas.width / dpr);
    const h = this.cssSize || (this.canvas.height / dpr);
    if (w <= 0 || h <= 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 3;
    if (radius <= 0) {
      ctx.restore();
      return;
    }

    ctx.save();
    // Rotate canvas around center by -bearing so the arrow ALWAYS points towards TRUE NORTH!
    ctx.translate(cx, cy);
    ctx.rotate((-this.bearing * Math.PI) / 180.0);

    // Outer Compass Ring
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North Tick Line pointing to North
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, -radius + 5);
    ctx.stroke();

    // "N" Label for North
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.95;
    ctx.font = `bold ${Math.max(8, Math.floor(radius * 0.38))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("N", 0, -radius + 4);

    // Stealth Arrow Pointer pointing UP towards North (matching CompassArrowView.kt)
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -radius + 13);                  // Tip of arrow pointing towards North
    ctx.lineTo(-radius * 0.35, radius * 0.5);     // Bottom-left vertex
    ctx.lineTo(0, radius * 0.2);                  // Inner stealth cut
    ctx.lineTo(radius * 0.35, radius * 0.5);      // Bottom-right vertex
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

class SegmentedVuMeter {
  constructor(containerId, isRssi = false) {
    this.container = document.getElementById(containerId);
    this.isRssi = isRssi;
    this.numSegments = 70;
    this.progress = 0;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = "";
    this.segments = [];
    for (let i = 0; i < this.numSegments; i++) {
      const seg = document.createElement("div");
      seg.className = "vu-segment";
      this.container.appendChild(seg);
      this.segments.push(seg);
    }
  }

  getGradientColor(ratio) {
    if (ratio < 0.5) {
      const r = Math.round(0xF4 + ((0xFF - 0xF4) * (ratio * 2)));
      const g = Math.round(0x43 + ((0xEB - 0x43) * (ratio * 2)));
      const b = Math.round(0x36 + ((0x3B - 0x36) * (ratio * 2)));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const r = Math.round(0xFF + ((0x4C - 0xFF) * ((ratio - 0.5) * 2)));
      const g = Math.round(0xEB + ((0xAF - 0xEB) * ((ratio - 0.5) * 2)));
      const b = Math.round(0x3B + ((0x50 - 0x3B) * ((ratio - 0.5) * 2)));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  setProgress(val) {
    this.progress = Math.min(1.0, Math.max(0.0, val));
    if (!this.segments) return;
    const activeCount = Math.round(this.progress * this.numSegments);
    for (let i = 0; i < this.numSegments; i++) {
      const seg = this.segments[i];
      if (!seg) continue;
      const ratio = i / (this.numSegments - 1);
      if (i < activeCount) {
        seg.style.backgroundColor = this.getGradientColor(ratio);
        seg.style.opacity = "1";
      } else {
        seg.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        seg.style.opacity = "0.3";
      }
    }
  }
}

window.RadarCanvas = RadarCanvas;
window.CompassCanvas = CompassCanvas;
window.SegmentedVuMeter = SegmentedVuMeter;
