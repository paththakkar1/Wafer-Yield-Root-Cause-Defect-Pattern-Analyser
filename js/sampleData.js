/**
 * Bob Wafer Yield Root Cause & Defect Pattern Analyser
 * Sample Semiconductor Fab Datasets (3nm GAAFET & 5nm EUV FinFET)
 */

export const FAB_CONSTANTS = {
  WAFER_DIAMETER_MM: 300,
  DIE_SIZE_X_MM: 5.2,
  DIE_SIZE_Y_MM: 5.2,
  EDGE_EXCLUSION_MM: 3.0,
  COST_PER_3NM_WAFER: 28500, // USD
  COST_PER_5NM_WAFER: 19200, // USD
  MONTHLY_WAFER_STARTS_3NM: 25000,
  MONTHLY_WAFER_STARTS_5NM: 35000
};

// Generate a realistic 300mm wafer grid of dies
export function generateWaferGrid(patternType = 'edge-ring', seed = 42) {
  const R = FAB_CONSTANTS.WAFER_DIAMETER_MM / 2; // 150mm
  const usableR = R - FAB_CONSTANTS.EDGE_EXCLUSION_MM; // 147mm
  const stepX = FAB_CONSTANTS.DIE_SIZE_X_MM;
  const stepY = FAB_CONSTANTS.DIE_SIZE_Y_MM;
  
  const dies = [];
  let id = 1;
  const gridRadius = Math.ceil(usableR / stepX);
  
  // Deterministic pseudo-random helper
  let s = seed;
  const pseudoRand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let gy = -gridRadius; gy <= gridRadius; gy++) {
    for (let gx = -gridRadius; gx <= gridRadius; gx++) {
      const centerX = gx * stepX;
      const centerY = gy * stepY;
      const distFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);
      
      // Die corners to check if die is inside wafer
      if (distFromCenter + stepX * 0.7 > usableR) {
        continue; // Die outside wafer boundaries
      }

      const normalizedR = distFromCenter / usableR; // 0 (center) to 1 (outer edge)
      
      let isDefect = false;
      let bin = 1; // 1 = Pass / Good
      let defectType = 'None';
      let defectClass = 'Normal';
      let leakage = 0.05 + pseudoRand() * 0.04; // nA
      let vth = 0.32 + (pseudoRand() - 0.5) * 0.02; // V
      
      // Inject defect pattern based on type
      if (patternType === 'edge-ring') {
        // High defect concentration at outer ring (normalizedR > 0.82)
        if (normalizedR > 0.82) {
          const prob = 0.68 + (normalizedR - 0.82) * 1.8;
          if (pseudoRand() < prob) {
            isDefect = true;
            bin = pseudoRand() > 0.4 ? 7 : 9; // Bin 7 = Edge Leakage, 9 = Gate Short
            defectType = 'Edge-Ring Plasma Etch Defect';
            defectClass = 'Edge-Ring';
            leakage = 12.4 + pseudoRand() * 25.0;
            vth = 0.18 + pseudoRand() * 0.08;
          }
        } else if (pseudoRand() < 0.015) {
          // Normal background noise
          isDefect = true;
          bin = 2;
          defectType = 'Random Particle';
          defectClass = 'Random';
        }
      } else if (patternType === 'scratch') {
        // Arc scratch from handling robot arm: trajectory y = 0.005*x^2 - 30, with noise
        const arcY = 0.004 * (centerX + 20) * (centerX + 20) - 45;
        const distToArc = Math.abs(centerY - arcY);
        if (distToArc < 12 && centerX > -80 && centerX < 90) {
          const prob = 0.82 - distToArc * 0.05;
          if (pseudoRand() < prob) {
            isDefect = true;
            bin = 4; // Bin 4 = Metal Line Scratch
            defectType = 'End-Effector Handling Scratch';
            defectClass = 'Scratch';
            leakage = 45.0 + pseudoRand() * 30.0;
            vth = 0.05;
          }
        } else if (pseudoRand() < 0.018) {
          isDefect = true;
          bin = 2;
          defectType = 'Random Particle';
          defectClass = 'Random';
        }
      } else if (patternType === 'center-cluster') {
        // High density in center (normalizedR < 0.32)
        if (normalizedR < 0.32) {
          const prob = 0.75 - normalizedR * 1.8;
          if (pseudoRand() < prob) {
            isDefect = true;
            bin = 3; // Bin 3 = Thermal Slurry / Void
            defectType = 'Center Thermal Stagnation Void';
            defectClass = 'Center Cluster';
            leakage = 18.2 + pseudoRand() * 15.0;
            vth = 0.45;
          }
        } else if (pseudoRand() < 0.014) {
          isDefect = true;
          bin = 2;
          defectType = 'Random Particle';
          defectClass = 'Random';
        }
      } else if (patternType === 'donut') {
        // Annular donut defect at mid-radius (0.45 < normalizedR < 0.70)
        if (normalizedR >= 0.45 && normalizedR <= 0.70) {
          const prob = 0.65;
          if (pseudoRand() < prob) {
            isDefect = true;
            bin = 8; // Bin 8 = RTA Thermal Non-Uniformity
            defectType = 'RTA Pyrometer Ring Mismatch';
            defectClass = 'Donut';
            leakage = 8.5 + pseudoRand() * 12.0;
          }
        } else if (pseudoRand() < 0.012) {
          isDefect = true;
          bin = 2;
          defectType = 'Random Particle';
          defectClass = 'Random';
        }
      } else {
        // Golden / Baseline lot (purely low random noise)
        if (pseudoRand() < 0.016) {
          isDefect = true;
          bin = 2;
          defectType = 'Random Particle';
          defectClass = 'Random';
          leakage = 3.2 + pseudoRand() * 4.0;
        }
      }

      dies.push({
        id: id++,
        gx,
        gy,
        x: centerX,
        y: centerY,
        normalizedR,
        distMm: distFromCenter,
        status: isDefect ? 'defective' : (leakage > 0.08 ? 'marginal' : 'good'),
        bin,
        binName: bin === 1 ? 'Pass' : (bin === 7 ? 'Edge Leakage' : (bin === 9 ? 'Gate Short' : (bin === 4 ? 'Metal Scratch' : 'Parametric Fail'))),
        defectType,
        defectClass,
        testValues: {
          vth: vth.toFixed(3),
          leakage: leakage.toFixed(2),
          isat: (isDefect ? 120 + pseudoRand() * 80 : 420 + (pseudoRand() - 0.5) * 20).toFixed(1)
        },
        semImage: isDefect ? getSemImageForDefect(defectClass, id) : null
      });
    }
  }

  return dies;
}

