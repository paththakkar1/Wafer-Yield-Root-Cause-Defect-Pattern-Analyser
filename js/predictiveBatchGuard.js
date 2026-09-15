/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * Pre-Flight Batch Risk Guard & What-If Rerouting Simulator
 * Addresses: "predict which upcoming batches are at risk before they run, not after they fail"
 */

import { UPCOMING_BATCHES } from './sampleData.js';

export class PredictiveBatchGuard {
  constructor() {
    this.batches = JSON.parse(JSON.stringify(UPCOMING_BATCHES));
    this.selectedBatchId = this.batches[0]?.batchId || null;
    this.simulationState = {}; // batchId -> { reroutedToolId, newRiskScore, newYield }
  }

  getBatches() {
    return this.batches;
  }

  getBatch(batchId) {
    return this.batches.find(b => b.batchId === batchId);
  }

  applyReroute(batchId, toolId) {
    const batch = this.getBatch(batchId);
    if (!batch) return null;

    const opt = batch.rerouteToolOptions.find(o => o.toolId === toolId);
    if (opt) {
      this.simulationState[batchId] = {
        reroutedToolId: opt.toolId,
        newRiskScore: opt.riskScore,
        newYield: opt.projectedYield,
        originalYield: batch.projectedYield,
        originalRisk: batch.riskScore,
        savings: batch.projectedLoss
      };
    } else {
      delete this.simulationState[batchId];
    }
    return this.simulationState[batchId];
  }

  resetReroute(batchId) {
    delete this.simulationState[batchId];
  }

  holdBatch(batchId) {
    const batch = this.getBatch(batchId);
    if (batch) {
      batch.status = 'QUARANTINED / HOLD ACTIVE';
      return true;
    }
    return false;
  }

