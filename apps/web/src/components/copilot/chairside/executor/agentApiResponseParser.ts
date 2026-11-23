/**
 * agentApiResponseParser.ts — Normalizer and parser for backend Copilot Agent responses.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 250 lines.
 * - Mandate 8e: Doctor & Staff Autonomy.
 * - TABOO: Strictly preserve anesthesia dosage, epinephrine limits and pediatric logic.
 */

import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type {
  ChairsideThoughtStep,
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
  MatchedProtocolInfo,
} from "../chairsideTypes";

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
  isLocalFallback?: boolean;
  fallbackMessage?: string;
}

interface RawAgentStep {
  iteration?: number;
  thought?: string;
  durationMs?: number;
}

interface RawSafetyAlert {
  id?: string;
  severity?: string;
  title?: string;
  message?: string;
  description?: string;
  safeAlternative?: string;
}

interface RawServiceItem {
  id?: string;
  serviceCode?: string;
  code?: string;
  code804n?: string;
  regulatoryCode?: string;
  title?: string;
  toothNumber?: number;
  quantity?: number;
  priceKopecks?: number;
  priceRub?: number;
  discountPercent?: number;
}

export function parseAgentApiResponse(
  data: Record<string, unknown>,
  activeTooth: number | null = null,
  matchedProtocol: MatchedProtocolInfo | null = null,
): ParsedAgentResult {
  const result: ParsedAgentResult = {
    matchedProtocol,
    toastMessage: { text: "Рекомендации ИИ-копилота получены и готовы к применению", type: "info" },
  };

  // 1. Thought stream / steps
  if (Array.isArray(data.steps) && data.steps.length > 0) {
    result.thoughts = (data.steps as RawAgentStep[]).map((s, idx: number) => ({
      id: `step-${s.iteration ?? idx + 1}-${idx}`,
      stepNumber: s.iteration ?? idx + 1,
      title: String(s.thought || "").split("\n")[0] || `Итерация ${s.iteration ?? idx + 1}`,
      status: "done" as const,
      detail: String(s.thought || "").split("\n").slice(1).filter(Boolean).join(" • ") || undefined,
      ...(typeof s.durationMs === "number" ? { durationMs: s.durationMs } : {}),
    }));
  } else if (data.thought) {
    const lines = String(data.thought).split("\n\n").filter(Boolean);
    result.thoughts = lines.map((l: string, idx: number) => ({
      id: `step-${idx + 1}`,
      stepNumber: idx + 1,
      title: l.split("\n")[0] || `Шаг ${idx + 1}`,
      status: "done" as const,
      detail: l.split("\n").slice(1).join(" ") || undefined,
    }));
  }

  // 2. Clinical verdict
  if (data.verdict) {
    result.verdict = typeof data.verdict === "string" ? data.verdict : (data.verdict as { summary?: string }).summary || "";
  }

  // 3. Safety alerts
  if (Array.isArray(data.safetyAlerts) && data.safetyAlerts.length > 0) {
    const topAlert = data.safetyAlerts[0] as RawSafetyAlert;
    result.safetyAlert = {
      id: topAlert.id || `alert-${Date.now()}`,
      severity: (topAlert.severity as "critical" | "warning" | "info") || "info",
      title: topAlert.title || "Алерт безопасности",
      description: topAlert.message || topAlert.description || "",
      recommendedAction: topAlert.safeAlternative,
      acknowledged: false,
    };
  } else if (data.safetyAlert) {
    const topAlert = data.safetyAlert as RawSafetyAlert;
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
    for (const rawAction of data.actions) {
      const action = rawAction as Record<string, unknown>;
      if (action.type === "apply_tooth_status" && action.payload) {
        const p = action.payload as Record<string, unknown>;
        const resolvedTooth = (p.tooth as number) || (data.toothNumber as number) || activeTooth || null;
        if (resolvedTooth) {
          result.toothProposal = {
            toothNumber: resolvedTooth,
            state: (p.statusCode as string) || (p.newStatus as string) || "C2",
            stateLabel: p.newStatus ? `${p.newStatus} (${(p.statusCode as string) || ""})` : (p.diagnosisText as string) || "Обновление статуса",
            surfaces: Array.isArray(p.surfaces) ? (p.surfaces as string[]) : [],
            applied: false,
          };
        }
      } else if ((action.type === "apply_treatment_estimate" || action.type === "apply_estimate_804n") && action.payload) {
        const p = action.payload as Record<string, unknown>;
        if (Array.isArray(p.items)) {
          result.servicesProposal = (p.items as RawServiceItem[]).map((it, idx: number) => {
            const priceKopecks = typeof it.priceKopecks === "number"
              ? it.priceKopecks
              : rublesToKopecks(it.priceRub || 0);
            const priceRub = typeof it.priceRub === "number"
              ? it.priceRub
              : Math.round(kopecksToRubles(priceKopecks));
            return {
              id: `srv-${it.serviceCode || it.code || it.code804n || idx}-${idx}`,
              serviceCode: it.serviceCode || it.code || it.code804n || "A16.07.001",
              regulatoryCode: it.regulatoryCode || it.code804n || undefined,
              code804n: it.code804n || it.regulatoryCode || it.serviceCode || it.code || "A16.07.001",
              title: it.title || "Услуга",
              toothNumber: it.toothNumber || (data.toothNumber as number | undefined),
              quantity: it.quantity || 1,
              priceKopecks,
              priceRub,
              discountPercent: p.discountPercent as number | undefined,
              applied: false,
            };
          });
        }
      } else if (action.type === "apply_soap_diary" && action.payload) {
        const p = action.payload as Record<string, unknown>;
        const subj = p.subjective as Record<string, unknown> | undefined;
        const obj = p.objective as Record<string, unknown> | undefined;
        const assess = p.assessment as Record<string, unknown> | undefined;
        const plan = p.plan as Record<string, unknown> | undefined;
        result.soapProposal = {
          complaint: (subj?.complaints as string) || (p.complaint as string) || "",
          anamnesis: [subj?.anamnesisMorbi, subj?.anamnesisVitae].filter(Boolean).join(" ") || (p.anamnesis as string) || "",
          objectiveStatus: [obj?.statusLocalis, obj?.percussion, obj?.coldTest, obj?.probing].filter(Boolean).join(" ") || (p.objectiveStatus as string) || "",
          diagnosis: (assess?.icd10Name as string) || (assess?.clinicalDiagnosis as string) || (p.diagnosis as string) || "",
          treatmentPlan: (plan?.procedureProtocol as string) || (plan?.treatmentDescription as string) || (p.treatmentPlan as string) || "",
          recommendations: (plan?.recommendations as string) || (p.recommendations as string) || "",
          applied: false,
        };
      } else if (action.type === "apply_anesthetic_dosage" && action.payload) {
        const p = action.payload as Record<string, unknown>;
        result.anestheticProposal = {
          drugName: (p.drugName as string) || "Артикаин 4%",
          carpulesCount: (p.carpulesCount as number) || 1,
          patientWeightKg: (p.patientWeightKg as number) || 70,
          maxCarpules: (p.maxCarpules as number) || 7,
          epinephrineMcg: (p.epinephrineMcg as number) || 8.5,
          isCardiovascularRisk: Boolean(p.isCardiovascularRisk),
          notes: p.notes as string | undefined,
          applied: false,
        };
      } else if (action.type === "print_informed_consent" && action.payload) {
        const p = action.payload as Record<string, unknown>;
        result.consentProposal = {
          consentCode: (p.consentCode as string) || "IDS-01-GENERAL",
          consentTitle: (p.title as string) || "Информированное добровольное согласие",
          regulatoryBasis: (p.statutoryBasis as string) || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
          procedureType: (p.procedureType as string) || "Стоматологическое вмешательство",
          toothOrArea: (p.toothOrArea as string) || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
          applied: false,
        };
      }
    }
  }

  // 5. Fallback for direct fields in data
  if (data.toothProposal && !result.toothProposal) {
    const tp = data.toothProposal as Record<string, unknown>;
    result.toothProposal = {
      toothNumber: (tp.toothNumber as number) || activeTooth || 0,
      state: (tp.state as string) || (tp.statusCode as string) || "C2",
      stateLabel: (tp.stateLabel as string) || (tp.diagnosisText as string) || "Обновление статуса",
      surfaces: Array.isArray(tp.surfaces) ? (tp.surfaces as string[]) : [],
      applied: false,
    };
  }

  if (Array.isArray(data.servicesProposal) && !result.servicesProposal) {
    result.servicesProposal = (data.servicesProposal as RawServiceItem[]).map((it, idx: number) => {
      const priceKopecks = typeof it.priceKopecks === "number"
        ? it.priceKopecks
        : rublesToKopecks(it.priceRub || 0);
      const priceRub = typeof it.priceRub === "number"
        ? it.priceRub
        : Math.round(kopecksToRubles(priceKopecks));
      return {
        id: it.id || `srv-${it.serviceCode || it.code || it.code804n || idx}-${idx}`,
        serviceCode: it.serviceCode || it.code || it.code804n || "A16.07.001",
        regulatoryCode: it.regulatoryCode || it.code804n || undefined,
        code804n: it.code804n || it.regulatoryCode || it.serviceCode || it.code || "A16.07.001",
        title: it.title || "Услуга",
        toothNumber: it.toothNumber || activeTooth || undefined,
        quantity: it.quantity || 1,
        priceKopecks,
        priceRub,
        discountPercent: it.discountPercent,
        applied: false,
      };
    });
  }

  if (data.soapProposal && !result.soapProposal) {
    const sp = data.soapProposal as Record<string, unknown>;
    result.soapProposal = {
      complaint: (sp.complaint as string) || "",
      anamnesis: (sp.anamnesis as string) || "",
      objectiveStatus: (sp.objectiveStatus as string) || "",
      diagnosis: (sp.diagnosis as string) || "",
      treatmentPlan: (sp.treatmentPlan as string) || "",
      recommendations: (sp.recommendations as string) || "",
      applied: false,
    };
  }

  if (data.soapDiary && !result.soapProposal) {
    const p = data.soapDiary as Record<string, unknown>;
    const subj = p.subjective as Record<string, unknown> | undefined;
    const obj = p.objective as Record<string, unknown> | undefined;
    const assess = p.assessment as Record<string, unknown> | undefined;
    const plan = p.plan as Record<string, unknown> | undefined;
    result.soapProposal = {
      complaint: (subj?.complaints as string) || "",
      anamnesis: [subj?.anamnesisMorbi, subj?.anamnesisVitae].filter(Boolean).join(" ") || "",
      objectiveStatus: [obj?.statusLocalis, obj?.percussion, obj?.coldTest, obj?.probing].filter(Boolean).join(" ") || "",
      diagnosis: (assess?.icd10Name as string) || "",
      treatmentPlan: (plan?.procedureProtocol as string) || "",
      recommendations: (plan?.recommendations as string) || "",
      applied: false,
    };
  }

  if (data.anestheticDosage && !result.anestheticProposal) {
    const ad = data.anestheticDosage as Record<string, unknown>;
    result.anestheticProposal = {
      drugName: (ad.recommendedDrug as string) || "Артикаин 4%",
      carpulesCount: (ad.recommendedCarpules as number) || 1,
      patientWeightKg: (ad.patientWeightKg as number) || 70,
      maxCarpules: (ad.maxCarpulesAllowed as number) || 7,
      epinephrineMcg: (ad.epinephrineContentMcg as number) || (ad.epinephrineMcg as number) || 8.5,
      isCardiovascularRisk: Boolean(ad.isCardiovascularRisk),
      notes: (ad.clinicalWarning as string) || (ad.clinicalAdvice as string),
      applied: false,
    };
  }

  if (data.informedConsent && !result.consentProposal) {
    const ic = data.informedConsent as Record<string, unknown>;
    const reqConsents = ic.allRequiredConsents as Array<{ title?: string }> | undefined;
    const primaryTitle = reqConsents?.[0]?.title || "Информированное добровольное согласие";
    result.consentProposal = {
      consentCode: (ic.primaryConsentCode as string) || "IDS-01-GENERAL",
      consentTitle: primaryTitle,
      regulatoryBasis: (ic.statutoryBasis as string) || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: (ic.procedureType as string) || "Стоматологическое вмешательство",
      toothOrArea: (ic.toothOrArea as string) || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
      applied: false,
    };
  }

  return result;
}