function getSemImageForDefect(defectClass, id) {
  const images = {
    'Edge-Ring': {
      title: 'SEM Review: 3nm GAA Edge Profile Undercut',
      magnification: '120,000x',
      voltage: '1.2 kV',
      defectCode: 'DEF-ETCH-304',
      description: 'Severe plasma edge over-etch resulting in nanosheet bridging and gate spacer blowout.',
      svgType: 'edge_undercut'
    },
    'Scratch': {
      title: 'SEM Review: Robot Handling Particle Furrow',
      magnification: '45,000x',
      voltage: '2.0 kV',
      defectCode: 'DEF-MECH-812',
      description: 'Continuous dielectric scratch with residual ceramic alumina particles bridging M1 lines.',
      svgType: 'scratch_furrow'
    },
    'Center Cluster': {
      title: 'SEM Review: Center Slurry Residue & Micro-Pitting',
      magnification: '80,000x',
      voltage: '1.5 kV',
      defectCode: 'DEF-CMP-419',
      description: 'Silica slurry agglomerate deposit causing pattern collapse and sub-surface dishing.',
      svgType: 'slurry_pit'
    },
    'Donut': {
      title: 'SEM Review: Thermal Gradient Lattice Dislocation',
      magnification: '95,000x',
      voltage: '1.8 kV',
      defectCode: 'DEF-RTA-107',
      description: 'Thermal stress slip lines in crystalline silicon causing threshold voltage dispersion.',
      svgType: 'slip_lines'
    },
    'Random': {
      title: 'SEM Review: Sub-20nm Airborne Aerosol Defect',
      magnification: '150,000x',
      voltage: '1.0 kV',
      defectCode: 'DEF-ENV-003',
      description: 'Isolated organic carbonaceous particle embedded prior to EUV photoresist exposure.',
      svgType: 'particle'
    }
  };
  return images[defectClass] || images['Random'];
}

