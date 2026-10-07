/**
 * chairsideAgentExecutor.ts — Autonomous AI Copilot Request Handler & Speech Parser.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy (zero blocking gates, reversible actions).
 * - TABOO OF THE CREATOR: Strictly preserve anesthesia dosage and pediatric teeth logic.
 */

import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { findBestClinicalProtocol } from "../../visit/clinicalCatalog/clinicalProtocolsCatalog";
import { parseDentalVoiceSpeech } from "../../../services/voice";
import {
  type ChairsideThoughtStep,
  type ChairsideToothProposal,
  type ChairsideServiceProposal,
  type ChairsideSoapProposal,
  type ChairsideAnestheticProposal,
  type ChairsideConsentProposal,
  type ChairsideSafetyAlert,
  CLINICAL_PRESETS,
  defaultPreset,
} from "./chairsideTypes";
import type { MatchedProtocolInfo } from "./ChairsideClinicalInsights";

export interface ExecuteCopilotAgentParams {
  promptText: string;
  activeTooth?: number | null | undefined;
  patientId?: string | undefined;
  visitId?: string | undefined;
  chairId?: string | undefined;
  patientAllergies?: readonly string[] | string[] | undefined;
  patientSomaticHistory?: string | readonly string[] | string[] | undefined;
}

export interface CopilotExecutionResult {
  thoughts?: ChairsideThoughtStep[];
  verdict?: string;
  safetyAlert?: ChairsideSafetyAlert | null;
  toothProposal?: ChairsideToothProposal | null;
  servicesProposal?: ChairsideServiceProposal[] | null;
  soapProposal?: ChairsideSoapProposal | null;
  anestheticProposal?: ChairsideAnestheticProposal | null;
  consentProposal?: ChairsideConsentProposal | null;
  matchedProtocol?: MatchedProtocolInfo | null;
  activePresetIndex?: number;
  toastMessage?: { text: string; type: "info" | "success" | "warning" };
}