  /**
   * Render Pre-Flight Batch Queue into container
   * @param {HTMLElement} container 
   * @param {Function} onSelect 
   */
  renderBatchQueue(container, onSelect) {
    container.innerHTML = '';

    this.batches.forEach(batch => {
      const sim = this.simulationState[batch.batchId];
      const isSelected = batch.batchId === this.selectedBatchId;
      const card = document.createElement('div');
      
      const effectiveRisk = sim ? sim.newRiskScore : batch.riskScore;
      const isCritical = effectiveRisk >= 85;
      const isHigh = effectiveRisk >= 60 && effectiveRisk < 85;

      let badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      let borderTheme = isSelected ? 'border-cyan-500 shadow-cyan-950/40' : 'border-slate-800';
      if (isCritical) {
        badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        if (isSelected) borderTheme = 'border-rose-500 shadow-rose-950/40';
      } else if (isHigh) {
        badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        if (isSelected) borderTheme = 'border-amber-500 shadow-amber-950/40';
      }

      card.className = `p-4 rounded-xl border bg-slate-900/70 transition-all cursor-pointer relative overflow-hidden ${borderTheme} ${
        isSelected ? 'ring-1 ring-cyan-400/40 shadow-lg' : 'hover:border-slate-700 hover:bg-slate-850'
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-xs font-mono font-bold rounded border ${badgeBg}">
              ${sim ? 'SIMULATED: ' + effectiveRisk + '%' : effectiveRisk + '% RISK'}
            </span>
            <span class="font-mono text-xs font-semibold text-slate-200">${batch.batchId}</span>
          </div>
          <span class="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            ${batch.scheduledRunTime}
          </span>
        </div>

        <h4 class="text-sm font-semibold text-slate-100 mt-2">${batch.product}</h4>

        <div class="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
          <div>
            <span class="text-[10px] text-slate-500 uppercase block font-mono">Assigned Tool</span>
            <span class="font-mono text-slate-300 ${sim ? 'line-through text-slate-500' : ''}">${batch.targetEquipment}</span>
            ${sim ? `<span class="font-mono text-emerald-400 text-[11px] block font-bold">↳ ${sim.reroutedToolId}</span>` : ''}
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase block font-mono">Projected Yield</span>
            <span class="font-mono ${isCritical && !sim ? 'text-rose-400 font-bold' : 'text-slate-300'}">
              ${sim ? sim.newYield + '% (+' + (sim.newYield - sim.originalYield).toFixed(1) + '%)' : batch.projectedYield + '%'}
            </span>
          </div>
        </div>

        <!-- Risk Level Bar -->
        <div class="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
          <div class="h-full rounded-full transition-all duration-500 ${
            effectiveRisk >= 80 ? 'bg-rose-500' : (effectiveRisk >= 50 ? 'bg-amber-500' : 'bg-emerald-500')
          }" style="width: ${effectiveRisk}%"></div>
        </div>

        <div class="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-800/60">
          <span class="text-slate-400 font-mono text-[10px]">At-Risk Value: <b class="${isCritical && !sim ? 'text-rose-400' : 'text-slate-300'}">${batch.projectedLoss}</b></span>
          <span class="text-[10px] font-mono ${batch.status.includes('HOLD') ? 'text-rose-400 font-bold' : 'text-slate-400'}">${batch.status}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedBatchId = batch.batchId;
        this.renderBatchQueue(container, onSelect);
        if (onSelect) onSelect(batch, this.simulationState[batch.batchId]);
      });

      container.appendChild(card);
    });
  }

  /**
   * Render the Batch Details & What-If Simulator panel
   * @param {HTMLElement} container 
   * @param {Object} batch 
   * @param {Function} onUpdate 
   */
  renderSimulator(container, batch, onUpdate) {
    if (!batch) {
      container.innerHTML = '<div class="p-8 text-center text-slate-500">Select a batch to inspect pre-flight risk.</div>';
      return;
    }

    const sim = this.simulationState[batch.batchId];
    const effectiveRisk = sim ? sim.newRiskScore : batch.riskScore;
    const effectiveYield = sim ? sim.newYield : batch.projectedYield;

    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <!-- Background Radar Glow -->
        <div class="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-md ${
                effectiveRisk >= 80 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                (effectiveRisk >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
              }">
                ${effectiveRisk}% PRE-FLIGHT RISK SCORE
              </span>
              <span class="text-xs font-mono text-cyan-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                ${batch.node}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-100 mt-2">${batch.batchId}: ${batch.product}</h3>
            <p class="text-xs text-slate-400 font-mono mt-0.5">Recipe: ${batch.recipe} • Launch: ${batch.scheduledRunTime}</p>
          </div>

          <div class="flex items-center gap-2">
            <button id="btn-hold-batch" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              batch.status.includes('HOLD') 
                ? 'bg-rose-950/60 border-rose-600 text-rose-300 ring-1 ring-rose-500/40' 
                : 'bg-slate-800 hover:bg-rose-900/40 border-slate-700 hover:border-rose-500/50 text-rose-300'
            }">
              <span class="inline-block w-2 h-2 rounded-full mr-1.5 ${batch.status.includes('HOLD') ? 'bg-rose-400 animate-ping' : 'bg-rose-500'}"></span>
              ${batch.status.includes('HOLD') ? 'BATCH ON MES HOLD' : 'PLACE ON PRE-FLIGHT HOLD'}
            </button>
          </div>
        </div>

        <!-- Metric Gauges -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Assigned Equipment</span>
            <div class="text-base font-bold font-mono text-slate-100 mt-1">${batch.targetEquipment}</div>
            <span class="text-[11px] text-slate-500 font-mono">Current Tool Status: In Production</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Projected Batch Yield</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-2xl font-black font-mono ${effectiveYield < 85 ? 'text-rose-400' : 'text-emerald-400'}">
                ${effectiveYield}%
              </span>
              ${sim ? `<span class="text-xs font-mono text-emerald-400">(+${(sim.newYield - sim.originalYield).toFixed(1)}% recovery)</span>` : ''}
            </div>
            <span class="text-[11px] text-slate-500 font-mono">Baseline Target: 94.5%</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Potential Scrap Loss</span>
            <div class="text-2xl font-black font-mono ${effectiveRisk >= 80 ? 'text-rose-400' : 'text-slate-300'} mt-1">
              ${sim ? '$0.0M (Protected)' : batch.projectedLoss}
            </div>
            <span class="text-[11px] text-slate-500 font-mono">25 Wafers @ $28.5k/wafer</span>
          </div>
        </div>

        <!-- Multi-Variate Correlation Risk Drivers -->
        <div class="mt-5 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
          <h4 class="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Historical Correlation Risk Drivers Identified
          </h4>
          <ul class="mt-2.5 space-y-1.5">
            ${batch.riskFactors.map(rf => `
              <li class="flex items-start gap-2 text-xs text-slate-300">
                <span class="text-rose-400 font-mono mt-0.5">▶</span>
                <span>${rf}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Interactive What-If Simulator -->
        <div class="mt-5 p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 relative">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span class="flex h-2 w-2 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Interactive "What-If" Reroute Simulator
              </h4>
              <p class="text-xs text-slate-400 mt-0.5">
                Simulate re-routing cassette to qualified standby chambers before cassette dispatch.
              </p>
            </div>
            ${sim ? `
              <button id="btn-reset-sim" class="text-xs font-mono text-slate-400 hover:text-slate-200 underline">
                Reset Simulation
              </button>
            ` : ''}
          </div>

          ${batch.rerouteToolOptions && batch.rerouteToolOptions.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              ${batch.rerouteToolOptions.map(opt => {
                const isCurrentSim = sim && sim.reroutedToolId === opt.toolId;
                return `
                  <div class="p-3.5 rounded-lg border transition-all ${
                    isCurrentSim 
                      ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }">
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold text-slate-200">${opt.toolId}</span>
                      <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Health: ${opt.healthScore}%
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                      <div>
                        <span class="text-[10px] text-slate-500 uppercase block font-mono">Projected Yield</span>
                        <span class="font-mono text-emerald-400 font-bold">${opt.projectedYield}%</span>
                      </div>
                      <div>
                        <span class="text-[10px] text-slate-500 uppercase block font-mono">Residual Risk</span>
                        <span class="font-mono text-slate-300">${opt.riskScore}%</span>
                      </div>
                    </div>

                    <button data-tool="${opt.toolId}" class="btn-reroute-apply w-full mt-3 py-1.5 px-3 rounded text-xs font-semibold font-mono transition-all ${
                      isCurrentSim 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50' 
                        : 'bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-cyan-300 border border-slate-700'
                    }">
                      ${isCurrentSim ? '✓ SIMULATION ACTIVE' : 'SIMULATE REROUTE ➔'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="p-3 text-xs text-slate-400 font-mono bg-slate-950/60 rounded border border-slate-800">
              No alternative toolsets available for this specific recipe step. Manual engineering recipe offset recommended.
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners
    const holdBtn = container.querySelector('#btn-hold-batch');
    if (holdBtn) {
      holdBtn.addEventListener('click', () => {
        this.holdBatch(batch.batchId);
        if (onUpdate) onUpdate();
      });
    }

    const resetBtn = container.querySelector('#btn-reset-sim');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetReroute(batch.batchId);
        if (onUpdate) onUpdate();
      });
    }

    container.querySelectorAll('.btn-reroute-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolId = e.currentTarget.getAttribute('data-tool');
        this.applyReroute(batch.batchId, toolId);
        if (onUpdate) onUpdate();
      });
    });
  }
}