// Sample production lots
export const SAMPLE_LOTS = [
  {
    lotId: 'LOT-W3-9042',
    waferId: 'W04-3NM-GAA-9042',
    fab: 'Fab 12 (GigaFab - Taichung)',
    node: '3nm GAAFET',
    product: 'Bob Tensor-X NPU (Next-Gen AI Core)',
    recipe: '3NM_LOGIC_ETCH_GATE_REV4.2',
    date: '2026-09-14 18:32 UTC',
    patternType: 'edge-ring',
    patternName: 'Edge-Ring Annular Excursion',
    yieldPercentage: 78.4,
    baselineYield: 94.2,
    yieldDelta: -15.8,
    severity: 'Critical S1',
    financialImpactMonthly: '$12.4M USD Loss Risk',
    totalDies: 1420,
    goodDies: 1113,
    marginalDies: 42,
    badDies: 265,
    defectDensity: '0.375 / cm²',
    primarySuspect: 'Etch Chamber ETCH-04 RF Bias Fluctuation'
  },
  {
    lotId: 'LOT-W3-9043',
    waferId: 'W11-3NM-GAA-9043',
    fab: 'Fab 12 (GigaFab - Taichung)',
    node: '3nm GAAFET',
    product: 'Bob Tensor-X NPU (Next-Gen AI Core)',
    recipe: '3NM_BEOL_METALLIZATION_REV3.1',
    date: '2026-09-15 03:14 UTC',
    patternType: 'scratch',
    patternName: 'Radial Handling Scratch Arc',
    yieldPercentage: 81.2,
    baselineYield: 94.2,
    yieldDelta: -13.0,
    severity: 'High S2',
    financialImpactMonthly: '$9.8M USD Loss Risk',
    totalDies: 1420,
    goodDies: 1153,
    marginalDies: 35,
    badDies: 232,
    defectDensity: '0.312 / cm²',
    primarySuspect: 'FOUP Transfer Robot End-Effector Tip Abrasion'
  },
  {
    lotId: 'LOT-W5-7718',
    waferId: 'W07-5NM-EUV-7718',
    fab: 'Fab 16 (High-Perf EUV - Tainan)',
    node: '5nm EUV FinFET',
    product: 'Bob EdgeCompute-5 Pro (Automotive ADAS)',
    recipe: '5NM_RTA_ANNEAL_HIGH_TEMP_B',
    date: '2026-09-13 22:50 UTC',
    patternType: 'center-cluster',
    patternName: 'Center Thermal Stagnation Void',
    yieldPercentage: 83.7,
    baselineYield: 95.8,
    yieldDelta: -12.1,
    severity: 'High S2',
    financialImpactMonthly: '$7.4M USD Loss Risk',
    totalDies: 1280,
    goodDies: 1071,
    marginalDies: 29,
    badDies: 180,
    defectDensity: '0.245 / cm²',
    primarySuspect: 'RTA Rapid Thermal Anneal Lamp Zone 1 Pyrometer Drift'
  },
  {
    lotId: 'LOT-W3-9050',
    waferId: 'W19-3NM-GAA-9050',
    fab: 'Fab 12 (GigaFab - Taichung)',
    node: '3nm GAAFET',
    product: 'Bob Tensor-X NPU (Golden Run)',
    recipe: '3NM_LOGIC_ETCH_GATE_REV4.2',
    date: '2026-09-12 10:15 UTC',
    patternType: 'golden',
    patternName: 'Normal In-Control Baseline (Random Noise)',
    yieldPercentage: 96.8,
    baselineYield: 94.2,
    yieldDelta: +2.6,
    severity: 'Normal / Golden',
    financialImpactMonthly: '+$1.8M Over Baseline',
    totalDies: 1420,
    goodDies: 1374,
    marginalDies: 22,
    badDies: 24,
    defectDensity: '0.034 / cm²',
    primarySuspect: 'None - Within 6-Sigma Process Window'
  }
];

