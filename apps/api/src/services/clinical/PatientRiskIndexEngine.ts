/**
 * PatientRiskIndexEngine.ts — Движок оценки соматического риска пациента.
 * Оценивает риски перед хирургическим вмешательством, включая:
 * - Сердечно-сосудистые заболевания (ССЗ).
 * - Прием антикоагулянтов/дезагрегантов.
 * - Декомпенсированный сахарный диабет.
 * - Аллергоанамнез.
 * - Остеопороз / прием бисфосфонатов.
 *
 * Категории риска: low, moderate, high, critical.
 */

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface PatientHealthAnamnesis {
  hasCardiovascularDisease: boolean;
  isTakingAnticoagulants: boolean;
  isTakingAntiplatelets: boolean;
  hasDiabetes: boolean;
  isDiabetesDecompensated: boolean;
  hasAllergies: boolean;
  hasOsteoporosis: boolean;
  isTakingBisphosphonates: boolean;
}

export interface RiskAlert {
  type: "bleeding" | "osteonecrosis" | "cardiac" | "allergy";
  level: RiskLevel;
  message: string;
}

export interface PatientRiskProfile {
  riskIndex: RiskLevel;
  alerts: RiskAlert[];
}

export class PatientRiskIndexEngine {
  public static calculateRisk(anamnesis: PatientHealthAnamnesis): PatientRiskProfile {
    const alerts: RiskAlert[] = [];
    let riskPoints = 0;

    // 1. Cardiovascular Risk
    if (anamnesis.hasCardiovascularDisease) {
      riskPoints += 2;
      alerts.push({
        type: "cardiac",
        level: "moderate",
        message: "Наличие ССЗ требует контроля АД и ЧСС перед вмешательством.",
      });
    }

    // 2. Bleeding Risk (Anticoagulants/Antiplatelets)
    if (anamnesis.isTakingAnticoagulants) {
      riskPoints += 3;
      alerts.push({
        type: "bleeding",
        level: "high",
        message: "Прием антикоагулянтов. Высокий риск кровотечения. Требуется консультация терапевта/кардиолога по тактике отмены.",
      });
    } else if (anamnesis.isTakingAntiplatelets) {
      riskPoints += 1;
      alerts.push({
        type: "bleeding",
        level: "moderate",
        message: "Прием дезагрегантов. Контроль гемостаза.",
      });
    }

    // 3. Metabolic Risk (Diabetes)
    if (anamnesis.isDiabetesDecompensated) {
      riskPoints += 3;
      alerts.push({
        type: "cardiac",
        level: "high",
        message: "Декомпенсированный сахарный диабет. Высокий риск инфекционных осложнений и замедленного заживления.",
      });
    } else if (anamnesis.hasDiabetes) {
      riskPoints += 1;
    }

    // 4. Osteonecrosis Risk (Bisphosphonates)
    if (anamnesis.isTakingBisphosphonates) {
      riskPoints += 3;
      alerts.push({
        type: "osteonecrosis",
        level: "high",
        message: "Прием бисфосфонатов. Риск остеонекроза челюсти (MRONJ). Требуется строгий протокол хирургии.",
      });
    }

    // 5. Allergy Risk
    if (anamnesis.hasAllergies) {
      alerts.push({
        type: "allergy",
        level: "moderate",
        message: "Наличие аллергоанамнеза. Уточните аллергены перед введением анестетиков.",
      });
    }

    // Determine total Risk Index
    let riskIndex: RiskLevel = "low";
    if (riskPoints >= 6) {
      riskIndex = "critical";
    } else if (riskPoints >= 4) {
      riskIndex = "high";
    } else if (riskPoints >= 2) {
      riskIndex = "moderate";
    }

    return { riskIndex, alerts };
  }
}
