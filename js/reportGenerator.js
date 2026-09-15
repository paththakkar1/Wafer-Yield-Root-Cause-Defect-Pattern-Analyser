/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * 8D Engineering Investigation & RCCA Report Generator
 */

export class ReportGenerator {
  /**
   * Generate an 8D Engineering Root Cause & Corrective Action (RCCA) Report
   * @param {Object} lot 
   * @param {Object} patternAnalysis 
   * @param {Array} rootCauses 
   * @param {Array} actions 
   */
  static generate8DReport(lot, patternAnalysis, rootCauses, actions) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to view the engineering report.');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>8D RCCA Engineering Report - ${lot.lotId}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.4;
      font-size: 11pt;
      margin: 0;
      padding: 20px;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 9.5pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: bold;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-critical { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; }
    .badge-normal { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #0369a1;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    table.data-table th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    .mono { font-family: "JetBrains Mono", Consolas, monospace; font-size: 9pt; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 6px;
    }
    .kpi-label { font-size: 8.5pt; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 14pt; font-weight: bold; color: #0f172a; }
    .signoff-box {
      margin-top: 24px;
      border-top: 2px dashed #94a3b8;
      padding-top: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .signoff-line {
      border-bottom: 1px solid #475569;
      height: 32px;
      margin-bottom: 4px;
    }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #0284c7;
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-weight: bold;
      cursor: pointer;
    }
    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>

  <table class="header-table">
    <tr>
      <td>
        <div class="subtitle">Bob YieldAI • Semiconductor Quality & Reliability Engineering</div>
        <div class="title">8D Root Cause & Corrective Action (RCCA) Report</div>
        <div style="font-size: 9pt; color: #475569; margin-top: 4px;">
          Generated: ${new Date().toISOString()} • Ref: 8D-${lot.lotId}-${Date.now().toString().slice(-6)}
        </div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <span class="badge ${lot.severity.includes('Critical') ? 'badge-critical' : 'badge-normal'}">
          ${lot.severity}
        </span>
        <div class="mono" style="margin-top: 6px; font-weight: bold; font-size: 11pt;">${lot.fab}</div>
      </td>
    </tr>
  </table>

  <!-- D1/D2: Problem Definition & Lot Details -->
  <div class="section-title">D1 - D2: Excursion Identification & Problem Statement</div>
  <div class="grid-2">
    <div class="kpi-card">
      <div class="kpi-label">Lot & Wafer ID</div>
      <div class="mono" style="font-size: 11pt; font-weight: bold; color: #0369a1;">${lot.lotId} / ${lot.waferId}</div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Node: ${lot.node} | Recipe: ${lot.recipe}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Yield Impact</div>
      <div class="kpi-val" style="color: ${lot.yieldDelta < 0 ? '#b91c1c' : '#15803d'}">
        ${lot.yieldPercentage}% <span style="font-size: 10pt; font-weight: normal;">(${lot.yieldDelta > 0 ? '+' : ''}${lot.yieldDelta}% vs Target ${lot.baselineYield}%)</span>
      </div>
      <div style="font-size: 8.5pt; color: #b91c1c; font-weight: 600;">Est. Monthly Exposure: ${lot.financialImpactMonthly}</div>
    </div>
  </div>

  <table class="data-table">
    <tr>
      <th>Total Dies Tested</th>
      <th>Good Dies (Bin 1)</th>
      <th>Marginal Dies</th>
      <th>Defective Dies</th>
      <th>Defect Density (D₀)</th>
    </tr>
    <tr class="mono">
      <td>${lot.totalDies}</td>
      <td style="color: #15803d; font-weight: bold;">${lot.goodDies} (${((lot.goodDies/lot.totalDies)*100).toFixed(1)}%)</td>
      <td style="color: #b45309;">${lot.marginalDies}</td>
      <td style="color: #b91c1c; font-weight: bold;">${lot.badDies}</td>
      <td>${lot.defectDensity}</td>
    </tr>
  </table>

  <!-- D3/D4: Containment & Spatial Pattern Signature -->
  <div class="section-title">D3 - D4: Defect Spatial Pattern & Root Cause Ranking</div>
  <p style="font-size: 9.5pt; margin-top: 0; margin-bottom: 8px;">
    <b>Spatial Signature:</b> ${patternAnalysis.primaryPattern} (Confidence: ${patternAnalysis.confidence}%)<br>
    <em>${patternAnalysis.description}</em>
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Probability</th>
        <th>Suspect Equipment / Chamber</th>
        <th>Process Step</th>
        <th>Sensor Anomaly</th>
        <th>Correlation (r²)</th>
      </tr>
    </thead>
    <tbody>
      ${rootCauses.map(rc => `
        <tr>
          <td class="mono" style="font-weight: bold;">#${rc.rank}</td>
          <td class="mono" style="color: #0369a1; font-weight: bold;">${rc.probability}%</td>
          <td><b>${rc.toolId}</b> (${rc.chamber})</td>
          <td style="font-size: 8.5pt;">${rc.processStep}</td>
          <td class="mono" style="color: #b91c1c; font-size: 8.5pt;">${rc.sensorName}: ${rc.driftDelta}</td>
          <td class="mono">${rc.historicalCorrelation}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- D5/D6: Permanent Corrective Actions -->
  <div class="section-title">D5 - D6: Prescriptive Corrective Actions & Implementation</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Action Code</th>
        <th>Corrective Action Description</th>
        <th>Target Tool</th>
        <th>Est. Downtime</th>
        <th>Yield Recovery</th>
      </tr>
    </thead>
    <tbody>
      ${actions.map(act => `
        <tr>
          <td class="mono" style="font-weight: bold; font-size: 8.5pt;">${act.id}</td>
          <td>
            <b>${act.title}</b>
            <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
              Steps: ${act.actionSteps.join(' • ')}
            </div>
          </td>
          <td class="mono" style="font-size: 8.5pt;">${act.targetEquipment}</td>
          <td>${act.estDowntimeHours} hrs</td>
          <td style="color: #15803d; font-weight: bold;">+${act.estYieldRecoveryPct}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- D7/D8: Prevention & Engineering Sign-Off -->
  <div class="section-title">D7 - D8: Recurrence Prevention & Sign-Off Authorization</div>
  <div style="font-size: 9pt; color: #475569;">
    MES SECS-GEM chamber lockouts engaged. Pre-Flight Batch Risk Guard active to flag upcoming lots scheduled on suspect toolsets prior to cassette release.
  </div>

  <div class="signoff-box">
    <div>
      <div class="signoff-line"></div>
      <div style="font-size: 8.5pt; font-weight: bold;">Yield Integration Lead</div>
      <div style="font-size: 8pt; color: #64748b;">Dr. C. Chang, PE</div>
    </div>
    <div>
      <div class="signoff-line"></div>
      <div style="font-size: 8.5pt; font-weight: bold;">Equipment & Maintenance Director</div>
      <div style="font-size: 8pt; color: #64748b;">M. Vance, Fab Operations</div>
    </div>
    <div>
      <div class="signoff-line"></div>
      <div style="font-size: 8.5pt; font-weight: bold;">Fab General Manager</div>
      <div style="font-size: 8pt; color: #64748b;">K. Tanaka, VP Manufacturing</div>
    </div>
  </div>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