function generateSensorTelemetry(nominal, sigma, excursionMean, excursionSigma, lsl, usl) {
  const points = 45;
  const labels = [];
  const baseline = [];
  const actual = [];
  const upperLimit = [];
  const lowerLimit = [];

  for (let i = 1; i <= points; i++) {
    labels.push(`t-${points - i + 1}s`);
    // Pseudo random normal
    const u1 = Math.sin(i * 997.1) * 0.5 + 0.5;
    const u2 = Math.cos(i * 443.3) * 0.5 + 0.5;
    const z = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);

    baseline.push(parseFloat((nominal + z * sigma).toFixed(2)));
    upperLimit.push(usl);
    lowerLimit.push(lsl);

    // Actual has excursion ramp starting halfway
    if (i < 20) {
      actual.push(parseFloat((nominal + z * sigma).toFixed(2)));
    } else {
      const progress = (i - 20) / (points - 20);
      const curMean = nominal + (excursionMean - nominal) * progress;
      actual.push(parseFloat((curMean + z * excursionSigma).toFixed(2)));
    }
  }

  return { labels, baseline, actual, upperLimit, lowerLimit };
}

// Root causes database with Bayesian probabilities and sensor drift curves
export const ROOT_CAUSE_DATABASE = {
  'LOT-W3-9042': [
    {
      id: 'RC-ETCH-04-RF',
      rank: 1,
      probability: 94.6,
      confidenceInterval: [92.1, 96.8],
      title: 'Etch Chamber ETCH-04: RF Bias Power Uniformity Drift',
      toolId: 'TEL-VIM-ETCH-04',
      chamber: 'Chamber B (Gate Nanosheet Etch)',
      processStep: 'Step 42: Gate Spacer Anisotropic Etch',
      sensorKey: 'RF_BIAS_POWER_WATTS',
      sensorName: 'ESC RF Bias Power',
      unit: 'Watts',
      nominalValue: 450.0,
      actualExcursion: 478.4,
      driftDelta: '+28.4 W (+6.3% above 3σ limit)',
      logLikelihoodRatio: 4.82,
      failingLotsCorrelated: 14,
      historicalCorrelation: 0.94,
      mechanism: 'Electrostatic Chuck (ESC) peripheral edge ring ceramic wear caused high-frequency RF impedance drop at wafer radius r > 125mm, intensifying plasma sheath energy and inducing severe nanosheet erosion.',
      telemetry: generateSensorTelemetry(450, 6.2, 478, 12.0, 430, 470),
      actionId: 'ACT-ETCH-04-REPLACE-ESC'
    },
    {
      id: 'RC-LITHO-02-EUV',
      rank: 2,
      probability: 81.3,
      confidenceInterval: [76.5, 85.2],
      title: 'Lithography Scanner LITHO-02: EUV Field Dose Non-Uniformity',
      toolId: 'ASML-EXE-3600-02',
      chamber: 'Exposure Chuck 1',
      processStep: 'Step 38: Critical Dimension Gate Patterning',
      sensorKey: 'EUV_DOSE_UNIFORMITY',
      sensorName: 'EUV Slit Dose Uniformity',
      unit: 'mJ/cm²',
      nominalValue: 34.0,
      actualExcursion: 35.8,
      driftDelta: '+1.8 mJ/cm² (Edge Overexposure)',
      logLikelihoodRatio: 3.65,
      failingLotsCorrelated: 9,
      historicalCorrelation: 0.81,
      mechanism: 'Collector mirror droplet contamination caused 3.8% intensity tilt across outer slit radius, reducing edge resist line width margin.',
      telemetry: generateSensorTelemetry(34.0, 0.35, 35.8, 0.9, 32.5, 35.5),
      actionId: 'ACT-LITHO-COLLECTOR-CLEAN'
    },
    {
      id: 'RC-CMP-03-PRESS',
      rank: 3,
      probability: 46.8,
      confidenceInterval: [40.2, 52.4],
      title: 'CMP Polisher CMP-03: Zone 7 Outer Bladder Pressure Decoupling',
      toolId: 'AMAT-REFLEX-CMP-03',
      chamber: 'Platen 2 (Poly-Si Removal)',
      processStep: 'Step 35: Interlayer Dielectric Planarization',
      sensorKey: 'BLADDER_ZONE7_PSI',
      sensorName: 'Membrane Retaining Ring Pressure',
      unit: 'psi',
      nominalValue: 4.20,
      actualExcursion: 4.85,
      driftDelta: '+0.65 psi (+15.5%)',
      logLikelihoodRatio: 1.95,
      failingLotsCorrelated: 5,
      historicalCorrelation: 0.52,
      mechanism: 'Retaining ring pneumatic valve hysteresis caused edge over-polishing prior to gate etch, thinning edge dielectric stack.',
      telemetry: generateSensorTelemetry(4.2, 0.12, 4.85, 0.32, 3.8, 4.6),
      actionId: 'ACT-CMP-BLADDER-CAL'
    },
    {
      id: 'RC-CVD-01-GAS',
      rank: 4,
      probability: 22.1,
      confidenceInterval: [17.4, 27.8],
      title: 'CVD Deposition CVD-01: SiH4 Gas Delivery MFC Jitter',
      toolId: 'LAM-VECTOR-CVD-01',
      chamber: 'Chamber 1',
      processStep: 'Step 29: Low-k Dielectric Liner',
      sensorKey: 'SIH4_FLOW_SCCM',
      sensorName: 'Silane MFC Mass Flow',
      unit: 'sccm',
      nominalValue: 120.0,
      actualExcursion: 123.5,
      driftDelta: '+3.5 sccm (Marginal)',
      logLikelihoodRatio: 0.72,
      failingLotsCorrelated: 2,
      historicalCorrelation: 0.28,
      mechanism: 'Minor flow oscillation within acceptable tolerance; low statistical causal link to peripheral ring defect.',
      telemetry: generateSensorTelemetry(120, 1.8, 123.5, 3.1, 115, 125),
      actionId: 'ACT-CVD-MFC-PURGE'
    }
  ],
  'LOT-W3-9043': [
    {
      id: 'RC-ROBOT-EF-01',
      rank: 1,
      probability: 97.2,
      confidenceInterval: [95.4, 98.6],
      title: 'FOUP Load Port Track Robot 02: End-Effector Ceramic Blade Wear',
      toolId: 'BROOKS-ATM-ROBOT-02',
      chamber: 'EFEM Module 1',
      processStep: 'Step 55: Pre-Clean Wafer Handler Transfer',
      sensorKey: 'END_EFFECTOR_Z_FORCE',
      sensorName: 'Blade Contact Force Sensor',
      unit: 'N',
      nominalValue: 1.20,
      actualExcursion: 3.45,
      driftDelta: '+2.25 N (Mechanical Binding)',
      logLikelihoodRatio: 5.12,
      failingLotsCorrelated: 18,
      historicalCorrelation: 0.98,
      mechanism: 'End-effector vacuum pad ceramic edge micro-fracture created abrasive contact point along wafer transfer vector theta=214°, gouging passivation layer.',
      telemetry: generateSensorTelemetry(1.2, 0.1, 3.45, 0.6, 0.8, 1.8),
      actionId: 'ACT-ROBOT-REPLACE-BLADE'
    }
  ],
  'LOT-W5-7718': [
    {
      id: 'RC-RTA-LAMP-01',
      rank: 1,
      probability: 92.8,
      confidenceInterval: [89.7, 95.1],
      title: 'RTA Rapid Thermal Annealer: Zone 1 Center Pyrometer Drift',
      toolId: 'MATTSON-HELIOS-RTA-01',
      chamber: 'Heating Cavity A',
      processStep: 'Step 48: Source/Drain Dopant Spike Activation',
      sensorKey: 'CENTER_PYROMETER_TEMP',
      sensorName: 'Zone 1 Optical Pyrometer Temp',
      unit: '°C',
      nominalValue: 1045.0,
      actualExcursion: 1063.4,
      driftDelta: '+18.4 °C (Overheat Spike)',
      logLikelihoodRatio: 4.45,
      failingLotsCorrelated: 11,
      historicalCorrelation: 0.92,
      mechanism: 'Optical quartz window quartz clouding distorted infrared pyrometer feedback, causing lamp controller to deliver excess radiative flux to wafer center.',
      telemetry: generateSensorTelemetry(1045, 3.5, 1063.4, 6.8, 1035, 1055),
      actionId: 'ACT-RTA-QUARTZ-REPLACE'
    }
  ],
  'LOT-W3-9050': []
};

