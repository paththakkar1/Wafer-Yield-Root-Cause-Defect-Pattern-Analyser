🚀 Bob YieldAI • Wafer Yield Root Cause & Defect Pattern Analyser

TEAM NAME : KODE TITIANS 
TRACK : SEMICONDUCTOR 
TEAM LEADER: PATH THAKKAR - 24dce147@charusat.edu.in
TEAM MEMBERS : DHRUV , HETVI , VRUNDA 

🎯 Problem Statement


> **Hackathon Solution for Challenge: "Wafer Yield Root Cause & Defect Pattern Analyser" (Critical Now)**

At 3nm/5nm chip nodes, a 1% yield drop costs tens of millions per month. Root causes hide across thousands of equipment sensors, process parameters, and defect images. Engineers spend weeks finding the cause manually — every day of delay is lost revenue. Process engineers also need to predict which upcoming batches are at risk before they run, not after they fail.

**Bob YieldAI** is a comprehensive, production-grade semiconductor intelligence platform designed to automate root cause analysis, classify spatial defect patterns on 300mm silicon wafers, prescribe corrective action playbooks with 1-click MES interlocks, and pre-empt batch failures with a pre-flight risk guard.

---

## 🌟 Key Solution Pillars

### 1. Interactive 300mm Silicon Wafer Map & Die-Level Inspector
- **SEMI-Standard 300mm Geometry**: Precise circular substrate, 3mm edge exclusion ring, orientation notch, and >1,200 individual dies matching actual 3nm GAAFET reticle steppings.
- **Multiple Visualization Heatmaps**:
  - **Bin Status**: Good (Pass Bin 1), Marginal, Defective (Bin 7 Edge Leakage, Bin 9 Gate Short, Bin 4 Scratch, Bin 3 Thermal Void).
  - **Defect Density Heatmap** ($D_0$).
  - **Leakage Current Heatmap** ($I_{\text{leak}}$ in nA).
  - **Threshold Voltage Dispersion** ($V_{\text{th}}$ in Volts).
- **Interactive Die Inspection**: Real-time cursor coordinates $[g_x, g_y]$, physical coordinates $(X, Y \text{ mm})$, bin categorization, electrical test parameters, and instant High-Res SEM Review triggering.

### 2. Spatial Defect Pattern Classifier
- Detects classic semiconductor signatures using mathematical spatial analysis:
  - **Edge-Ring Excursion**: Concentric radial profile analysis isolating outer annular plasma non-uniformities.
  - **Robot Handling Scratch Arc**: Linear and parabolic trajectory clustering identifying end-effector particle abrasion.
  - **Center Cluster / Thermal Void**: Core stagnation detection ($r < 0.3R$) from RTA pyrometer drift or CVD gas recirculation.
  - **Donut / Mid-Annular Ring**: Mid-radius thermal slip line and spin-coater turbulence detection.
  - **Random Poisson Noise**: 6-sigma baseline control verification.
- **Moran's I Autocorrelation & Radial Mass Ratios**: Statistical metrics measuring spatial clustering vs random noise.

### 3. Probabilistic Root Cause Analysis (RCA) Engine
- **Bayesian Feature Attribution**: Ranks suspect tools and chambers across 10,000+ sensor streams by probability percentage ($P > F$), confidence intervals, and log-likelihood ratios.
- **Interactive Multi-Variate Sensor Telemetry**: Chart.js visualization comparing actual excursion run data against the golden baseline model with $\pm 3\sigma$ upper and lower specification limits (USL/LSL).
- **Physics-of-Failure Breakdown**: Detailed metallurgical and plasma physics explanations (e.g., electrostatic chuck ceramic erosion, EUV collector mirror contamination, CMP retaining ring pressure hysteresis).

### 4. Prescriptive Action Engine & 1-Click MES Interlocks
- **Actionable Engineering Playbooks**: Ranked by yield recovery (%) and ROI ($MM saved).
- **SECS-GEM Interlocks**: Automated generation and dispatch of SECS/GEM commands (e.g., `SECS_CMD_HOLD_TOOL`, `SECS_CMD_SET_RECIPE_OFFSET`) to immediately quarantine suspect chambers and prevent further scrap.

### 5. Pre-Flight Batch Risk Guard (Early Warning System)
- **Addresses the Critical Requirement**: *"predict which upcoming batches are at risk before they run, not after they fail"*.
- **Queued Batch Risk Gauges**: Evaluates scheduled lots in MES against historical sensor drift correlation before cassette release.
- **Interactive "What-If" Reroute Simulator**: Allows fab engineers to simulate rerouting cassettes to qualified standby chambers (e.g., rerouting Lot #B3-9104 from compromised ETCH-04 to healthy ETCH-02), instantly updating projected yield (+18.6% recovery) and protecting millions in wafer scrap.

### 6. Official 8D RCCA Engineering Report Generator
- 1-Click generation of formal semiconductor **8D (Eight Disciplines) Root Cause Corrective Action** engineering reports formatted for immediate PDF export or cleanroom printing, complete with engineering sign-off blocks.

---

## 📁 Repository Structure

```
├── index.html                      # Main web application dashboard
├── css/
│   └── styles.css                  # Semiconductor cleanroom HUD styling & animations
├── js/
│   ├── app.js                      # Application coordinator & event wiring
│   ├── sampleData.js               # 3nm/5nm wafer lots, die layouts, sensor logs, and queued batches
│   ├── waferCanvas.js              # High-performance 2D Canvas 300mm wafer engine
│   ├── patternDetector.js          # Spatial pattern classification & Moran's I autocorrelation
│   ├── rootCauseEngine.js          # Bayesian probability ranking & Chart.js telemetry
│   ├── predictiveBatchGuard.js     # Pre-flight batch risk scorer & What-If reroute simulator
│   └── reportGenerator.js          # Formal 8D RCCA engineering report generator
├── data/
│   └── sample_3nm_excursion.csv    # Sample wafer test CSV for file upload testing
└── README.md                       # Comprehensive documentation
```

---

## 🚀 How to Run

1. Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
   - Alternatively, serve via any static web server:
     ```bash
     npx serve .
     # or
     python -m http.server 8000
     ```
2. **Try out the Interactive Features**:
   - Switch between **3nm GAAFET** and **5nm EUV FinFET** lots using the top selectors.
   - Click dies on the wafer canvas to inspect electrical parameters and view high-resolution SEM defect micrographs.
   - Switch to the **RCA Engine** tab to review Bayesian root cause rankings and sensor drift curves.
   - Switch to the **Prescriptive Actions** tab to dispatch SECS-GEM chamber lockout commands.
   - Switch to the **Pre-Flight Batch Risk Guard** tab to test the **What-If Reroute Simulator** on scheduled lots before they run!
   - Click **Export 8D Report** in the top navigation to view the print-ready engineering RCCA report.