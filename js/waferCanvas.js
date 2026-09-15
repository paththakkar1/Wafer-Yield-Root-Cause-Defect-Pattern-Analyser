/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * High-Performance Interactive 300mm Silicon Wafer Canvas Renderer
 */

import { FAB_CONSTANTS } from './sampleData.js';

export class WaferCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.dies = [];
    this.options = Object.assign({
      mode: 'bins', // 'bins', 'density', 'leakage', 'vth'
      showGrid: true,
      showExclusionZone: true,
      showPatternOverlay: true,
      onDieHover: null,
      onDieClick: null
    }, options);

    // Viewport transform
    this.scale = 1.0;
    this.minScale = 0.5;
    this.maxScale = 6.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredDie = null;
    this.selectedDie = null;

    this.activePatternType = 'edge-ring';

    this._initEvents();
    this.resize();
  }

  setDies(dies, patternType = 'edge-ring') {
    this.dies = dies;
    this.activePatternType = patternType;
    this.hoveredDie = null;
    this.render();
  }

  setMode(mode) {
    this.options.mode = mode;
    this.render();
  }

  toggleOption(key) {
    if (this.options.hasOwnProperty(key)) {
      this.options[key] = !this.options[key];
      this.render();
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height > 0 ? rect.height : 600);
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.ctx.scale(dpr, dpr);
    this.width = size;
    this.height = size;
    
    this.resetView();
  }

  resetView() {
    this.scale = (this.width * 0.88) / FAB_CONSTANTS.WAFER_DIAMETER_MM;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
    this.render();
  }

  zoom(factor) {
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.scale = newScale;
    this.render();
  }

  _initEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      c.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        c.style.cursor = 'crosshair';
      }
    });

    c.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
        this.render();
        return;
      }

      // Handle die hover
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - this.panX) / this.scale;
      const worldY = (mouseY - this.panY) / this.scale;

      const found = this._findDieAt(worldX, worldY);
      if (found !== this.hoveredDie) {
        this.hoveredDie = found;
        this.render();
        if (this.options.onDieHover) {
          this.options.onDieHover(found, e);
        }
      }
    });

    c.addEventListener('mouseleave', () => {
      this.hoveredDie = null;
      this.render();
      if (this.options.onDieHover) {
        this.options.onDieHover(null);
      }
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldScale = this.scale;
      const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * zoomFactor));

      // Zoom toward cursor
      this.panX = mouseX - (mouseX - this.panX) * (newScale / oldScale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / oldScale);
      this.scale = newScale;

      this.render();
    }, { passive: false });

    c.addEventListener('click', (e) => {
      if (this.hoveredDie) {
        this.selectedDie = this.hoveredDie;
        if (this.options.onDieClick) {
          this.options.onDieClick(this.hoveredDie);
        }
        this.render();
      }
    });
  }

  _findDieAt(xMm, yMm) {
    const halfW = FAB_CONSTANTS.DIE_SIZE_X_MM / 2;
    const halfH = FAB_CONSTANTS.DIE_SIZE_Y_MM / 2;
    for (const die of this.dies) {
      if (
        xMm >= die.x - halfW &&
        xMm <= die.x + halfW &&
        yMm >= die.y - halfH &&
        yMm <= die.y + halfH
      ) {
        return die;
      }
    }
    return null;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Apply pan and zoom
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // 1. Draw Wafer Substrate
    this._drawWaferSubstrate(ctx);

    // 2. Draw Dies
    this._drawDies(ctx);

    // 3. Draw Exclusion Zone & Notch
    this._drawOverlays(ctx);

    // 4. Draw Pattern Overlay if active
    if (this.options.showPatternOverlay) {
      this._drawPatternVisuals(ctx);
    }

    // 5. Highlight Hovered / Selected Die
    if (this.hoveredDie) {
      this._drawDieHighlight(ctx, this.hoveredDie, '#00f0ff', 2.0);
    }
    if (this.selectedDie && this.selectedDie !== this.hoveredDie) {
      this._drawDieHighlight(ctx, this.selectedDie, '#facc15', 2.5);
    }

    ctx.restore();
  }

  _drawWaferSubstrate(ctx) {
    const radius = FAB_CONSTANTS.WAFER_DIAMETER_MM / 2;

    // Silicon Substrate Disc with Subtle Specular Sheen
    const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 10, 0, 0, radius);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.7, '#0f172a');
    grad.addColorStop(1, '#090d16');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Wafer Outer Bevel Ring
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Wafer SEMI Orientation Notch (standard 300mm notch at theta = 90 deg / bottom)
    const notchR = radius;
    const notchDepth = 1.2; // mm
    const notchHalfAngle = 0.025; // radians
    ctx.beginPath();
    ctx.arc(0, 0, notchR, Math.PI / 2 - notchHalfAngle, Math.PI / 2 + notchHalfAngle);
    ctx.lineTo(0, notchR - notchDepth);
    ctx.closePath();
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 3mm Edge Exclusion Ring
    if (this.options.showExclusionZone) {
      ctx.beginPath();
      ctx.arc(0, 0, radius - FAB_CONSTANTS.EDGE_EXCLUSION_MM, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#ef444466';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawDies(ctx) {
    const w = FAB_CONSTANTS.DIE_SIZE_X_MM;
    const h = FAB_CONSTANTS.DIE_SIZE_Y_MM;
    const halfW = w / 2;
    const halfH = h / 2;
    const gap = 0.15; // scribe line gap

    for (const die of this.dies) {
      ctx.fillStyle = this._getDieColor(die);
      ctx.fillRect(die.x - halfW + gap, die.y - halfH + gap, w - gap * 2, h - gap * 2);

      if (this.options.showGrid && this.scale > 1.8) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.15;
        ctx.strokeRect(die.x - halfW + gap, die.y - halfH + gap, w - gap * 2, h - gap * 2);
      }
    }
  }

  _getDieColor(die) {
    if (this.options.mode === 'density') {
      if (die.status === 'defective') return '#ef4444';
      if (die.status === 'marginal') return '#f59e0b';
      return '#10b98122';
    }

    if (this.options.mode === 'leakage') {
      const leak = parseFloat(die.testValues.leakage);
      if (leak > 15.0) return '#dc2626'; // High leakage
      if (leak > 5.0) return '#f97316';
      if (leak > 0.5) return '#eab308';
      return '#059669';
    }

    if (this.options.mode === 'vth') {
      const vth = parseFloat(die.testValues.vth);
      if (vth > 0.38) return '#ec4899'; // Positive shift
      if (vth < 0.25) return '#6366f1'; // Negative shift
      return '#10b981';
    }

    // Default 'bins' mode
    if (die.status === 'defective') {
      if (die.bin === 7) return '#ef4444'; // Edge leakage
      if (die.bin === 9) return '#dc2626'; // Gate short
      if (die.bin === 4) return '#f43f5e'; // Metal scratch
      if (die.bin === 3) return '#e11d48'; // Thermal void
      return '#b91c1c';
    }
    if (die.status === 'marginal') return '#f59e0b'; // Amber
    return '#10b981'; // Emerald Pass
  }

  _drawOverlays(ctx) {
    // Crosshair axes (subtle wafer center alignment)
    ctx.lineWidth = 0.4;
    ctx.strokeStyle = '#33415544';
    ctx.beginPath();
    ctx.moveTo(-150, 0);
    ctx.lineTo(150, 0);
    ctx.moveTo(0, -150);
    ctx.lineTo(0, 150);
    ctx.stroke();
  }

  _drawPatternVisuals(ctx) {
    const R = FAB_CONSTANTS.WAFER_DIAMETER_MM / 2;

    if (this.activePatternType === 'edge-ring') {
      // Draw highlighted peripheral boundary
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#ef4444aa';
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill subtle annular glow
      ctx.beginPath();
      ctx.arc(0, 0, R - FAB_CONSTANTS.EDGE_EXCLUSION_MM, 0, Math.PI * 2);
      ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2, true);
      ctx.fillStyle = '#ef444415';
      ctx.fill();
    } else if (this.activePatternType === 'scratch') {
      // Draw fitted scratch trajectory
      ctx.beginPath();
      for (let x = -75; x <= 85; x += 3) {
        const y = 0.004 * (x + 20) * (x + 20) - 45;
        if (x === -75) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 4.0;
      ctx.strokeStyle = '#f43f5e55';
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fb7185';
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (this.activePatternType === 'center-cluster') {
      // Draw center cluster boundary
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#e11d48cc';
      ctx.stroke();
      ctx.fillStyle = '#e11d4818';
      ctx.fill();
      ctx.setLineDash([]);
    } else if (this.activePatternType === 'donut') {
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.70, 0, Math.PI * 2);
      ctx.arc(0, 0, R * 0.45, 0, Math.PI * 2, true);
      ctx.fillStyle = '#f59e0b15';
      ctx.fill();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = '#f59e0b88';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawDieHighlight(ctx, die, strokeColor, lineWidth) {
    const w = FAB_CONSTANTS.DIE_SIZE_X_MM;
    const h = FAB_CONSTANTS.DIE_SIZE_Y_MM;
    const halfW = w / 2;
    const halfH = h / 2;

    ctx.save();
    ctx.lineWidth = lineWidth / this.scale;
    ctx.strokeStyle = strokeColor;
    ctx.strokeRect(die.x - halfW, die.y - halfH, w, h);

    // Glowing corner brackets
    ctx.fillStyle = strokeColor;
    const s = 1.0;
    ctx.fillRect(die.x - halfW, die.y - halfH, s, s);
    ctx.fillRect(die.x + halfW - s, die.y - halfH, s, s);
    ctx.fillRect(die.x - halfW, die.y + halfH - s, s, s);
    ctx.fillRect(die.x + halfW - s, die.y + halfH - s, s, s);
    ctx.restore();
  }
}
