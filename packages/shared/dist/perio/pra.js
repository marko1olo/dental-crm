import { calculateBoneLossAgeRatio, calculatePerioIndices, estimateBoneLossPercentFromTeeth, } from "./math.js";
/**
 * Computes Lang & Tonetti (2003) Periodontal Risk Assessment (PRA) Spider Diagram across 6 vectors:
 * 1. BOP % (Bleeding on Probing)
 * 2. Residual pockets PPD >= 5mm count
 * 3. Tooth loss (Missing teeth)
 * 4. Bone Loss / Age ratio (BL/Age)
 * 5. Systemic / Genetic factor (Diabetes HbA1c)
 * 6. Environmental factor (Smoking cigarettes/day)
 */
export function calculatePeriodontalRiskAssessment(input) {
    const currentSummary = input.summary ?? calculatePerioIndices(input.teeth);
    const missingTeethCount = input.teeth.filter((t) => t.isMissing).length;
    const age = input.patientAgeYears ?? 45;
    const boneLoss = input.radiographicBoneLossPercent ??
        estimateBoneLossPercentFromTeeth(input.teeth, currentSummary.maxCalMm);
    const blAgeRatio = calculateBoneLossAgeRatio(boneLoss, age);
    const smoking = input.smokingStatus ?? "non_smoker";
    const diabetes = input.diabetesStatus ?? "none";
    // 1. Vector: BOP % (Bleeding on Probing)
    // Low: <= 9% (score ~0.25)
    // Moderate: 10% - 25% (score ~0.60)
    // High: > 25% (score ~0.95)
    const bopVal = currentSummary.fmbsPercent;
    let bopRisk = "low";
    let bopScore = 0.25;
    if (bopVal > 25) {
        bopRisk = "high";
        bopScore = Math.min(1.0, 0.65 + (bopVal / 100) * 0.35);
    }
    else if (bopVal >= 10) {
        bopRisk = "moderate";
        bopScore = 0.35 + ((bopVal - 10) / 15) * 0.3;
    }
    else {
        bopScore = Math.max(0.1, (bopVal / 10) * 0.3);
    }
    const vectorBop = {
        nameRu: "Кровоточивость (BOP %)",
        shortName: "BOP %",
        valueDisplay: `${bopVal}%`,
        numericValue: bopVal,
        riskLevel: bopRisk,
        thresholdDescriptionRu: "Норма: ≤ 9% | Умеренно: 10-25% | Высокий: > 25%",
        scoreNormalized: bopScore,
    };
    // 2. Vector: Residual Pockets with PPD >= 5mm count
    // Low: <= 4 sites
    // Moderate: 5 - 8 sites
    // High: >= 9 sites
    const deepPocketsCount = currentSummary.deepPocketsCount;
    let pocketsRisk = "low";
    let pocketsScore = 0.2;
    if (deepPocketsCount >= 9) {
        pocketsRisk = "high";
        pocketsScore = Math.min(1.0, 0.65 + Math.min(1, deepPocketsCount / 20) * 0.35);
    }
    else if (deepPocketsCount >= 5) {
        pocketsRisk = "moderate";
        pocketsScore = 0.35 + ((deepPocketsCount - 4) / 4) * 0.3;
    }
    else {
        pocketsScore = Math.max(0.1, (deepPocketsCount / 4) * 0.3);
    }
    const vectorDeepPockets = {
        nameRu: "Карманы PPD ≥ 5 мм",
        shortName: "PPD ≥ 5мм",
        valueDisplay: `${deepPocketsCount} уч.`,
        numericValue: deepPocketsCount,
        riskLevel: pocketsRisk,
        thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5-8 | Высокий: ≥ 9 участков",
        scoreNormalized: pocketsScore,
    };
    // 3. Vector: Tooth Loss (Missing teeth count out of 28)
    // Low: <= 4 missing
    // Moderate: 5 - 8 missing
    // High: > 8 missing
    let toothLossRisk = "low";
    let toothLossScore = 0.2;
    if (missingTeethCount > 8) {
        toothLossRisk = "high";
        toothLossScore = Math.min(1.0, 0.65 + Math.min(1, missingTeethCount / 16) * 0.35);
    }
    else if (missingTeethCount >= 5) {
        toothLossRisk = "moderate";
        toothLossScore = 0.35 + ((missingTeethCount - 4) / 4) * 0.3;
    }
    else {
        toothLossScore = Math.max(0.1, (missingTeethCount / 4) * 0.3);
    }
    const vectorToothLoss = {
        nameRu: "Потеря зубов (Missing)",
        shortName: "Потеря зубов",
        valueDisplay: `${missingTeethCount} шт.`,
        numericValue: missingTeethCount,
        riskLevel: toothLossRisk,
        thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5-8 | Высокий: > 8 зубов",
        scoreNormalized: toothLossScore,
    };
    // 4. Vector: Bone Loss / Age ratio (BL/Age)
    // Low: < 0.5 (Grade A)
    // Moderate: 0.5 - 1.0 (Grade B)
    // High: > 1.0 (Grade C)
    let blAgeRisk = "low";
    let blAgeScore = 0.2;
    if (blAgeRatio > 1.0) {
        blAgeRisk = "high";
        blAgeScore = Math.min(1.0, 0.65 + Math.min(1, (blAgeRatio - 1.0) / 1.0) * 0.35);
    }
    else if (blAgeRatio >= 0.5) {
        blAgeRisk = "moderate";
        blAgeScore = 0.35 + ((blAgeRatio - 0.5) / 0.5) * 0.3;
    }
    else {
        blAgeScore = Math.max(0.1, (blAgeRatio / 0.5) * 0.3);
    }
    const vectorBlAge = {
        nameRu: "Костная потеря / Возраст (BL/Age)",
        shortName: "BL / Возраст",
        valueDisplay: `${blAgeRatio} (${boneLoss}% / ${age}л)`,
        numericValue: blAgeRatio,
        riskLevel: blAgeRisk,
        thresholdDescriptionRu: "Низкий: < 0.5 | Средний: 0.5-1.0 | Высокий: > 1.0 (AAP 2018)",
        scoreNormalized: blAgeScore,
    };
    // 5. Vector: Systemic / Genetic factor (Diabetes HbA1c)
    let diabetesRisk = "low";
    let diabetesScore = 0.2;
    let diabetesDisplay = "Нет (норма)";
    if (diabetes === "uncontrolled") {
        diabetesRisk = "high";
        diabetesScore = 0.9;
        diabetesDisplay = "СД декомпенс. (>7%)";
    }
    else if (diabetes === "controlled") {
        diabetesRisk = "moderate";
        diabetesScore = 0.55;
        diabetesDisplay = "СД компенс. (6-7%)";
    }
    const vectorDiabetes = {
        nameRu: "Системный фактор (Сахарный диабет)",
        shortName: "Диабет (HbA1c)",
        valueDisplay: diabetesDisplay,
        numericValue: diabetes === "uncontrolled" ? 2 : diabetes === "controlled" ? 1 : 0,
        riskLevel: diabetesRisk,
        thresholdDescriptionRu: "Низкий: Нет | Средний: HbA1c 6.0-7.0% | Высокий: HbA1c > 7.0%",
        scoreNormalized: diabetesScore,
    };
    // 6. Vector: Environmental factor (Smoking / Cigarettes per day)
    let smokingRisk = "low";
    let smokingScore = 0.2;
    let smokingDisplay = "Не курит";
    if (smoking === "heavy") {
        smokingRisk = "high";
        smokingScore = 0.9;
        smokingDisplay = "> 10 сигарет/день";
    }
    else if (smoking === "light") {
        smokingRisk = "moderate";
        smokingScore = 0.55;
        smokingDisplay = "≤ 10 сигарет/день";
    }
    const vectorSmoking = {
        nameRu: "Фактор среды (Табакокурение)",
        shortName: "Курение",
        valueDisplay: smokingDisplay,
        numericValue: smoking === "heavy" ? 2 : smoking === "light" ? 1 : 0,
        riskLevel: smokingRisk,
        thresholdDescriptionRu: "Низкий: Не курит | Средний: ≤ 10 сигарет/день | Высокий: > 10 сигарет/день",
        scoreNormalized: smokingScore,
    };
    const allVectors = [
        vectorBop,
        vectorDeepPockets,
        vectorToothLoss,
        vectorBlAge,
        vectorDiabetes,
        vectorSmoking,
    ];
    let highCount = 0;
    let moderateCount = 0;
    let lowCount = 0;
    for (const v of allVectors) {
        if (v.riskLevel === "high")
            highCount++;
        else if (v.riskLevel === "moderate")
            moderateCount++;
        else
            lowCount++;
    }
    let overallRisk = "low";
    let overallRiskLabelRu = "Низкий риск (благоприятный прогноз)";
    if (highCount >= 2) {
        overallRisk = "high";
        overallRiskLabelRu = "ВЫСОКИЙ РИСК (прогрессирование пародонтита и потеря зубов)";
    }
    else if (moderateCount >= 2 || highCount === 1) {
        overallRisk = "moderate";
        overallRiskLabelRu = "СРЕДНИЙ РИСК (требуется активная пародонтальная терапия)";
    }
    // Calculate 6-axis Radar Polygon Coordinates for standard 300x300 SVG
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 115;
    const minRadius = 15;
    const coords = allVectors.map((v, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        const r = minRadius + v.scoreNormalized * (maxRadius - minRadius);
        const x = Math.round(centerX + r * Math.cos(angle));
        const y = Math.round(centerY + r * Math.sin(angle));
        return { x, y };
    });
    const radarPolygonPoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
    return {
        overallRisk,
        overallRiskLabelRu,
        highRiskVectorsCount: highCount,
        moderateRiskVectorsCount: moderateCount,
        lowRiskVectorsCount: lowCount,
        vectors: {
            bop: vectorBop,
            deepPockets: vectorDeepPockets,
            toothLoss: vectorToothLoss,
            boneLossAgeRatio: vectorBlAge,
            systemicDiabetes: vectorDiabetes,
            environmentalSmoking: vectorSmoking,
        },
        radarPolygonPoints,
        radarPolygonCoordinates: coords,
    };
}
