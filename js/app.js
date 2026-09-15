/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * Main Application Coordinator
 */

import { SAMPLE_LOTS, PRESCRIPTIVE_ACTIONS, FAB_CONSTANTS, generateWaferGrid } from './sampleData.js';
import { WaferCanvas } from './waferCanvas.js';
import { WaferPatternDetector } from './patternDetector.js';
import { RootCauseEngine } from './rootCauseEngine.js';
import { PredictiveBatchGuard } from './predictiveBatchGuard.js';
import { ReportGenerator } from './reportGenerator.js';

class WaferApp {
  constructor() {
    this.currentLot = SAMPLE_LOTS[0];
    this.currentDies = [];
    this.patternAnalysis = null;
    this.waferCanvas = null;
    this.rootCauseEngine = new RootCauseEngine();
    this.batchGuard = new PredictiveBatchGuard();

    this.init();
  }

  init() {
    this._initDomRefs();
    this._initWaferCanvas();
    this._initEventListeners();
    this._loadLot(this.currentLot);
    this._initBatchGuardView();
  }

  _initDomRefs() {
    this.dom = {
      // Top Ticker / Header
      nodeSelector: document.getElementById('node-selector'),
      lotSelector: document.getElementById('lot-selector'),
      headerLossTicker: document.getElementById('header-loss-ticker'),
      criticalBanner: document.getElementById('critical-banner'),
      criticalBannerText: document.getElementById('critical-banner-text'),
      
      // Main KPI Badges
      kpiYield: document.getElementById('kpi-yield'),
      kpiYieldDelta: document.getElementById('kpi-yield-delta'),
      kpiDefectDensity: document.getElementById('kpi-defect-density'),
      kpiAtRiskLots: document.getElementById('kpi-at-risk-lots'),
      kpiMttr: document.getElementById('kpi-mttr'),

      // Canvas & Tooltip
      canvas: document.getElementById('wafer-canvas'),
      tooltip: document.getElementById('die-tooltip'),
      canvasModeSelect: document.getElementById('canvas-mode-select'),
      btnZoomIn: document.getElementById('btn-zoom-in'),
      btnZoomOut: document.getElementById('btn-zoom-out'),
      btnZoomReset: document.getElementById('btn-zoom-reset'),
      toggleOverlay: document.getElementById('toggle-pattern-overlay'),

      // Die Inspector Card
      inspectorCoords: document.getElementById('inspector-coords'),
      inspectorBin: document.getElementById('inspector-bin'),
      inspectorStatus: document.getElementById('inspector-status'),
      inspectorLeakage: document.getElementById('inspector-leakage'),
      inspectorVth: document.getElementById('inspector-vth'),
      inspectorDefectType: document.getElementById('inspector-defect-type'),
      btnOpenSem: document.getElementById('btn-open-sem'),

      // Pattern Studio
      patternTitle: document.getElementById('pattern-title'),
      patternConfidence: document.getElementById('pattern-confidence'),
      patternDesc: document.getElementById('pattern-desc'),
      patternRankList: document.getElementById('pattern-rank-list'),
      moransIVal: document.getElementById('morans-i-val'),
      edgeConcVal: document.getElementById('edge-conc-val'),
      centerConcVal: document.getElementById('center-conc-val'),

      // RCA Engine
      rcaRankList: document.getElementById('rca-rank-list'),
      telemetryCanvas: document.getElementById('telemetry-chart'),
      selectedRcTitle: document.getElementById('selected-rc-title'),
      selectedRcTool: document.getElementById('selected-rc-tool'),
      selectedRcStep: document.getElementById('selected-rc-step'),
      selectedRcMechanism: document.getElementById('selected-rc-mechanism'),
      selectedRcSensor: document.getElementById('selected-rc-sensor'),
      selectedRcDrift: document.getElementById('selected-rc-drift'),

      // Prescriptive Actions
      prescriptiveList: document.getElementById('prescriptive-actions-list'),
      quarantineToggleBtn: document.getElementById('btn-quick-quarantine'),

      // Batch Risk Guard
      batchQueueList: document.getElementById('batch-queue-list'),
      batchSimulatorContainer: document.getElementById('batch-simulator-container'),

      // Tabs
      tabButtons: document.querySelectorAll('.tab-btn'),
      tabPanels: document.querySelectorAll('.tab-panel'),

      // Export & Modals
      btnExportReport: document.getElementById('btn-export-report'),
      semModal: document.getElementById('sem-modal'),
      semModalClose: document.getElementById('sem-modal-close'),
      semModalContent: document.getElementById('sem-modal-content'),

      // CSV Uploader
      fileInput: document.getElementById('csv-file-input'),
      btnUploadData: document.getElementById('btn-upload-data')
    };
  }