// Prescriptive Engineering Actions
export const PRESCRIPTIVE_ACTIONS = [
  {
    id: 'ACT-ETCH-04-REPLACE-ESC',
    lotId: 'LOT-W3-9042',
    title: 'Quarantine Chamber ETCH-04 & Recalibrate Edge Ring RF Bias',
    priority: 'P1 - Immediate Intervention',
    targetEquipment: 'TEL-VIM-ETCH-04 / Chamber B',
    estDowntimeHours: 3.5,
    estYieldRecoveryPct: 14.8,
    costImpactSavingsMonthly: '$11.2M USD',
    actionSteps: [
      'Trigger automated MES SECS-GEM chamber lockout (Status -> MAINTENANCE_HOLD).',
      'Swap consumable edge ceramic focus ring (Serial: CR-8812-B).',
      'Run automatic 32-point RF impedance auto-matching tune recipe (DIAG_RF_TUNE_3NM).',
      'Execute 5-wafer qualification run with in-line spectroscopic reflectometry validation.'
    ],
    secsGemCommand: 'SECS_CMD_HOLD_TOOL(TEL-VIM-ETCH-04, REASON="S1_YIELD_EXCURSION_RC42")',
    status: 'Ready for Dispatch'
  },
  {
    id: 'ACT-LITHO-COLLECTOR-CLEAN',
    lotId: 'LOT-W3-9042',
    title: 'Schedule Scanner LITHO-02 Intermediate Collector Hydrogen Flush',
    priority: 'P2 - Scheduled Maintenance',
    targetEquipment: 'ASML-EXE-3600-02',
    estDowntimeHours: 1.5,
    estYieldRecoveryPct: 3.2,
    costImpactSavingsMonthly: '$2.4M USD',
    actionSteps: [
      'Schedule automated H2 plasma etch cycle on EUV collector optics during next lot boundary.',
      'Adjust ASML scanner dose recipe offset: +0.42 mJ/cm² compensation at field periphery.'
    ],
    secsGemCommand: 'SECS_CMD_SET_RECIPE_OFFSET(ASML-EXE-3600-02, PARAM="DOSE_TILT", VAL="-0.42")',
    status: 'Ready for Dispatch'
  },
  {
    id: 'ACT-ROBOT-REPLACE-BLADE',
    lotId: 'LOT-W3-9043',
    title: 'Immediate EFEM Robot 02 Lockout & Ceramic End-Effector Swap',
    priority: 'P1 - Immediate Intervention',
    targetEquipment: 'BROOKS-ATM-ROBOT-02',
    estDowntimeHours: 2.0,
    estYieldRecoveryPct: 12.5,
    costImpactSavingsMonthly: '$9.2M USD',
    actionSteps: [
      'Halt FOUP load port #2 transfer queue immediately.',
      'Inspect robot end-effector blade for micro-fractures under 200x optical scope.',
      'Replace blade assembly with certified spare (PN: EF-CERAMIC-300MM-V3).'
    ],
    secsGemCommand: 'SECS_CMD_HOLD_HANDLER(BROOKS-ATM-ROBOT-02)',
    status: 'Ready for Dispatch'
  },
  {
    id: 'ACT-RTA-QUARTZ-REPLACE',
    lotId: 'LOT-W5-7718',
    title: 'Replace RTA Pyrometer Viewing Quartz & Recalibrate Center Lamp Array',
    priority: 'P1 - Immediate Intervention',
    targetEquipment: 'MATTSON-HELIOS-RTA-01',
    estDowntimeHours: 4.0,
    estYieldRecoveryPct: 11.4,
    costImpactSavingsMonthly: '$6.8M USD',
    actionSteps: [
      'Cool heating chamber to 25°C and replace clouded viewport quartz window.',
      'Run NIST-traceable thermocouple wafer calibration run across 12 zones.'
    ],
    secsGemCommand: 'SECS_CMD_HOLD_TOOL(MATTSON-HELIOS-RTA-01, REASON="PYROMETER_CAL_FAIL")',
    status: 'Ready for Dispatch'
  }
];

