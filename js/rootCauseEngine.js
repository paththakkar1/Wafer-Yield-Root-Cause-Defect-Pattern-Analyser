/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * Root Cause Analysis Engine: Multi-Variate Probabilistic Ranking & Sensor Telemetry
 */

import { ROOT_CAUSE_DATABASE } from './sampleData.js';

export class RootCauseEngine {
  constructor() {
    this.chartInstance = null;
    this.selectedRootCause = null;
  }

  getRootCausesForLot(lotId) {
    return ROOT_CAUSE_DATABASE[lotId] || [];
  }

  /**
   * Render the Root Causes Probability Ranking List
   * @param {string} lotId 
   * @param {HTMLElement} container 
   * @param {Function} onSelect 
   */
  renderRankingList(lotId, container, onSelect) {
    const causes = this.getRootCausesForLot(lotId);
    container.innerHTML = '';

    if (!causes || causes.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <div class="inline-block p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h4 class="text-base font-semibold text-slate-200">No Root Cause Excursion Detected</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">This lot is within nominal 6-sigma baseline limits. All equipment sensor streams are in control.</p>
        </div>
      `;
      return;
    }

    causes.forEach((cause, idx) => {
      const isFirst = idx === 0;
      const card = document.createElement('div');
      card.className = `p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
        isFirst 
          ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30' 
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`;

      // Rank Badge Color
      let rankColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      if (cause.rank === 2) rankColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      if (cause.rank > 2) rankColor = 'bg-slate-700/40 text-slate-300 border-slate-600/30';

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="px-2 py-0.5 text-xs font-mono font-bold rounded border ${rankColor}">
              RANK #${cause.rank}
            </span>
            <span class="text-xs font-mono text-slate-400">${cause.toolId}</span>
          </div>
          <div class="text-right">
            <span class="text-base font-bold font-mono text-cyan-400">${cause.probability}%</span>
            <span class="text-[10px] text-slate-400 block font-mono">Prob. (P &gt; F)</span>
          </div>
        </div>

        <h4 class="text-sm font-semibold text-slate-100 mt-2 line-clamp-1">${cause.title}</h4>
        
        <div class="grid grid-cols-2 gap-2 mt-2.5 text-xs text-slate-400">
          <div>
            <span class="text-slate-500 block text-[10px] uppercase tracking-wider">Sub-Chamber</span>
            <span class="font-mono text-slate-300 truncate block">${cause.chamber}</span>
          </div>
          <div>
            <span class="text-slate-500 block text-[10px] uppercase tracking-wider">Key Sensor Drift</span>
            <span class="font-mono text-rose-400 truncate block">${cause.driftDelta}</span>
          </div>
        </div>

        <!-- Probability Bar -->
        <div class="w-full bg-slate-950/60 h-2 rounded-full mt-3 overflow-hidden border border-slate-800/80">
          <div class="h-full bg-gradient-to-r from-cyan-500 to-rose-500 rounded-full" style="width: ${cause.probability}%"></div>
        </div>

        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
          <span>Hist. Correlation: <b class="text-slate-200">r² = ${cause.historicalCorrelation}</b></span>
          <span>Log-Likelihood: <b class="text-cyan-400">+${cause.logLikelihoodRatio}</b></span>
        </div>
      `;

      card.addEventListener('click', () => {
        container.querySelectorAll('.border-cyan-500').forEach(el => {
          el.classList.remove('border-cyan-500', 'bg-slate-800/90', 'shadow-lg', 'shadow-cyan-950/40', 'ring-1', 'ring-cyan-500/30');
          el.classList.add('bg-slate-900/60', 'border-slate-800');
        });
        card.classList.remove('bg-slate-900/60', 'border-slate-800');
        card.classList.add('bg-slate-800/90', 'border-cyan-500', 'shadow-lg', 'shadow-cyan-950/40', 'ring-1', 'ring-cyan-500/30');

        this.selectedRootCause = cause;
        if (onSelect) onSelect(cause);
      });

      container.appendChild(card);
    });

    // Default select rank 1
    if (causes.length > 0) {
      this.selectedRootCause = causes[0];
      if (onSelect) onSelect(causes[0]);
    }
  }

  /**
   * Render or Update the Telemetry Chart with Chart.js
   * @param {HTMLCanvasElement} canvasEl 
   * @param {Object} cause 
   */
  renderTelemetryChart(canvasEl, cause) {
    if (!cause || !cause.telemetry) return;

    const ctx = canvasEl.getContext('2d');
    const tel = cause.telemetry;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Chart.js configuration
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: tel.labels,
        datasets: [
          {
            label: `Actual Excursion (${cause.sensorName})`,
            data: tel.actual,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            borderWidth: 2.2,
            pointRadius: 2,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.25
          },
          {
            label: 'Golden Baseline (In-Control Run)',
            data: tel.baseline,
            borderColor: '#10b981',
            borderWidth: 1.8,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.25
          },
          {
            label: 'Upper Spec Limit (+3σ USL)',
            data: tel.upperLimit,
            borderColor: '#eab308',
            borderWidth: 1.2,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Lower Spec Limit (-3σ LSL)',
            data: tel.lowerLimit,
            borderColor: '#eab308',
            borderWidth: 1.2,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11
              },
              boxWidth: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#38bdf8',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1,
            titleFont: { family: "'JetBrains Mono', monospace" },
            bodyFont: { family: "'JetBrains Mono', monospace" },
            padding: 10
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.25)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxTicksLimit: 12
            }
          },
          y: {
            grid: {
              color: 'rgba(51, 65, 85, 0.25)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 10 }
            },
            title: {
              display: true,
              text: `${cause.sensorName} (${cause.unit})`,
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          }
        }
      }
    });
  }
}