  _initWaferCanvas() {
    this.waferCanvas = new WaferCanvas(this.dom.canvas, {
      onDieHover: (die, e) => this._handleDieHover(die, e),
      onDieClick: (die) => this._handleDieClick(die)
    });

    window.addEventListener('resize', () => {
      this.waferCanvas.resize();
    });
  }

  _initEventListeners() {
    // Lot Selector
    this.dom.lotSelector.addEventListener('change', (e) => {
      const lotId = e.target.value;
      const lot = SAMPLE_LOTS.find(l => l.lotId === lotId);
      if (lot) {
        this._loadLot(lot);
      }
    });

    // Node Selector
    this.dom.nodeSelector.addEventListener('change', (e) => {
      const nodeVal = e.target.value;
      if (nodeVal.includes('3nm')) {
        const lot3 = SAMPLE_LOTS.find(l => l.node.includes('3nm'));
        if (lot3) this._loadLot(lot3);
      } else {
        const lot5 = SAMPLE_LOTS.find(l => l.node.includes('5nm'));
        if (lot5) this._loadLot(lot5);
      }
    });

    // Canvas Mode (Bins, Density, Leakage, Vth)
    this.dom.canvasModeSelect.addEventListener('change', (e) => {
      this.waferCanvas.setMode(e.target.value);
    });

    // Zoom buttons
    this.dom.btnZoomIn.addEventListener('click', () => this.waferCanvas.zoom(1.25));
    this.dom.btnZoomOut.addEventListener('click', () => this.waferCanvas.zoom(0.8));
    this.dom.btnZoomReset.addEventListener('click', () => this.waferCanvas.resetView());

    // Pattern Overlay Toggle
    this.dom.toggleOverlay.addEventListener('click', () => {
      this.waferCanvas.toggleOption('showPatternOverlay');
      this.dom.toggleOverlay.classList.toggle('text-cyan-400');
    });

    // Tab Navigation
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this._switchTab(targetTab);
      });
    });

    // SEM Modal Close
    this.dom.semModalClose.addEventListener('click', () => {
      this.dom.semModal.classList.add('hidden');
    });
    this.dom.semModal.addEventListener('click', (e) => {
      if (e.target === this.dom.semModal) {
        this.dom.semModal.classList.add('hidden');
      }
    });

    // Open SEM on current selected die
    this.dom.btnOpenSem.addEventListener('click', () => {
      const die = this.waferCanvas.selectedDie || this.currentDies.find(d => d.status === 'defective');
      if (die) this._openSemModal(die);
    });

    // Export Report Button
    this.dom.btnExportReport.addEventListener('click', () => {
      const rootCauses = this.rootCauseEngine.getRootCausesForLot(this.currentLot.lotId);
      const actions = PRESCRIPTIVE_ACTIONS.filter(a => a.lotId === this.currentLot.lotId);
      ReportGenerator.generate8DReport(this.currentLot, this.patternAnalysis, rootCauses, actions);
    });

    // File Upload Trigger
    this.dom.btnUploadData.addEventListener('click', () => {
      this.dom.fileInput.click();
    });

    this.dom.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._handleFileUpload(file);
    });

    // Quick Quarantine Button in Banner
    if (this.dom.quarantineToggleBtn) {
      this.dom.quarantineToggleBtn.addEventListener('click', () => {
        alert('SECS-GEM Interlock Executed: Tool Chamber TEL-VIM-ETCH-04 placed on MAINTENANCE_HOLD. Lot transfer halted.');
        this.dom.quarantineToggleBtn.textContent = '✓ CHAMBER QUARANTINED (HOLD ACTIVE)';
        this.dom.quarantineToggleBtn.classList.remove('bg-rose-500', 'hover:bg-rose-600');
        this.dom.quarantineToggleBtn.classList.add('bg-slate-700', 'text-slate-300');
      });
    }
  }

  _switchTab(tabId) {
    this.dom.tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
        btn.classList.add('text-slate-400');
      }
    });

    this.dom.tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  _loadLot(lot) {
    this.currentLot = lot;
    this.dom.lotSelector.value = lot.lotId;
    if (this.dom.nodeSelector) {
      this.dom.nodeSelector.value = lot.node.includes('3nm') ? '3nm-gaa' : '5nm-euv';
    }

    // Generate dies for this pattern
    this.currentDies = generateWaferGrid(lot.patternType, 42);
    
    // Update Canvas
    this.waferCanvas.setDies(this.currentDies, lot.patternType);

    // Run Pattern Detection Engine
    this.patternAnalysis = WaferPatternDetector.analyzePatterns(this.currentDies);

    // Update Header & Top Banner
    this._updateTopBanner(lot);

    // Update KPI Tiles
    this._updateKpis(lot);

    // Update Pattern Studio
    this._updatePatternStudio();

    // Update RCA Section
    this._updateRcaSection();

    // Update Prescriptive Actions
    this._updatePrescriptiveActions();

    // Reset Inspector with first defective die
    const sampleDie = this.currentDies.find(d => d.status === 'defective') || this.currentDies[0];
    this._updateInspector(sampleDie);
  }

  _updateTopBanner(lot) {
    const isCritical = lot.severity.includes('Critical');
    this.dom.criticalBanner.className = `p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 mb-6 transition-all ${
      isCritical 
        ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-lg shadow-rose-950/40' 
        : (lot.severity.includes('High') 
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-200' 
            : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200')
    }`;

    this.dom.criticalBannerText.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
          isCritical ? 'bg-rose-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-200'
        }">
          ${lot.severity}
        </span>
        <span class="font-bold text-sm text-slate-100">${lot.lotId} (${lot.node})</span>
        <span class="text-xs text-slate-300">• ${lot.patternName} detected • ${lot.financialImpactMonthly}</span>
      </div>
    `;

    this.dom.headerLossTicker.textContent = lot.financialImpactMonthly;
  }

  _updateKpis(lot) {
    this.dom.kpiYield.textContent = `${lot.yieldPercentage}%`;
    this.dom.kpiYieldDelta.textContent = `${lot.yieldDelta > 0 ? '+' : ''}${lot.yieldDelta}% vs Target`;
    this.dom.kpiYieldDelta.className = `text-xs font-mono font-bold ${lot.yieldDelta < 0 ? 'text-rose-400' : 'text-emerald-400'}`;
    this.dom.kpiDefectDensity.textContent = lot.defectDensity;
    this.dom.kpiAtRiskLots.textContent = lot.severity.includes('Normal') ? '0' : '3 Queued';
  }

  _updatePatternStudio() {
    const res = this.patternAnalysis;
    this.dom.patternTitle.textContent = res.primaryPattern;
    this.dom.patternConfidence.textContent = `${res.confidence}% CONFIDENCE`;
    this.dom.patternDesc.textContent = res.description;

    this.dom.moransIVal.textContent = res.signatures.spatialMoransI;
    this.dom.edgeConcVal.textContent = `${(res.signatures.edgeConcentration * 100).toFixed(1)}%`;
    this.dom.centerConcVal.textContent = `${(res.signatures.centerConcentration * 100).toFixed(1)}%`;

    // Render ranked candidate patterns
    this.dom.patternRankList.innerHTML = res.rankedPatterns.map(p => `
      <div class="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800 text-xs">
        <span class="text-slate-300 font-medium">${p.pattern}</span>
        <div class="flex items-center gap-2">
          <div class="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div class="h-full bg-cyan-400 rounded-full" style="width: ${p.probability}%"></div>
          </div>
          <span class="font-mono text-cyan-400 font-bold w-9 text-right">${p.probability}%</span>
        </div>
      </div>
    `).join('');
  }

  _updateRcaSection() {
    this.rootCauseEngine.renderRankingList(
      this.currentLot.lotId,
      this.dom.rcaRankList,
      (selectedCause) => {
        this._displaySelectedRootCause(selectedCause);
      }
    );
  }

  _displaySelectedRootCause(cause) {
    if (!cause) return;
    this.dom.selectedRcTitle.textContent = cause.title;
    this.dom.selectedRcTool.textContent = cause.toolId;
    this.dom.selectedRcStep.textContent = cause.processStep;
    this.dom.selectedRcMechanism.textContent = cause.mechanism;
    this.dom.selectedRcSensor.textContent = cause.sensorName;
    this.dom.selectedRcDrift.textContent = cause.driftDelta;

    // Render Telemetry
    this.rootCauseEngine.renderTelemetryChart(this.dom.telemetryCanvas, cause);
  }

  _updatePrescriptiveActions() {
    const actions = PRESCRIPTIVE_ACTIONS.filter(a => a.lotId === this.currentLot.lotId);
    this.dom.prescriptiveList.innerHTML = '';

    if (actions.length === 0) {
      this.dom.prescriptiveList.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs font-mono">
          No active corrective interventions required for this lot.
        </div>
      `;
      return;
    }

    actions.forEach(action => {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all';
      card.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="px-2 py-0.5 text-xs font-mono font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ${action.priority}
          </span>
          <span class="text-xs font-mono text-slate-400">Target: <b class="text-slate-200">${action.targetEquipment}</b></span>
        </div>

        <h4 class="text-sm font-bold text-slate-100 mt-2">${action.title}</h4>

        <div class="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 font-mono">
          <div>
            <span class="text-[10px] text-slate-500 uppercase block">Est. Downtime</span>
            <span class="text-slate-200 font-bold">${action.estDowntimeHours} Hours</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase block">Yield Recovery</span>
            <span class="text-emerald-400 font-bold">+${action.estYieldRecoveryPct}%</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase block">Value Saved</span>
            <span class="text-cyan-400 font-bold">${action.costImpactSavingsMonthly}</span>
          </div>
        </div>

        <div class="mt-3">
          <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Standard Operating Procedure (SOP):</span>
          <ul class="space-y-1 text-xs text-slate-300">
            ${action.actionSteps.map(step => `<li class="flex items-start gap-1.5"><span class="text-cyan-400">▪</span> ${step}</li>`).join('')}
          </ul>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div class="text-[11px] font-mono text-slate-400 truncate">
            SECS-GEM: <code class="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">${action.secsGemCommand}</code>
          </div>
          <button class="btn-dispatch-action px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono whitespace-nowrap shadow-md shadow-cyan-950/50">
            DISPATCH TO MES ➔
          </button>
        </div>
      `;

      const dispatchBtn = card.querySelector('.btn-dispatch-action');
      dispatchBtn.addEventListener('click', () => {
        dispatchBtn.textContent = '✓ DISPATCHED TO MES';
        dispatchBtn.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-slate-100 font-bold text-xs font-mono whitespace-nowrap';
        alert(`SECS-GEM Command Sent to Tool Controller: ${action.secsGemCommand}\nWork order generated in MES.`);
      });

      this.dom.prescriptiveList.appendChild(card);
    });
  }

  _initBatchGuardView() {
    const updateBatchView = () => {
      this.batchGuard.renderBatchQueue(this.dom.batchQueueList, (batch) => {
        this.batchGuard.renderSimulator(this.dom.batchSimulatorContainer, batch, updateBatchView);
      });
    };

    updateBatchView();
    // Default render first batch
    const firstBatch = this.batchGuard.getBatches()[0];
    this.batchGuard.renderSimulator(this.dom.batchSimulatorContainer, firstBatch, updateBatchView);
  }

  _handleDieHover(die, event) {
    if (!die) {
      this.dom.tooltip.style.opacity = '0';
      return;
    }

    this.dom.tooltip.style.opacity = '1';
    this.dom.tooltip.style.left = `${event.clientX + 14}px`;
    this.dom.tooltip.style.top = `${event.clientY + 14}px`;

    this.dom.tooltip.innerHTML = `
      <div class="font-mono font-bold text-cyan-400">Die #${die.id} [${die.gx}, ${die.gy}]</div>
      <div class="text-[10px] text-slate-400 font-mono mt-0.5">Physical Pos: (${die.x.toFixed(1)}, ${die.y.toFixed(1)}) mm</div>
      <div class="flex items-center gap-1.5 mt-1">
        <span class="inline-block w-2 h-2 rounded-full ${die.status === 'defective' ? 'bg-rose-500' : (die.status === 'marginal' ? 'bg-amber-500' : 'bg-emerald-500')}"></span>
        <span class="font-semibold text-slate-200">${die.binName} (Bin ${die.bin})</span>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-1 text-[10px] font-mono text-slate-300">
        <div>Vth: <b>${die.testValues.vth} V</b></div>
        <div>Leak: <b>${die.testValues.leakage} nA</b></div>
      </div>
      ${die.status === 'defective' ? `<div class="text-[10px] text-rose-400 font-semibold mt-1">Defect: ${die.defectType}</div>` : ''}
    `;

    this._updateInspector(die);
  }

  _handleDieClick(die) {
    this._updateInspector(die);
    if (die.status === 'defective') {
      this._openSemModal(die);
    }
  }

  _updateInspector(die) {
    if (!die) return;
    this.dom.inspectorCoords.textContent = `[${die.gx}, ${die.gy}] (${die.x.toFixed(1)}mm, ${die.y.toFixed(1)}mm)`;
    this.dom.inspectorBin.textContent = `Bin ${die.bin} - ${die.binName}`;
    this.dom.inspectorStatus.textContent = die.status.toUpperCase();
    this.dom.inspectorStatus.className = `font-bold font-mono ${
      die.status === 'defective' ? 'text-rose-400' : (die.status === 'marginal' ? 'text-amber-400' : 'text-emerald-400')
    }`;
    this.dom.inspectorLeakage.textContent = `${die.testValues.leakage} nA`;
    this.dom.inspectorVth.textContent = `${die.testValues.vth} V`;
    this.dom.inspectorDefectType.textContent = die.defectType;
  }

  _openSemModal(die) {
    const sem = die.semImage || {
      title: 'SEM Review: Surface Particle Contaminant',
      magnification: '80,000x',
      voltage: '1.5 kV',
      defectCode: 'DEF-GEN-001',
      description: 'Foreign particulate obstruction causing dielectric bridge.',
      svgType: 'particle'
    };

    this.dom.semModalContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div class="relative bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
          <!-- Synthetic High-Res SEM Simulated Canvas Image -->
          <div class="w-full aspect-square bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-800">
            ${this._generateSemSvg(sem.svgType)}
            <!-- SEM CRT Scanline Overlay -->
            <div class="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none"></div>
            <!-- SEM HUD scale bar -->
            <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-cyan-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              <span>MAG: ${sem.magnification}</span>
              <span>EHT: ${sem.voltage}</span>
              <span>100 nm ━┫</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ${sem.defectCode}
            </span>
            <span class="text-xs font-mono text-slate-400">Die #${die.id} [${die.gx}, ${die.gy}]</span>
          </div>

          <h3 class="text-lg font-bold text-slate-100 mt-2">${sem.title}</h3>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">${sem.description}</p>

          <div class="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs font-mono">
            <div class="flex justify-between"><span class="text-slate-500">Defect Class:</span> <span class="text-slate-200 font-bold">${die.defectClass}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Measured Leakage:</span> <span class="text-rose-400 font-bold">${die.testValues.leakage} nA</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Threshold Voltage:</span> <span class="text-slate-200 font-bold">${die.testValues.vth} V</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Substrate Coordinates:</span> <span class="text-cyan-400 font-bold">X=${die.x.toFixed(2)}mm, Y=${die.y.toFixed(2)}mm</span></div>
          </div>

          <div class="mt-5 flex items-center gap-3">
            <button onclick="alert('Defect added to Klarf Review Queue.');" class="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all">
              ADD TO KLARF REVIEW ➔
            </button>
          </div>
        </div>
      </div>
    `;

    this.dom.semModal.classList.remove('hidden');
  }

  _generateSemSvg(type) {
    if (type === 'edge_undercut') {
      return `
        <svg viewBox="0 0 200 200" class="w-full h-full">
          <defs>
            <filter id="sem-noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/><feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.15 0"/></filter>
          </defs>
          <rect width="200" height="200" fill="#1e293b"/>
          <rect width="200" height="200" filter="url(#sem-noise)"/>
          <!-- Silicon fins -->
          <line x1="20" y1="40" x2="20" y2="160" stroke="#475569" stroke-width="12"/>
          <line x1="50" y1="40" x2="50" y2="160" stroke="#475569" stroke-width="12"/>
          <line x1="80" y1="40" x2="80" y2="160" stroke="#475569" stroke-width="12"/>
          <line x1="110" y1="40" x2="110" y2="160" stroke="#475569" stroke-width="12"/>
          <!-- Broken/over-etched fin bridge -->
          <path d="M 110,90 Q 135,110 160,85" stroke="#f43f5e" stroke-width="8" fill="none" stroke-linecap="round"/>
          <circle cx="135" cy="100" r="14" fill="#f43f5e" opacity="0.4"/>
          <circle cx="135" cy="100" r="6" fill="#f87171"/>
          <!-- SEM Graticule Lines -->
          <line x1="0" y1="100" x2="200" y2="100" stroke="#38bdf822" stroke-width="1"/>
          <line x1="100" y1="0" x2="100" y2="200" stroke="#38bdf822" stroke-width="1"/>
        </svg>
      `;
    } else if (type === 'scratch_furrow') {
      return `
        <svg viewBox="0 0 200 200" class="w-full h-full">
          <rect width="200" height="200" fill="#182234"/>
          <!-- Parallel interconnect metal tracks -->
          <line x1="10" y1="30" x2="190" y2="30" stroke="#334155" stroke-width="8"/>
          <line x1="10" y1="65" x2="190" y2="65" stroke="#334155" stroke-width="8"/>
          <line x1="10" y1="100" x2="190" y2="100" stroke="#334155" stroke-width="8"/>
          <line x1="10" y1="135" x2="190" y2="135" stroke="#334155" stroke-width="8"/>
          <line x1="10" y1="170" x2="190" y2="170" stroke="#334155" stroke-width="8"/>
          <!-- Deep Gouged Scratch Furrow cutting tracks -->
          <path d="M 25,20 Q 90,110 175,185" stroke="#0f172a" stroke-width="16" fill="none" stroke-linecap="round"/>
          <path d="M 25,20 Q 90,110 175,185" stroke="#f43f5e" stroke-width="6" fill="none" stroke-linecap="round"/>
          <!-- Debris Particles around furrow -->
          <circle cx="75" cy="80" r="4" fill="#fbbf24"/>
          <circle cx="110" cy="125" r="5" fill="#fbbf24"/>
          <circle cx="130" cy="145" r="3" fill="#fbbf24"/>
        </svg>
      `;
    } else {
      return `
        <svg viewBox="0 0 200 200" class="w-full h-full">
          <rect width="200" height="200" fill="#1e293b"/>
          <circle cx="100" cy="100" r="38" fill="#0f172a" stroke="#f43f5e" stroke-width="4"/>
          <circle cx="95" cy="95" r="24" fill="#334155"/>
          <circle cx="102" cy="105" r="12" fill="#ef4444"/>
          <circle cx="85" cy="85" r="6" fill="#fca5a5"/>
        </svg>
      `;
    }
  }

  _handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        alert(`Successfully imported wafer inspection data (${lines.length} lines parsed).\nRecalculating spatial patterns and root causes...`);
        // Use uploaded data to simulate excursion lot
        const customLot = {
          lotId: `LOT-CUSTOM-${Date.now().toString().slice(-4)}`,
          waferId: `W-UPLOADED-01`,
          fab: 'Fab 12 (Custom Ingestion)',
          node: '3nm GAAFET',
          product: 'User Custom Ingested Lot',
          recipe: 'CUSTOM_INSPECTION_RECIPE',
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          patternType: 'edge-ring',
          patternName: 'Custom Ingested Excursion',
          yieldPercentage: 79.1,
          baselineYield: 94.2,
          yieldDelta: -15.1,
          severity: 'Critical S1',
          financialImpactMonthly: '$11.8M USD Loss Risk',
          totalDies: 1420,
          goodDies: 1123,
          marginalDies: 38,
          badDies: 259,
          defectDensity: '0.362 / cm²',
          primarySuspect: 'Etch RF Bias Drift (Correlated from Custom Data)'
        };
        SAMPLE_LOTS.unshift(customLot);
        this.dom.lotSelector.innerHTML = SAMPLE_LOTS.map(l => `<option value="${l.lotId}">${l.lotId} - ${l.patternName}</option>`).join('');
        this._loadLot(customLot);
      } catch (err) {
        alert('Error parsing uploaded wafer inspection file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.waferApp = new WaferApp();
});