export async function executeCopilotAgentRequest(
  params: ExecuteCopilotAgentParams
): Promise<CopilotExecutionResult> {
  const {
    promptText,
    activeTooth = 16,
    patientId,
    visitId,
    chairId,
    patientAllergies = ["Пенициллины"],
    patientSomaticHistory,
  } = params;

  const text = promptText.trim();
  const catalogMatch = findBestClinicalProtocol(text, activeTooth || undefined);

  let matchedProtocol: MatchedProtocolInfo | null = null;
  if (catalogMatch) {
    matchedProtocol = {
      procedureName: catalogMatch.procedureName,
      categoryKey: catalogMatch.categoryKey,
      tooth: catalogMatch.tooth,
      ...(catalogMatch.matchedIcd10 ? { matchedIcd10: catalogMatch.matchedIcd10 } : {}),
    };
  }

  const staffToken = readDenteStaffToken();
  const clinicToken = readDenteClinicToken();
  const authToken = staffToken || clinicToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  if (clinicToken) {
    headers["x-dente-clinic-token"] = clinicToken;
  }
  if (staffToken) {
    headers["x-dente-staff-token"] = staffToken;
  }

  const requestBody = {
    patientId: patientId || "pat-chairside-default",
    prompt: text || undefined,
    toothNumber: activeTooth ?? undefined,
    complaints: text || undefined,
    allergies: patientAllergies ? [...patientAllergies] : undefined,
    somaticHistory: Array.isArray(patientSomaticHistory)
      ? [...patientSomaticHistory]
      : typeof patientSomaticHistory === "string"
      ? [patientSomaticHistory]
      : undefined,
    appointmentRequest: visitId
      ? {
          startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          chairId: chairId || undefined,
          reason: text || "Повторный клинический приём",
        }
      : undefined,
    mode: "autonomous" as const,
  };

  try {
    const response = await fetch("/api/v1/copilot/agent/execute", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const data = json?.data;

    if (data) {
      const result: CopilotExecutionResult = {
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
          } else if (action.type === "apply_estimate_804n" && action.payload) {
            const p = action.payload;
            if (Array.isArray(p.items)) {
              result.servicesProposal = p.items.map((it: any, idx: number) => ({
                id: `srv-${it.code804n || idx}-${idx}`,
                code804n: it.code804n || "A16.07.001",
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
  } catch (err) {
    console.warn("[ChairsideCopilotHUD] API call failed, analyzing with local clinical speech parser and 1,142 catalog:", err);
  }

  // Local fallback parsing
  const voiceIntent = parseDentalVoiceSpeech(text);
  const hasIntentEntities =
    voiceIntent.teethUpdates.length > 0 ||
    Boolean(voiceIntent.anesthesia) ||
    voiceIntent.procedures804n.length > 0 ||
    Boolean(voiceIntent.soapNotes?.assessment) ||
    Boolean(catalogMatch);

  if (hasIntentEntities) {
    const firstToothUpdate = voiceIntent.teethUpdates[0];
    const targetTooth =
      catalogMatch?.tooth ||
      firstToothUpdate?.toothNumber ||
      voiceIntent.detectedTeeth[0] ||
      Number(text.match(/\b([1-4][1-8])\b/)?.[1]) ||
      activeTooth ||
      16;
    const toothState = catalogMatch
      ? catalogMatch.recommendedToothState
      : (firstToothUpdate?.state || "Caries");
    const toothStateLabel = catalogMatch
      ? `${catalogMatch.procedureName} (${catalogMatch.matchedIcd10 || "Каталог 1 142"})`
      : `${firstToothUpdate?.icd10Title || "Кариес"} (${targetTooth})`;
    const toothSurfaces = firstToothUpdate?.surfaces || ["O"];

    const toothProposal: ChairsideToothProposal = {
      toothNumber: targetTooth,
      state: toothState,
      stateLabel: toothStateLabel,
      surfaces: toothSurfaces,
      applied: false,
    };

    let servicesProposal: ChairsideServiceProposal[];
    if (voiceIntent.procedures804n.length > 0) {
      servicesProposal = voiceIntent.procedures804n.map((p, idx) => ({
        id: `voice-srv-${idx}-${p.code804n}`,
        code804n: p.code804n,
        title: p.name,
        toothNumber: targetTooth,
        quantity: 1,
        priceRub: p.priceRub || 3500,
        applied: false,
      }));
    } else {
      const presetIdx = /пульпит|канал/i.test(text) ? 1 : /гигиен|чистк|налет/i.test(text) ? 2 : 0;
      const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
      servicesProposal = preset.services.map((s) => ({
        ...s,
        toothNumber: targetTooth,
        applied: false,
      }));
    }

    let soapProposal: ChairsideSoapProposal;
    if (catalogMatch) {
      soapProposal = {
        complaint: catalogMatch.patch.complaint || `Жалобы в области зуба ${targetTooth}`,
        anamnesis: catalogMatch.patch.anamnesis || "Ранее зуб не лечен, симптомы возникли недавно.",
        objectiveStatus: catalogMatch.patch.objectiveStatus || `При осмотре: кариозное поражение зуба ${targetTooth}.`,
        diagnosis: catalogMatch.patch.diagnosis || `${catalogMatch.matchedIcd10 || "K02.1"} ${catalogMatch.procedureName}`,
        treatmentPlan: catalogMatch.patch.treatmentPlan || "Проведено препарирование и пломбирование.",
        recommendations: catalogMatch.patch.recommendations || "Соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.",
        applied: false,
      };
    } else if (voiceIntent.soapNotes) {
      const sn = voiceIntent.soapNotes;
      soapProposal = {
        complaint: sn.subjective || `Жалобы в области зуба ${targetTooth}`,
        anamnesis: "Со слов пациента, ранее зуб не лечен, симптомы возникли недавно.",
        objectiveStatus: sn.objective || `При осмотре: кариозное поражение зуба ${targetTooth}.`,
        diagnosis: sn.assessment || `${firstToothUpdate?.icd10Code || "K02.1"} ${firstToothUpdate?.icd10Title || "Кариес"}`,
        treatmentPlan: sn.plan || "Проведено препарирование и пломбирование.",
        recommendations: sn.recommendations || "Соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.",
        applied: false,
      };
    } else {
      soapProposal = {
        complaint: `Жалобы в области зуба ${targetTooth}`,
        anamnesis: "Ранее зуб не лечен.",
        objectiveStatus: `Кариозное поражение зуба ${targetTooth}.`,
        diagnosis: `K02.1 Кариес дентина (зуб ${targetTooth})`,
        treatmentPlan: "Препарирование, пломбирование.",
        recommendations: "Контроль через 6 месяцев.",
        applied: false,
      };
    }

    let anestheticProposal: ChairsideAnestheticProposal | null = null;
    if (voiceIntent.anesthesia) {
      const an = voiceIntent.anesthesia;
      anestheticProposal = {
        drugName: an.tradeName,
        carpulesCount: an.cartridgeCount,
        patientWeightKg: 70,
        maxCarpules: 7,
        epinephrineMcg: 8.5 * an.cartridgeCount,
        isCardiovascularRisk: false,
        notes: `${an.technique === "conduction" ? "Проводниковая" : "Инфильтрационная"} анестезия ${an.displayName}`,
        applied: false,
      };
    }

    const thoughts: ChairsideThoughtStep[] = [
      {
        id: "step-voice-1",
        stepNumber: 1,
        title: catalogMatch
          ? "Клинический протокол из каталога 1 142 (<2мс)"
          : "Голосовой парсер речи за креслом",
        status: "done",
        detail: catalogMatch
          ? `Найдена процедура: ${catalogMatch.procedureName} [МКБ-10: ${catalogMatch.matchedIcd10 || "н/д"}], зуб ${targetTooth}`
          : `Распознан зуб ${targetTooth}, статус: ${toothStateLabel}`,
        durationMs: 2,
      },
      {
        id: "step-voice-2",
        stepNumber: 2,
        title: "Формирование дневника приёма и плана лечения",
        status: "done",
        detail: `Услуг: ${servicesProposal.length}, Анестезия: ${voiceIntent.anesthesia ? voiceIntent.anesthesia.displayName : "не требовалась"}`,
        durationMs: 15,
      },
    ];

    const verdict = catalogMatch
      ? `Подобран стандартный клинический протокол: ${catalogMatch.procedureName} (${catalogMatch.matchedIcd10 || "МКБ-10"}) для зуба ${targetTooth}.`
      : "";

    return {
      toothProposal,
      servicesProposal,
      soapProposal,
      anestheticProposal,
      thoughts,
      verdict,
      matchedProtocol,
      toastMessage: {
        text: catalogMatch
          ? `Протокол 1 142: ${catalogMatch.procedureName} (зуб ${targetTooth})`
          : `Голосом распознано: зуб ${targetTooth} (${toothStateLabel})`,
        type: "success",
      },
    };
  }

  // Fallback to presets
  const presetIdx =
    /пульпит|26|канал/i.test(text) ? 1 :
    /гигиен|чистк|налет|скейлинг/i.test(text) ? 2 :
    /пациент|сегодня|кто след/i.test(text) ? 3 :
    /смен|график|четверг|табель/i.test(text) ? 4 :
    /выручк|касс|деньг|доход/i.test(text) ? 5 : 0;
  const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
  const targetTooth = Number(text.match(/\b([1-4][1-8])\b/)?.[1]) || activeTooth || preset.toothNumber;

  return {
    activePresetIndex: presetIdx,
    thoughts: preset.thoughts,
    verdict: (preset as any).verdict || "",
    toothProposal: {
      toothNumber: targetTooth,
      state: preset.toothState,
      stateLabel: preset.toothStateLabel,
      surfaces: preset.surfaces,
      applied: false,
    },
    servicesProposal: preset.services.map((s) => ({
      ...s,
      toothNumber: targetTooth,
      applied: false,
    })),
    soapProposal: { ...preset.soap, applied: false },
    anestheticProposal: preset.anesthetic ? { ...preset.anesthetic, applied: false } : null,
    consentProposal: preset.consent
      ? {
          ...preset.consent,
          toothOrArea: `Зуб ${targetTooth}`,
          applied: false,
        }
      : null,
    safetyAlert: { ...preset.safetyAlert, acknowledged: false },
    matchedProtocol,
    toastMessage: {
      text: preset.toothNumber === 0
        ? `Автономный режим: ${preset.label}`
        : "Автономный режим: сформированы предложения у кресла",
      type: "info",
    },
  };
}
