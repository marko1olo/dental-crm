/**
 * agentApiResponseParser.ts — Normalizer and parser for backend Copilot Agent responses.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 250 lines.
 * - Mandate 8e: Doctor & Staff Autonomy.
 * - TABOO: Strictly preserve anesthesia dosage, epinephrine limits and pediatric logic.
 */

import type {
  ChairsideThoughtStep,
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
} from "../chairsideTypes";
import type { MatchedProtocolInfo } from "../ChairsideClinicalInsights";

export interface ParsedAgentResult {
  thoughts?: ChairsideThoughtStep[];
  verdict?: string;
  safetyAlert?: ChairsideSafetyAlert | null;
  toothProposal?: ChairsideToothProposal | null;
  servicesProposal?: ChairsideServiceProposal[] | null;
  soapProposal?: ChairsideSoapProposal | null;
  anestheticProposal?: ChairsideAnestheticProposal | null;
  consentProposal?: ChairsideConsentProposal | null;
  matchedProtocol?: MatchedProtocolInfo | null;
  toastMessage?: { text: string; type: "info" | "success" | "warning" };
}

export function parseAgentApiResponse(
  data: any,
  activeTooth: number = 16,
  matchedProtocol: MatchedProtocolInfo | null = null,
): ParsedAgentResult {
  const result: ParsedAgentResult = {
    matchedProtocol,
    toastMessage: { text: "Рекомендации ИИ-копилота получены и готовы к применению", type: "info" },
  };

  // 1. Thought stream / steps
  if (Array.isArray(data.steps) && data.steps.length > 0) {
    result.thoughts = data.steps.map((s: any, idx: number) => ({
      id: `step-${s.iteration}-${idx}`,
      stepNumber: s.iteration,
      title: String(s.thought || "").split("\n")[0] || `Итерация ${s.iteration}`,
      status: "done" as const,
      detail: String(s.thought || "").split("\n").slice(1).filter(Boolean).join(" • ") || undefined,
      durationMs: 75,
    }));
  } else if (data.thought) {
    const lines = String(data.thought).split("\n\n").filter(Boolean);
    result.thoughts = lines.map((l: string, idx: number) => ({
      id: `step-${idx + 1}`,
      stepNumber: idx + 1,
      title: l.split("\n")[0] || `Шаг ${idx + 1}`,
      status: "done" as const,
      detail: l.split("\n").slice(1).join(" ") || undefined,
      durationMs: 75,
    }));
  }

  // 2. Clinical verdict
  if (data.verdict) {
    result.verdict = typeof data.verdict === "string" ? data.verdict : data.verdict.summary || "";
  }

  // 3. Safety alerts
  if (Array.isArray(data.safetyAlerts) && data.safetyAlerts.length > 0) {
    const topAlert = data.safetyAlerts[0];
    result.safetyAlert = {
      id: topAlert.id || `alert-${Date.now()}`,
      severity: (topAlert.severity as "critical" | "warning" | "info") || "info",
      title: topAlert.title || "Алерт безопасности",
      description: topAlert.message || topAlert.description || "",
      recommendedAction: topAlert.safeAlternative,
      acknowledged: false,
    };
  }

  // 4. Action proposals
  if (Array.isArray(data.actions)) {
    for (const action of data.actions) {
      if (action.type === "apply_tooth_status" && action.payload) {
        const p = action.payload;
        result.toothProposal = {
          toothNumber: (p.tooth as number) || data.toothNumber || activeTooth || 16,
          state: (p.statusCode as string) || (p.newStatus as string) || "C2",
          stateLabel: p.newStatus ? `${p.newStatus} (${p.statusCode || ""})` : (p.diagnosisText as string) || "Обновление статуса",
          surfaces: Array.isArray(p.surfaces) ? p.surfaces : [],
          applied: false,
        };
      } else if ((action.type === "apply_treatment_estimate" || action.type === "apply_estimate_804n") && action.payload) {
        const p = action.payload;
        if (Array.isArray(p.items)) {
          result.servicesProposal = p.items.map((it: any, idx: number) => ({
            id: `srv-${it.serviceCode || it.code || it.code804n || idx}-${idx}`,
            serviceCode: it.serviceCode || it.code || it.code804n || "A16.07.001",
            code804n: it.serviceCode || it.code || it.code804n || "A16.07.001",
            title: it.title || "Услуга",
            toothNumber: it.toothNumber || data.toothNumber,
            quantity: it.quantity || 1,
            priceRub: it.priceRub || 0,
            discountPercent: p.discountPercent,
            applied: false,
          }));
        }
      } else if (action.type === "apply_soap_diary" && action.payload) {
        const p = action.payload;
        result.soapProposal = {
          complaint: p.subjective?.complaints || p.complaint || "",
          anamnesis: [p.subjective?.anamnesisMorbi, p.subjective?.anamnesisVitae].filter(Boolean).join(" ") || p.anamnesis || "",
          objectiveStatus: [p.objective?.statusLocalis, p.objective?.percussion, p.objective?.coldTest, p.objective?.probing].filter(Boolean).join(" ") || p.objectiveStatus || "",
          diagnosis: p.assessment?.icd10Name || p.assessment?.clinicalDiagnosis || p.diagnosis || "",
          treatmentPlan: p.plan?.procedureProtocol || p.plan?.treatmentDescription || p.treatmentPlan || "",
          recommendations: p.plan?.recommendations || p.recommendations || "",
          applied: false,
        };
      } else if (action.type === "apply_anesthetic_dosage" && action.payload) {
        const p = action.payload;
        result.anestheticProposal = {
          drugName: p.drugName || "Артикаин 4%",
          carpulesCount: p.carpulesCount || 1,
          patientWeightKg: p.patientWeightKg || 70,
          maxCarpules: p.maxCarpules || 7,
          epinephrineMcg: p.epinephrineMcg || 8.5,
          isCardiovascularRisk: Boolean(p.isCardiovascularRisk),
          notes: p.notes,
          applied: false,
        };
      } else if (action.type === "print_informed_consent" && action.payload) {
        const p = action.payload;
        result.consentProposal = {
          consentCode: p.consentCode || "IDS-01-GENERAL",
          consentTitle: p.title || "Информированное добровольное согласие",
          regulatoryBasis: p.statutoryBasis || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
          procedureType: p.procedureType || "Стоматологическое вмешательство",
          toothOrArea: p.toothOrArea || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
          applied: false,
        };
      }
    }
  }

  // 5. Fallback for direct fields in data
  if (data.soapDiary && !result.soapProposal) {
    const p = data.soapDiary;
    result.soapProposal = {
      complaint: p.subjective?.complaints || "",
      anamnesis: [p.subjective?.anamnesisMorbi, p.subjective?.anamnesisVitae].filter(Boolean).join(" ") || "",
      objectiveStatus: [p.objective?.statusLocalis, p.objective?.percussion, p.objective?.coldTest, p.objective?.probing].filter(Boolean).join(" ") || "",
      diagnosis: p.assessment?.icd10Name || "",
      treatmentPlan: p.plan?.procedureProtocol || "",
      recommendations: p.plan?.recommendations || "",
      applied: false,
    };
  }

  if (data.anestheticDosage && !result.anestheticProposal) {
    const ad = data.anestheticDosage;
    result.anestheticProposal = {
      drugName: ad.recommendedDrug || "Артикаин 4%",
      carpulesCount: ad.recommendedCarpules || 1,
      patientWeightKg: ad.patientWeightKg || 70,
      maxCarpules: ad.maxCarpulesAllowed || 7,
      epinephrineMcg: ad.epinephrineContentMcg || ad.epinephrineMcg || 8.5,
      isCardiovascularRisk: Boolean(ad.isCardiovascularRisk),
      notes: ad.clinicalWarning || ad.clinicalAdvice,
      applied: false,
    };
  }

  if (data.informedConsent && !result.consentProposal) {
    const ic = data.informedConsent;
    const primaryTitle = ic.allRequiredConsents?.[0]?.title || "Информированное добровольное согласие";
    result.consentProposal = {
      consentCode: ic.primaryConsentCode || "IDS-01-GENERAL",
      consentTitle: primaryTitle,
      regulatoryBasis: ic.statutoryBasis || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: ic.procedureType || "Стоматологическое вмешательство",
      toothOrArea: ic.toothOrArea || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
      applied: false,
    };
  }

  return result;
}
