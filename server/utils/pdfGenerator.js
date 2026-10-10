const PDFDocument = require("pdfkit");

function generateReportPDF(prediction, res) {
  const doc = new PDFDocument({ 
    margin: 50, 
    size: "A4",
    bufferPages: true 
  });

  // Stream output directly to HTTP response stream
  doc.pipe(res);

  // Brand Palette
  const primaryColor = "#0f4c81";   // Deep Clinical Blue
  const secondaryColor = "#0d9488"; // Teal Accent
  const darkTextColor = "#1e293b";   // Slate Main Text
  const mutedTextColor = "#64748b";  // Secondary Muted Slate
  const lightGrey = "#f8fafc";       // Card Background
  const borderGrey = "#e2e8f0";      // Divider Lines
  const infoBg = "#f0f9ff";          // Soft Blue Info Box
  const infoBorder = "#bae6fd";

  let accentColor = "#10b981"; // Green for Low risk
  if (prediction.riskLevel === "Medium") {
    accentColor = "#f59e0b"; // Amber
  } else if (prediction.riskLevel === "High") {
    accentColor = "#ef4444"; // Red
  }

  // Safe feature getter helper
  const getFeatureVal = (key) => {
    if (!prediction.features) return undefined;
    if (typeof prediction.features.get === "function") {
      return prediction.features.get(key);
    }
    return prediction.features[key];
  };

  const formatNum = (val, decimals = 2, unit = "") => {
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) return "N/A";
    return `${val.toFixed(decimals)}${unit ? " " + unit : ""}`;
  };

  const checkPageOverflow = (neededHeight) => {
    if (currentY + neededHeight > 730) {
      doc.addPage();
      currentY = 50;
      // Header for overflow page
      doc.rect(0, 0, 595.28, 35).fill(primaryColor);
      doc.fillColor("#ffffff")
         .fontSize(10)
         .font("Helvetica-Bold")
         .text("YOUR VOICE ASSESSMENT REPORT (Continued)", 50, 12);
      currentY = 55;
    }
  };

  // --- SECTION A: REPORT HEADER ---
  doc.rect(0, 0, 595.28, 110).fill(primaryColor);
  doc.fillColor("#ffffff")
     .fontSize(20)
     .font("Helvetica-Bold")
     .text("YOUR VOICE ASSESSMENT REPORT", 50, 30);
  doc.fontSize(10)
     .font("Helvetica")
     .text("Personal Vocal Acoustic Summary & Research Pattern Analysis", 50, 58);
  
  const assessmentDate = prediction.createdAt 
    ? new Date(prediction.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleDateString("en-US");

  doc.fontSize(8.5)
     .text(`Report Reference ID: ${prediction._id}   |   Assessment Date: ${assessmentDate}`, 50, 82);

  let currentY = 125;

  // --- SECTION B: PATIENT & ASSESSMENT SUMMARY ---
  doc.fillColor(darkTextColor).fontSize(12).font("Helvetica-Bold").text("1. Assessment Overview", 50, currentY);
  doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).strokeColor(borderGrey).stroke();
  currentY += 25;

  const patientName = prediction.user?.name || "Participant / Patient";
  const patientEmail = prediction.user?.email || "Not Provided";

  doc.fontSize(9.5).font("Helvetica");
  doc.text(`Patient Name: ${patientName}`, 50, currentY);
  doc.text(`Email Address: ${patientEmail}`, 300, currentY);
  currentY += 22;

  // Summary Outcome Card
  doc.rect(50, currentY, 495, 75).fill(lightGrey);
  doc.rect(50, currentY, 6, 75).fill(accentColor);

  doc.fillColor(darkTextColor).fontSize(10).font("Helvetica-Bold").text("Pattern Assessment Outcome", 68, currentY + 12);
  doc.fontSize(16).fillColor(accentColor).font("Helvetica-Bold").text(`${prediction.riskLevel} Risk Classification`, 68, currentY + 28);
  doc.fontSize(9).fillColor(mutedTextColor).font("Helvetica").text("Automated voice sample evaluation", 68, currentY + 50);

  const confidenceScore = typeof prediction.confidence === "number" ? prediction.confidence.toFixed(1) : "N/A";
  doc.fillColor(darkTextColor).fontSize(10).font("Helvetica-Bold").text(`Model Confidence: ${confidenceScore}%`, 320, currentY + 14);
  doc.fontSize(8).fillColor(mutedTextColor).font("Helvetica").text("Matches synthetic benchmark patterns", 320, currentY + 30, { width: 210 });
  currentY += 88;

  // Non-diagnostic explanation box
  doc.rect(50, currentY, 495, 46).fill(infoBg);
  doc.rect(50, currentY, 495, 46).strokeColor(infoBorder).stroke();
  
  doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("Important Note on Confidence Score:", 60, currentY + 8);
  doc.fillColor(darkTextColor).fontSize(8).font("Helvetica").text(
    "A computer program evaluated acoustic micro-patterns in your voice recording. The confidence score reflects statistical pattern similarity to research dataset samples. It is NOT a person's clinical probability of having Parkinson's disease and is NOT a medical diagnosis.",
    60, currentY + 20, { width: 475, align: "justify" }
  );
  currentY += 58;

  // --- SECTION C: VISUAL VOICE SUMMARY & GRAPHICAL ANALYSIS ---
  checkPageOverflow(210);

  doc.fillColor(darkTextColor).fontSize(12).font("Helvetica-Bold").text("2. Graphical Acoustic Voice Analysis", 50, currentY);
  doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).strokeColor(borderGrey).stroke();
  currentY += 25;

  doc.fontSize(8.5).font("Helvetica").fillColor(mutedTextColor).text(
    "The charts below visualize your measured vocal parameters. Every value is derived directly from your recording and is presented with clear acoustic units.",
    50, currentY, { width: 495 }
  );
  currentY += 20;

  // CHART 1: VOICE PITCH CHART
  const foVal = getFeatureVal("fo");
  const floVal = getFeatureVal("flo");
  const fhiVal = getFeatureVal("fhi");

  const drawPitchChart = () => {
    const chartHeight = 70;
    checkPageOverflow(chartHeight + 15);

    doc.rect(50, currentY, 495, chartHeight).fill(lightGrey);
    doc.rect(50, currentY, 495, chartHeight).strokeColor(borderGrey).stroke();

    doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text("Chart 1: Voice Pitch Range & Average (Hz)", 62, currentY + 8);
    doc.fillColor(mutedTextColor).fontSize(7.5).font("Helvetica").text("Pitch describes how high or low a voice sounds in vibrations per second (Hz).", 62, currentY + 20);

    if (typeof foVal === "number" && typeof floVal === "number" && typeof fhiVal === "number" && !isNaN(foVal) && !isNaN(floVal) && !isNaN(fhiVal)) {
      const minScale = Math.max(0, Math.floor(floVal * 0.8));
      const maxScale = Math.ceil(fhiVal * 1.2);
      const rangeSpan = Math.max(1, maxScale - minScale);

      const barStartX = 72;
      const barWidth = 350;
      const barY = currentY + 44;

      const getX = (val) => barStartX + ((Math.min(Math.max(val, minScale), maxScale) - minScale) / rangeSpan) * barWidth;

      const xFlo = getX(floVal);
      const xFhi = getX(fhiVal);
      const xFo = getX(foVal);

      // Range Track background line
      doc.rect(barStartX, barY + 3, barWidth, 6).fill("#e2e8f0");
      // Active Pitch Range bar (Flo to Fhi)
      const activeW = Math.max(4, xFhi - xFlo);
      doc.rect(xFlo, barY + 3, activeW, 6).fill(secondaryColor);

      // Min Pitch Marker (Flo)
      doc.circle(xFlo, barY + 6, 4).fill(primaryColor);
      doc.fillColor(darkTextColor).fontSize(7.5).font("Helvetica").text(`Min: ${floVal.toFixed(1)} Hz`, xFlo - 15, barY + 12);

      // Max Pitch Marker (Fhi)
      doc.circle(xFhi, barY + 6, 4).fill(primaryColor);
      doc.fillColor(darkTextColor).fontSize(7.5).font("Helvetica").text(`Max: ${fhiVal.toFixed(1)} Hz`, xFhi - 15, barY + 12);

      // Average Pitch Marker (Fo)
      doc.circle(xFo, barY + 6, 6).fill(accentColor);
      doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text(`Avg: ${foVal.toFixed(1)} Hz`, xFo - 20, barY - 12);
    } else {
      doc.fillColor(mutedTextColor).fontSize(8.5).font("Helvetica").text("Pitch measurements unavailable for graphical display.", 62, currentY + 38);
    }

    currentY += chartHeight + 12;
  };

  drawPitchChart();

  // CHART 2: VOICE CONSISTENCY CHART (JITTER & SHIMMER)
  const jitVal = getFeatureVal("jitter_local");
  const shimVal = getFeatureVal("shimmer_local");

  const drawConsistencyChart = () => {
    const chartHeight = 75;
    checkPageOverflow(chartHeight + 15);

    doc.rect(50, currentY, 495, chartHeight).fill(lightGrey);
    doc.rect(50, currentY, 495, chartHeight).strokeColor(borderGrey).stroke();

    doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text("Chart 2: Voice Consistency Metrics (Pitch vs. Volume Variations)", 62, currentY + 8);
    doc.fillColor(mutedTextColor).fontSize(7.5).font("Helvetica").text("Measures microscopic variations in vibration frequency (jitter) and volume (shimmer). Plotted on separate scales.", 62, currentY + 20);

    const barStartX = 180;
    const barMaxWidth = 230;

    // Jitter Bar (0 to 3%)
    const jitY = currentY + 34;
    doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text("Jitter (Pitch Var %):", 62, jitY + 2);
    doc.rect(barStartX, jitY, barMaxWidth, 10).fill("#e2e8f0");
    if (typeof jitVal === "number" && !isNaN(jitVal)) {
      const jitPct = jitVal * 100;
      const w = Math.min(barMaxWidth, (jitPct / 3.0) * barMaxWidth);
      doc.rect(barStartX, jitY, Math.max(2, w), 10).fill(primaryColor);
      doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text(`${jitPct.toFixed(2)}%`, barStartX + Math.max(2, w) + 8, jitY + 1);
    } else {
      doc.fillColor(mutedTextColor).fontSize(8).font("Helvetica").text("N/A", barStartX + 8, jitY + 1);
    }

    // Shimmer Bar (0 to 10%)
    const shimY = currentY + 52;
    doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text("Shimmer (Volume Var %):", 62, shimY + 2);
    doc.rect(barStartX, shimY, barMaxWidth, 10).fill("#e2e8f0");
    if (typeof shimVal === "number" && !isNaN(shimVal)) {
      const shimPct = shimVal * 100;
      const w = Math.min(barMaxWidth, (shimPct / 10.0) * barMaxWidth);
      doc.rect(barStartX, shimY, Math.max(2, w), 10).fill(secondaryColor);
      doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text(`${shimPct.toFixed(2)}%`, barStartX + Math.max(2, w) + 8, shimY + 1);
    } else {
      doc.fillColor(mutedTextColor).fontSize(8).font("Helvetica").text("N/A", barStartX + 8, shimY + 1);
    }

    currentY += chartHeight + 12;
  };

  drawConsistencyChart();

  // CHART 3: SOUND CHARACTERISTICS CHART (HNR & NHR)
  const hnrVal = getFeatureVal("hnr");
  const nhrVal = getFeatureVal("nhr");

  const drawClarityChart = () => {
    const chartHeight = 70;
    checkPageOverflow(chartHeight + 15);

    doc.rect(50, currentY, 495, chartHeight).fill(lightGrey);
    doc.rect(50, currentY, 495, chartHeight).strokeColor(borderGrey).stroke();

    doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text("Chart 3: Sound Clarity (Harmonics-to-Noise Ratio)", 62, currentY + 8);
    doc.fillColor(mutedTextColor).fontSize(7.5).font("Helvetica").text("Compares clear, resonant vocal cord sound against breathy background air noise.", 62, currentY + 20);

    const barStartX = 180;
    const barMaxWidth = 230;
    const hnrY = currentY + 34;

    doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text("Harmonics / Noise (HNR):", 62, hnrY + 2);
    doc.rect(barStartX, hnrY, barMaxWidth, 10).fill("#e2e8f0");

    if (typeof hnrVal === "number" && !isNaN(hnrVal)) {
      const w = Math.min(barMaxWidth, Math.max(2, (hnrVal / 35.0) * barMaxWidth));
      doc.rect(barStartX, hnrY, w, 10).fill(primaryColor);
      doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text(`${hnrVal.toFixed(1)} dB`, barStartX + w + 8, hnrY + 1);
    } else {
      doc.fillColor(mutedTextColor).fontSize(8).font("Helvetica").text("N/A", barStartX + 8, hnrY + 1);
    }

    let nhrStr = "N/A";
    if (typeof nhrVal === "number" && !isNaN(nhrVal)) {
      nhrStr = nhrVal.toFixed(4);
    }
    doc.fillColor(mutedTextColor).fontSize(8).font("Helvetica").text(`Noise-to-Harmonics Ratio (NHR): ${nhrStr} ratio`, 62, currentY + 52);

    currentY += chartHeight + 12;
  };

  drawClarityChart();

  // --- SECTION D: PLAIN-ENGLISH EXPLANATIONS ---
  checkPageOverflow(180);

  doc.fillColor(darkTextColor).fontSize(12).font("Helvetica-Bold").text("3. Understanding Your Acoustic Measurements", 50, currentY);
  doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).strokeColor(borderGrey).stroke();
  currentY += 25;

  const explanations = [
    {
      term: "Pitch (Fundamental Frequency)",
      measured: "How fast your vocal cords vibrate while speaking.",
      means: "Determines whether a voice sounds higher or lower in tone.",
      cannot: "Does not indicate vocal health or physical muscle strength on its own."
    },
    {
      term: "Jitter (Frequency Variation)",
      measured: "Tiny timing differences between consecutive vocal cord vibrations.",
      means: "Normal voices have slight natural frequency jitter during speech.",
      cannot: "Higher or lower jitter cannot prove or rule out any neurological condition."
    },
    {
      term: "Shimmer (Loudness Variation)",
      measured: "Microscopic changes in vocal loudness/volume from cycle to cycle.",
      means: "Reflects how smoothly vocal cord breath pressure is maintained.",
      cannot: "Cannot diagnose vocal cord strain, fatigue, or medical illness."
    },
    {
      term: "Harmonics-to-Noise Ratio (HNR)",
      measured: "The proportion of clear vocal tone relative to breathy noise.",
      means: "Higher HNR indicates a crisp, clear voice; lower HNR reflects breathiness.",
      cannot: "Cannot determine the medical cause of a raspy or hoarse voice."
    },
    {
      term: "Acoustic Entropy & Complexity (PPE / RPDE / D2)",
      measured: "Mathematical measures of pitch variations and signal patterns.",
      means: "Summarizes the mathematical complexity and regularity of the sound wave.",
      cannot: "Statistical entropy values do not describe physical symptoms or disease severity."
    }
  ];

  explanations.forEach((exp) => {
    checkPageOverflow(48);

    doc.rect(50, currentY, 495, 42).fill(lightGrey);
    doc.rect(50, currentY, 495, 42).strokeColor(borderGrey).stroke();

    doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text(exp.term, 60, currentY + 6);
    doc.fillColor(darkTextColor).fontSize(7.5).font("Helvetica");
    doc.text(`• What was measured: ${exp.measured}`, 60, currentY + 18, { width: 475 });
    doc.text(`• What it means: ${exp.means}`, 60, currentY + 28, { width: 475 });

    currentY += 47;
  });

  // --- SECTION E: WHAT HAPPENS NEXT? ---
  checkPageOverflow(120);

  doc.fillColor(darkTextColor).fontSize(12).font("Helvetica-Bold").text("4. Recommended Next Steps & Guidance", 50, currentY);
  doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).strokeColor(borderGrey).stroke();
  currentY += 25;

  const nextSteps = [
    "• Optional Re-Recording: If you recorded in a noisy room, near background appliances, or far from your microphone, consider re-testing in a quiet space for optimal audio clarity.",
    "• Consult a Medical Professional: Share this report with a qualified physician or neurologist if you have concerns about your voice, speech clarity, motor control, or overall health.",
    "• Research Application Notice: This experimental screening tool provides acoustic pattern evaluation. Do not use this report to self-diagnose, change medical treatments, or rule out disease."
  ];

  nextSteps.forEach((step) => {
    checkPageOverflow(26);
    doc.fillColor(darkTextColor).fontSize(8.5).font("Helvetica").text(step, 50, currentY, { width: 495, align: "justify", lineGap: 2 });
    currentY += 26;
  });
  currentY += 10;

  // --- SECTION F: PROMINENT SCIENTIFIC DISCLAIMER ---
  checkPageOverflow(75);

  doc.rect(50, currentY, 495, 60).fill("#fffaf0");
  doc.rect(50, currentY, 495, 60).strokeColor("#feebc8").stroke();
  
  doc.fillColor("#c05621")
     .fontSize(8.5)
     .font("Helvetica-Bold")
     .text("MANDATORY CLINICAL DISCLAIMER & NOTICE", 62, currentY + 8);

  doc.fillColor(darkTextColor)
     .fontSize(8)
     .font("Helvetica")
     .text(
       "This report summarizes acoustic measurements from a voice recording and an experimental machine-learning output. The system has not been established as a clinically validated test for Parkinson's disease. It cannot diagnose or rule out a condition or determine disease progression. Please consult a qualified healthcare professional about health concerns.",
       62,
       currentY + 22,
       { width: 470, align: "justify" }
     );
  currentY += 72;

  // --- SECTION G: COMPACT TECHNICAL APPENDIX & APPENDIX CHART ---
  checkPageOverflow(180);

  doc.fillColor(darkTextColor).fontSize(12).font("Helvetica-Bold").text("Appendix: Technical Reference & Full Biomarker Metrics", 50, currentY);
  doc.moveTo(50, currentY + 15).lineTo(545, currentY + 15).strokeColor(borderGrey).stroke();
  currentY += 25;

  doc.fontSize(8).font("Helvetica").fillColor(mutedTextColor).text(
    "This appendix contains raw high-precision acoustic metrics, feature Z-scores, and machine learning pipeline specifications for clinical transparency.",
    50, currentY, { width: 495 }
  );
  currentY += 18;

  // CHART 4: GLOBAL FEATURE IMPORTANCE CHART (TECHNICAL APPENDIX)
  const drawFeatureImportanceChart = () => {
    if (!prediction.globalFeatureImportances || typeof prediction.globalFeatureImportances !== "object") return;
    const entries = Object.entries(prediction.globalFeatureImportances)
      .filter(([_, v]) => typeof v === "number" && !isNaN(v) && v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (entries.length === 0) return;

    const chartHeight = 45 + entries.length * 16;
    checkPageOverflow(chartHeight + 15);

    doc.rect(50, currentY, 495, chartHeight).fill(lightGrey);
    doc.rect(50, currentY, 495, chartHeight).strokeColor(borderGrey).stroke();

    doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text("Chart 4: Global Model Feature Importances (Training Weights)", 62, currentY + 8);
    doc.fillColor(mutedTextColor).fontSize(7.5).font("Helvetica").text("Global feature importance describes overall model training weights across the benchmark dataset, NOT a causal explanation for this specific individual assessment.", 62, currentY + 20, { width: 470 });

    const maxImp = Math.max(...entries.map(e => e[1])) || 1.0;
    const barStartX = 180;
    const barMaxWidth = 230;
    let entryY = currentY + 36;

    entries.forEach(([featKey, impVal]) => {
      checkPageOverflow(16);
      const w = Math.max(4, (impVal / maxImp) * barMaxWidth);
      const pctStr = `${(impVal * 100).toFixed(1)}%`;

      doc.fillColor(darkTextColor).fontSize(8).font("Helvetica-Bold").text(featKey.toUpperCase(), 62, entryY + 1);
      doc.rect(barStartX, entryY, barMaxWidth, 9).fill("#e2e8f0");
      doc.rect(barStartX, entryY, w, 9).fill(primaryColor);
      doc.fillColor(darkTextColor).fontSize(7.5).font("Helvetica").text(pctStr, barStartX + w + 6, entryY);

      entryY += 16;
    });

    currentY += chartHeight + 12;
  };

  drawFeatureImportanceChart();

  // Table Header for Full Biomarkers
  checkPageOverflow(180);
  doc.rect(50, currentY, 495, 18).fill(primaryColor);
  doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold");
  doc.text("Acoustic Biomarker", 60, currentY + 4);
  doc.text("Raw Value", 220, currentY + 4);
  doc.text("Unit", 330, currentY + 4);
  doc.text("Standard Label", 420, currentY + 4);
  currentY += 18;

  const featureDefinitions = [
    { key: "fo", label: "Fundamental Frequency (Fo)", unit: "Hz", code: "MDVP:Fo" },
    { key: "fhi", label: "Maximum Frequency (Fhi)", unit: "Hz", code: "MDVP:Fhi" },
    { key: "flo", label: "Minimum Frequency (Flo)", unit: "Hz", code: "MDVP:Flo" },
    { key: "jitter_local", label: "Jitter (Local)", unit: "ratio", code: "MDVP:Jitter(%)" },
    { key: "jitter_abs", label: "Jitter (Absolute)", unit: "seconds", code: "MDVP:Jitter(Abs)" },
    { key: "jitter_rap", label: "Jitter (RAP)", unit: "ratio", code: "MDVP:RAP" },
    { key: "jitter_ppq5", label: "Jitter (PPQ5)", unit: "ratio", code: "MDVP:PPQ" },
    { key: "jitter_ddp", label: "Jitter (DDP)", unit: "ratio", code: "Jitter:DDP" },
    { key: "shimmer_local", label: "Shimmer (Local)", unit: "ratio", code: "MDVP:Shimmer" },
    { key: "shimmer_db", label: "Shimmer (dB)", unit: "dB", code: "MDVP:Shimmer(dB)" },
    { key: "shimmer_apq3", label: "Shimmer (APQ3)", unit: "ratio", code: "Shimmer:APQ3" },
    { key: "shimmer_apq5", label: "Shimmer (APQ5)", unit: "ratio", code: "Shimmer:APQ5" },
    { key: "shimmer_apq11", label: "Shimmer (APQ11)", unit: "ratio", code: "MDVP:APQ" },
    { key: "shimmer_dda", label: "Shimmer (DDA)", unit: "ratio", code: "Shimmer:DDA" },
    { key: "hnr", label: "Harmonics-to-Noise Ratio", unit: "dB", code: "HNR" },
    { key: "nhr", label: "Noise-to-Harmonics Ratio", unit: "ratio", code: "NHR" },
    { key: "dfa", label: "Detrended Fluctuation", unit: "exponent", code: "DFA" },
    { key: "rpde", label: "Recurrence Period Density", unit: "entropy", code: "RPDE" },
    { key: "ppe", label: "Pitch Period Entropy", unit: "entropy", code: "PPE" },
    { key: "spread1", label: "Frequency Spread 1", unit: "scale", code: "Spread1" },
    { key: "spread2", label: "Frequency Spread 2", unit: "scale", code: "Spread2" },
    { key: "d2", label: "Correlation Dimension", unit: "dimension", code: "D2" }
  ];

  featureDefinitions.forEach((feat, idx) => {
    checkPageOverflow(16);

    if (idx % 2 === 0) doc.rect(50, currentY, 495, 16).fill(lightGrey);
    
    const rawVal = getFeatureVal(feat.key);
    let valStr = "N/A";
    if (typeof rawVal === "number" && !isNaN(rawVal)) {
      valStr = rawVal.toFixed(6);
    }

    doc.fillColor(darkTextColor).fontSize(7.5).font("Helvetica");
    doc.text(feat.label, 60, currentY + 3);
    doc.font("Helvetica-Bold").text(valStr, 220, currentY + 3);
    doc.font("Helvetica").fillColor(mutedTextColor).text(feat.unit, 330, currentY + 3);
    doc.text(feat.code, 420, currentY + 3);

    doc.moveTo(50, currentY + 16).lineTo(545, currentY + 16).strokeColor(borderGrey).stroke();
    currentY += 16;
  });

  currentY += 15;

  // Pipeline & Model Details
  checkPageOverflow(70);
  doc.fillColor(darkTextColor).fontSize(9).font("Helvetica-Bold").text("Pipeline & Model Specifications:", 50, currentY);
  currentY += 14;

  const pipelineText = 
    `• Model Classifier Version: ${prediction.modelVersion || "1.0.0"} (Random Forest with StandardScaler)\n` +
    `• Praat Parselmouth Audio Engine: 16kHz mono resampling, top_db=20 noise trimming\n` +
    `• Synthetic Benchmark Notice: Classifier was trained on synthetic benchmark acoustic metrics. Performance metrics on synthetic data do not establish clinical accuracy.`;

  doc.fontSize(7.5).font("Helvetica").fillColor(darkTextColor).text(pipelineText, 50, currentY, { width: 495, lineGap: 3 });

  // Add Page Numbers on all buffered pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor("#94a3b8")
       .text(
         `Page ${i + 1} of ${totalPages}   |   Your Voice Assessment Report   |   Ref: ${prediction._id}`,
         50,
         780,
         { align: "center", width: 495 }
       );
  }

  doc.end();
}

module.exports = { generateReportPDF };