// Pre-Flight Upcoming Batches (Predict which upcoming batches are at risk BEFORE they run)
export const UPCOMING_BATCHES = [
  {
    batchId: 'BATCH-B3-9104',
    scheduledRunTime: 'In 45 Mins (22:30 UTC)',
    node: '3nm GAAFET',
    product: 'Bob Tensor-X NPU (25 Wafers, Lot 104)',
    targetEquipment: 'TEL-VIM-ETCH-04 (Chamber B)',
    recipe: '3NM_LOGIC_ETCH_GATE_REV4.2',
    riskScore: 94,
    riskLevel: 'CRITICAL RISK',
    projectedYield: 76.2,
    projectedLoss: '$3.8M USD',
    riskFactors: [
      'Assigned to compromised chamber ETCH-04 (RF bias +28W drift currently unaddressed)',
      'ESC focus ring usage counter: 1,420 RF hours (exceeds 1,200 hr threshold)',
      'Historic correlation with Edge-Ring defect pattern: 94.6%'
    ],
    recommendation: 'HOLD BATCH & Reroute cassette to qualified standby tool ETCH-02',
    rerouteToolOptions: [
      { toolId: 'TEL-VIM-ETCH-02', healthScore: 98, projectedYield: 94.8, riskScore: 12 },
      { toolId: 'TEL-VIM-ETCH-05', healthScore: 92, projectedYield: 93.5, riskScore: 22 }
    ],
    status: 'AT RISK - HOLD RECOMMENDED'
  },
  {
    batchId: 'BATCH-B3-9108',
    scheduledRunTime: 'In 2.5 Hours (00:15 UTC)',
    node: '3nm GAAFET',
    product: 'Bob High-Density Ultra-SRAM (25 Wafers)',
    targetEquipment: 'AMAT-REFLEX-CMP-03 (Platen 2)',
    recipe: '3NM_CMP_POLY_REV2.8',
    riskScore: 78,
    riskLevel: 'HIGH RISK',
    projectedYield: 82.5,
    projectedLoss: '$2.1M USD',
    riskFactors: [
      'Zone 7 membrane retaining ring pressure fluctuating +0.65 psi',
      'Slurry filter differential pressure indicates partial particle clogging'
    ],
    recommendation: 'Apply +0.3 psi back-pressure compensation before cassette release',
    rerouteToolOptions: [
      { toolId: 'AMAT-REFLEX-CMP-01', healthScore: 97, projectedYield: 95.1, riskScore: 14 }
    ],
    status: 'AT RISK - INTERVENTION REQUIRED'
  },
  {
    batchId: 'BATCH-B5-8201',
    scheduledRunTime: 'In 4.0 Hours (01:45 UTC)',
    node: '5nm EUV FinFET',
    product: 'Bob EdgeCompute-5 Pro (Automotive ADAS)',
    targetEquipment: 'ASML-EXE-3600-01',
    recipe: '5NM_LITHO_EUV_M1_REV5',
    riskScore: 18,
    riskLevel: 'LOW RISK (CLEAR TO RUN)',
    projectedYield: 95.6,
    projectedLoss: '$0.0M USD',
    riskFactors: [
      'All 16 scanner sensors within ±0.4σ of golden model',
      'Optics transmission efficiency rated 99.2%'
    ],
    recommendation: 'Clear to proceed with normal recipe parameters',
    rerouteToolOptions: [],
    status: 'APPROVED FOR RELEASE'
  },
  {
    batchId: 'BATCH-B3-9112',
    scheduledRunTime: 'In 6.0 Hours (03:45 UTC)',
    node: '3nm GAAFET',
    product: 'Bob Mobile Flagship SoC (25 Wafers)',
    targetEquipment: 'MATTSON-HELIOS-RTA-01',
    recipe: '3NM_RTA_ANNEAL_REV4.0',
    riskScore: 68,
    riskLevel: 'MODERATE RISK',
    projectedYield: 85.0,
    projectedLoss: '$1.4M USD',
    riskFactors: [
      'Pyrometer sensor optical transparency showing 4.2% transmission drop',
      'Thermal gradient variance borderline yellow threshold'
    ],
    recommendation: 'Perform 15-minute sensor baseline validation run prior to cassette launch',
    rerouteToolOptions: [
      { toolId: 'MATTSON-HELIOS-RTA-02', healthScore: 96, projectedYield: 94.7, riskScore: 16 }
    ],
    status: 'PRE-FLIGHT CHECK PENDING'
  }
];
