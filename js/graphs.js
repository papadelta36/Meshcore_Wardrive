/**
 * Canvas Renderers for Signal Graphs:
 * - SignalGraphView (Scrolling multi-series RSSI graph with cubic curves, signal quality zones & legend)
 * - SignalDistanceGraphView (Scatter plot graph for SNR vs Distance km range analysis)
 * Implements High-DPI (Retina / DevicePixelRatio) Vector Sharpness
 */

class SignalGraphRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.seriesMap = new Map(); // id -> [{ timestamp, rssi }]
    this.displayNameMap = new Map(); // id -> name
    this.focusFilter = null;
    this.focusSeriesId = null;

    this.minY = -130;
    this.maxY = -30;
    this.colors = ["#4CAF50", "#00FFC8", "#FF9800", "#F44336", "#00E5FF", "#2196F3", "#FFEB3B"];
    this.dpr = window.devicePixelRatio || 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    if (this.isResizing) return;
    this.isResizing = true;

    try {
      let maxPointsInSeries = 0;
      this.seriesMap.forEach((series, id) => {
        if (this.shouldShowSeries(id)) {
          maxPointsInSeries = Math.max(maxPointsInSeries, series.length);
        }
      });

      const scrollContainer = document.getElementById('graphScrollContainer');
      const parentContainer = scrollContainer ? scrollContainer.parentElement : this.canvas.parentElement;
      const parentWidth = parentContainer ? parentContainer.clientWidth : 300;
      const parentHeight = parentContainer ? parentContainer.clientHeight : 250;

      const pointSpacing = 40;
      const calculatedWidth = Math.max(parentWidth, (maxPointsInSeries * pointSpacing) + 160);
      const cssW = Math.floor(calculatedWidth);
      const cssH = parentHeight > 0 ? Math.floor(parentHeight) : 250;
      const dpr = window.devicePixelRatio || 1;

      if (cssW > 0 && cssH > 0) {
        const bufW = Math.floor(cssW * dpr);
        const bufH = Math.floor(cssH * dpr);

        this.dpr = dpr;
        this.cssW = cssW;
        this.cssH = cssH;

        if (this.canvas.width !== bufW || this.canvas.height !== bufH) {
          this.canvas.width = bufW;
          this.canvas.height = bufH;
          this.canvas.style.width = cssW + "px";
          this.canvas.style.height = "100%";
        }
      }
    } finally {
      this.isResizing = false;
    }

    this.draw();
  }

  setFocusFilter(filter) {
    this.focusFilter = filter;
    this.draw();
  }

  shouldShowSeries(id) {
    const cbFocus = document.getElementById('cbFocusEnabled');
    if (cbFocus && !cbFocus.checked) return true;
    if (typeof window.matchesFilter === 'function') {
      return window.matchesFilter({ nodeId: id, id: id });
    }
    if (!this.focusFilter || this.focusFilter.length === 0) return true;
    return this.focusFilter.includes(id.toUpperCase().trim());
  }

  addValue(id, displayName, rssi, timestamp = Date.now()) {
    if (!this.seriesMap.has(id)) {
      this.seriesMap.set(id, []);
    }
    const series = this.seriesMap.get(id);
    this.displayNameMap.set(id, displayName || id);

    let filteredRssi = rssi;
    if (series.length > 0) {
      filteredRssi = (series[series.length - 1].rssi * 0.4) + (rssi * 0.6);
    }

    series.push({ timestamp, rssi: filteredRssi });
    if (series.length > 500) series.shift();

    this.updateScaling();
    this.draw();
  }

  clear() {
    this.seriesMap.clear();
    this.displayNameMap.clear();
    this.focusSeriesId = null;
    this.updateScaling();
    this.draw();
  }

  importTripLogs(logs) {
    this.seriesMap.clear();
    this.displayNameMap.clear();

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      this.updateScaling();
      this.draw();
      return;
    }

    logs.forEach((item, idx) => {
      if (!item || !item.nodeId || item.nodeId.toUpperCase() === 'TRAIL') return;
      const hexId = item.nodeId.trim().toUpperCase();
      const name = (typeof window.findNodeName === 'function' ? window.findNodeName(hexId) : null) || hexId;
      const rssi = typeof item.rssi === 'number' ? item.rssi : (parseInt(item.rssi) || -100);
      const parsedTime = item.time && !isNaN(new Date(item.time).getTime()) ? new Date(item.time).getTime() : null;
      const ts = (item.timestamp && !isNaN(Number(item.timestamp))) ? Number(item.timestamp) : (parsedTime || (Date.now() + idx * 1000));

      if (!this.seriesMap.has(hexId)) {
        this.seriesMap.set(hexId, []);
      }
      const series = this.seriesMap.get(hexId);
      this.displayNameMap.set(hexId, name);

      let filteredRssi = rssi;
      if (series.length > 0) {
        filteredRssi = (series[series.length - 1].rssi * 0.4) + (rssi * 0.6);
      }

      series.push({ timestamp: ts, rssi: filteredRssi });
    });

    this.updateScaling();
    this.draw();

    // Scroll to end of graph
    const scrollContainer = document.getElementById('graphScrollContainer');
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      }, 50);
    }
  }

  updateScaling() {
    let currentMin = 100;
    let currentMax = -150;
    let hasData = false;

    this.seriesMap.forEach((series, id) => {
      if (!this.shouldShowSeries(id)) return;
      series.forEach(p => {
        if (p.rssi < currentMin) currentMin = p.rssi;
        if (p.rssi > currentMax) currentMax = p.rssi;
        hasData = true;
      });
    });

    if (hasData) {
      this.minY = Math.min(-130, currentMin - 5);
      this.maxY = Math.max(-30, currentMax + 5);
      if (this.maxY - this.minY < 20) {
        const mid = (this.maxY + this.minY) / 2;
        this.minY = mid - 10;
        this.maxY = mid + 10;
      }
    } else {
      this.minY = -130;
      this.maxY = -30;
    }
  }

  valToY(val, scaleH, paddingTop = 18) {
    const range = this.maxY - this.minY;
    if (range === 0) return paddingTop + scaleH / 2;
    const ratio = (val - this.minY) / range;
    return paddingTop + (scaleH - (ratio * scaleH));
  }

  updateExternalHtmlLegend() {
    const legendBar = document.getElementById('graphLegendBar');
    if (!legendBar) return;

    let html = '';
    let colorIdx = 0;

    this.seriesMap.forEach((series, id) => {
      if (!this.shouldShowSeries(id)) {
        colorIdx++;
        return;
      }

      const color = this.colors[colorIdx % this.colors.length];
      const rawName = this.displayNameMap.get(id) || id;
      const shortId = (id.length > 6 ? id.substring(0, 6) : id).toUpperCase();

      // Clean any pre-existing trailing (HEXID) brackets from rawName to prevent duplicate "(5E14) (5E14)"
      const cleanName = (rawName || "").replace(/\s*\([0-9A-Fa-f]{4,12}\)$/gi, '').trim();

      const isCustomName = cleanName &&
        cleanName.toUpperCase() !== id.toUpperCase() &&
        cleanName.toUpperCase() !== shortId;

      const name = isCustomName ? `${cleanName} (${shortId})` : shortId;

      const lastPoint = series.length > 0 ? series[series.length - 1] : null;
      const lastRssi = lastPoint ? Math.round(lastPoint.rssi) : '--';

      const isFocused = this.focusSeriesId === id;

      html += `
        <div class="legend-pill ${isFocused ? 'active-focused' : ''}" onclick="signalGraphRenderer.toggleSeriesFocus('${id}')" title="Click to highlight ${name}">
          <span class="legend-pill-dot" style="background-color: ${color};"></span>
          <span class="legend-pill-name" style="color: #FFF;">${name}</span>
          <span class="legend-pill-rssi" style="color: #AAA; font-family: monospace;">${lastRssi}dBm</span>
        </div>
      `;

      colorIdx++;
    });

    if (!html) {
      legendBar.innerHTML = `<div style="color: #777; font-size: 0.75rem; text-align: center; width: 100%; padding: 2px 0;">No active signal series</div>`;
    } else {
      legendBar.innerHTML = html;
    }
  }

  toggleSeriesFocus(id) {
    if (this.focusSeriesId === id) {
      this.focusSeriesId = null;
    } else {
      this.focusSeriesId = id;
    }
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const cssW = this.cssW || 300;
    const cssH = this.cssH || 250;
    const dpr = this.dpr || window.devicePixelRatio || 1;

    if (cssW <= 0 || cssH <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, cssW, cssH);

    const paddingLeft = 75;
    const paddingTop = 18;
    const paddingBottom = 18;
    const scaleH = Math.max(10, cssH - paddingTop - paddingBottom);

    // 1. Draw Signal Quality Zones (Background) - Perfectly Symmetric Green/Yellow/Red
    const y70 = this.valToY(-70, scaleH, paddingTop);
    const y90 = this.valToY(-90, scaleH, paddingTop);

    ctx.fillStyle = "rgba(76, 175, 80, 0.1)"; // Green (> -70 dBm)
    ctx.fillRect(0, 0, cssW, y70);

    ctx.fillStyle = "rgba(255, 235, 59, 0.1)"; // Yellow (-70 to -90 dBm)
    ctx.fillRect(0, y70, cssW, Math.max(0, y90 - y70));

    ctx.fillStyle = "rgba(244, 67, 54, 0.1)"; // Red (< -90 dBm) - Fills seamlessly to bottom
    ctx.fillRect(0, y90, cssW, Math.max(0, cssH - y90));

    // 2. Grid lines & Left-aligned dBm Signal Values
    ctx.strokeStyle = "rgba(180, 180, 180, 0.12)";
    ctx.fillStyle = "rgba(220, 220, 220, 0.85)";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;

    const levels = [-30, -40, -50, -60, -70, -80, -90, -100, -110, -120, -130];
    levels.forEach(rssi => {
      const y = this.valToY(rssi, scaleH, paddingTop);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();

      ctx.fillText(`${rssi} dBm`, 10, y);
    });

    // Vertical Stationary Axis Line
    ctx.strokeStyle = "rgba(180, 180, 180, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, 0);
    ctx.lineTo(paddingLeft, cssH);
    ctx.stroke();

    // 3. Smooth Cubic Curves per Series (or single dot if only 1 point)
    let colorIdx = 0;
    this.seriesMap.forEach((series, id) => {
      if (!this.shouldShowSeries(id) || series.length < 1) {
        colorIdx++;
        return;
      }

      const isFocused = !this.focusSeriesId || this.focusSeriesId === id;
      const color = this.colors[colorIdx % this.colors.length];

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = isFocused ? (this.focusSeriesId === id ? 3.5 : 2.5) : 1.0;
      ctx.globalAlpha = isFocused ? 1.0 : 0.20;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (series.length === 1) {
        // Single point: draw a crisp signal dot at (x, y) so 1st packet is immediately visible on canvas!
        const pt = series[0];
        const x = paddingLeft + 20;
        const y = this.valToY(pt.rssi, scaleH, paddingTop);

        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // 2 or more points: draw smooth cubic bezier curve line
        const pointSpacing = Math.max(15, (cssW - paddingLeft - 20) / Math.max(1, series.length - 1));

        ctx.beginPath();
        series.forEach((pt, i) => {
          const x = paddingLeft + (i * pointSpacing);
          const y = this.valToY(pt.rssi, scaleH, paddingTop);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = paddingLeft + ((i - 1) * pointSpacing);
            const prevY = this.valToY(series[i - 1].rssi, scaleH, paddingTop);
            const xc = (prevX + x) / 2;
            ctx.bezierCurveTo(xc, prevY, xc, y, x, y);
          }
        });
        ctx.stroke();
      }
      ctx.restore();

      colorIdx++;
    });

    // 4. Time labels along bottom X axis
    ctx.fillStyle = "rgba(160, 160, 160, 0.8)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const longestSeries = Array.from(this.seriesMap.values()).sort((a, b) => b.length - a.length)[0];
    if (longestSeries && longestSeries.length > 0) {
      const firstTime = new Date(longestSeries[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lastTime = new Date(longestSeries[longestSeries.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(firstTime, paddingLeft + 20, cssH - 6);
      ctx.fillText(lastTime, cssW - 40, cssH - 6);
    }

    ctx.restore();

    // 5. Update external HTML Legend Bar
    this.updateExternalHtmlLegend();
  }
}

class SignalDistanceGraphRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.points = []; // [{ distMeters, snr }]
    this.currentMaxDist = 5000; // 5km default
    this.minSnr = -20;
    this.maxSnr = 20;
    this.dpr = window.devicePixelRatio || 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const cssW = Math.floor(rect.width) || 600;
    const cssH = 240; // Fixed crisp 240px height matching Android 240dp

    const dpr = Math.max(2, window.devicePixelRatio || 2); // High-DPI Crispness
    const bufW = Math.floor(cssW * dpr);
    const bufH = Math.floor(cssH * dpr);

    this.dpr = dpr;
    this.cssW = cssW;
    this.cssH = cssH;

    if (this.canvas.width !== bufW || this.canvas.height !== bufH) {
      this.canvas.width = bufW;
      this.canvas.height = bufH;
      this.canvas.style.width = "100%";
      this.canvas.style.height = cssH + "px";
    }
    this.draw();
  }

  setData(newData) {
    this.points = newData || [];
    const maxInPoints = this.points.reduce((m, p) => Math.max(m, p.distMeters || 0), 0);
    if (maxInPoints > 4500) {
      this.currentMaxDist = (Math.floor(maxInPoints / 5000) + 1) * 5000;
    } else {
      this.currentMaxDist = 5000;
    }
    this.draw();
  }

  getSnrColor(snr) {
    if (snr >= 10) return '#00E676';
    if (snr >= 5)  return '#4CAF50';
    if (snr >= 0)  return '#8BC34A';
    if (snr >= -4) return '#CDDC39';
    if (snr >= -8) return '#FFEB3B';
    if (snr >= -12) return '#FFC107';
    if (snr >= -16) return '#FF9800';
    if (snr >= -20) return '#FF5722';
    return '#F44336';
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const dpr = this.dpr || window.devicePixelRatio || 1;
    const w = this.cssW || (this.canvas.width / dpr);
    const h = this.cssH || (this.canvas.height / dpr);
    if (w <= 0 || h <= 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const paddingLeft = 55;
    const paddingBottom = 35;
    const paddingTop = 25;
    const paddingRight = 25;

    const graphWidth = w - paddingLeft - paddingRight;
    const graphHeight = h - paddingTop - paddingBottom;

    // Grid & Axis Labels
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "10px monospace";
    ctx.lineWidth = 1;

    // Horizontal Grid (SNR: -20, -10, 0, 10, 20)
    const snrSteps = 4;
    for (let i = 0; i <= snrSteps; i++) {
      const ratio = i / snrSteps;
      const y = (h - paddingBottom) - (ratio * graphHeight);
      const snrVal = this.minSnr + (i * 10);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      ctx.fillText(`${snrVal}dB`, 10, y + 4);
    }

    // Vertical Grid (Distance)
    const distSteps = 5;
    for (let i = 0; i <= distSteps; i++) {
      const ratio = i / distSteps;
      const x = paddingLeft + (ratio * graphWidth);
      const distKm = (this.currentMaxDist / 1000.0) * ratio;

      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();

      ctx.fillText(`${distKm.toFixed(1)}km`, x - 12, h - 10);
    }

    // Axes Lines
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(w - paddingRight, h - paddingBottom);
    ctx.stroke();

    // Axis Titles
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SNR (dB)", 10, 15);
    ctx.fillText("Distance (km)", w - 90, h - 10);

    // Draw Scatter Points (finer 3.5px dots with subtle dark border)
    this.points.forEach(p => {
      const dist = Math.min(this.currentMaxDist, Math.max(0, p.distMeters));
      const snr = Math.min(this.maxSnr, Math.max(this.minSnr, p.snr));

      const x = paddingLeft + ((dist / this.currentMaxDist) * graphWidth);
      const y = (h - paddingBottom) - (((snr - this.minSnr) / (this.maxSnr - this.minSnr)) * graphHeight);

      ctx.fillStyle = this.getSnrColor(p.snr);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}

window.SignalGraphRenderer = SignalGraphRenderer;
window.SignalDistanceGraphRenderer = SignalDistanceGraphRenderer;
