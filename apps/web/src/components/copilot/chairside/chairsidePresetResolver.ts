/**
 * @file chairsidePresetResolver.ts
 * @description Preset resolution and proposal initialization for Chairside Copilot HUD (Mandate 8b <= 150 lines).
 */

import { CLINICAL_PRESETS, defaultPreset } from "./chairsidePresets";
import type {
  ChairsideCopilotHUDProps,
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";

export interface ChairsidePresetAnesthetic {
  drugName: string;
  carpulesCount: number;
  patientWeightKg?: number;
  maxCarpules?: number;
  epinephrineMcg?: number;
  isCardiovascularRisk?: boolean;
  notes?: string;
}

export function parseChairsideAnesthetic(a: ChairsidePresetAnesthetic): ChairsideAnestheticProposal {
  return {
    applied: false,
    drugName: a.drugName,
    carpulesCount: a.carpulesCount,
    patientWeightKg: a.patientWeightKg ?? 70,
    maxCarpules: a.maxCarpules ?? 4,
    epinephrineMcg: a.epinephrineMcg ?? 18,
    isCardiovascularRisk: Boolean(a.isCardiovascularRisk),
    ...(a.notes ? { notes: a.notes } : {}),
  };
}

export function resolveInitialProposals(props: ChairsideCopilotHUDProps) {
  const {
    activeTooth,
    initialToothProposal,
    initialServicesProposal,
    initialSoapProposal,
    initialAnestheticProposal,
    initialSafetyAlert,
    initialPresetIndex,
  } = props;
  const hasActiveTooth = typeof activeTooth === "number";

  let toothProposal: ChairsideToothProposal | null = initialToothProposal !== undefined ? initialToothProposal : null;
  if (toothProposal === null && initialPresetIndex !== undefined && initialPresetIndex !== null) {
    const p = CLINICAL_PRESETS[initialPresetIndex];
    if (p?.toothNumber || hasActiveTooth) {
      const num = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p?.toothNumber;
      if (num) {
        toothProposal = {
          toothNumber: num,
          state: p?.toothState || "C2",
          stateLabel: p?.toothStateLabel || "",
          surfaces: [...(p?.surfaces || [])],
          applied: false,
        };
      }
    }
  }

  let servicesProposal: ChairsideServiceProposal[] = initialServicesProposal !== undefined ? [...initialServicesProposal] : [];
  if (initialServicesProposal === undefined && initialPresetIndex !== undefined && initialPresetIndex !== null) {
    const p = CLINICAL_PRESETS[initialPresetIndex];
    if (p?.services) {
      const effectiveTooth = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p.toothNumber;
      servicesProposal = p.services.map((s) => {
        const sTooth = ("toothNumber" in s && typeof (s as { toothNumber?: unknown }).toothNumber === "number")
          ? (s as { toothNumber: number }).toothNumber
          : undefined;
        return {
          ...s,
          toothNumber: effectiveTooth ?? sTooth,
          applied: false,
        };
      });
    }
  }

  let soapProposal: ChairsideSoapProposal;
  const presetSoap = (initialPresetIndex !== undefined && initialPresetIndex !== null)
    ? CLINICAL_PRESETS[initialPresetIndex]?.soap
    : undefined;
  if (initialSoapProposal !== undefined) {
    soapProposal = initialSoapProposal;
  } else if (presetSoap) {
    soapProposal = { ...presetSoap, applied: false };
  } else if (initialToothProposal) {
    const toothNum = initialToothProposal.toothNumber;
    const stateLabel = initialToothProposal.stateLabel || "Кариес дентина";
    const code = initialToothProposal.state === "C2" ? "K02.1" : initialToothProposal.state === "P" ? "K04.0" : "K02.1";
    soapProposal = {
      complaint: "Жалобы на кратковременные боли от сладкого и холодного.",
      anamnesis: "Ранее зуб не лечен, полость появилась около 2 месяцев назад.",
      objectiveStatus: "Зондирование дна полости болезненно по эмалево-дентинной границе. Перкуссия отрицательна.",
      diagnosis: `${code} ${stateLabel} (зуб ${toothNum})`,
      treatmentPlan: "Препарирование и медикаментозная обработка, постановка пломбы светового отверждения.",
      recommendations: "Щадящая диета 2 часа, повторный осмотр через 6 месяцев.",
      applied: false,
    };
  } else {
    soapProposal = {
      complaint: "",
      anamnesis: "",
      objectiveStatus: "",
      diagnosis: "",
      treatmentPlan: "",
      recommendations: "",
      applied: false,
    };
  }

  let anestheticProposal: ChairsideAnestheticProposal | null = initialAnestheticProposal !== undefined ? initialAnestheticProposal : null;
  const presetAnesthetic = (initialPresetIndex !== undefined && initialPresetIndex !== null)
    ? CLINICAL_PRESETS[initialPresetIndex]?.anesthetic
    : undefined;
  if (anestheticProposal === null && presetAnesthetic) {
    anestheticProposal = parseChairsideAnesthetic(presetAnesthetic);
  }

  let safetyAlert: ChairsideSafetyAlert | null = initialSafetyAlert !== undefined ? initialSafetyAlert : null;
  const presetSafetyAlert = (initialPresetIndex !== undefined && initialPresetIndex !== null)
    ? CLINICAL_PRESETS[initialPresetIndex]?.safetyAlert
    : undefined;
  if (safetyAlert === null && presetSafetyAlert) {
    const sa = presetSafetyAlert;
    safetyAlert = {
      id: sa.id,
      severity: ((sa.severity as string) === "danger" || (sa.severity as string) === "critical" ? "critical" : sa.severity === "warning" ? "warning" : "info") as "critical" | "warning" | "info",
      title: sa.title,
      description: sa.description,
      acknowledged: false,
    };
  }

  return { toothProposal, servicesProposal, soapProposal, anestheticProposal, safetyAlert };
}

export function resolvePresetSelection(index: number, activeTooth?: number | null) {
  const p = CLINICAL_PRESETS[index] || defaultPreset;
  const hasActiveTooth = typeof activeTooth === "number";
  const effectiveTooth = (hasActiveTooth && typeof activeTooth === "number") ? activeTooth : p.toothNumber;

  const toothProposal: ChairsideToothProposal | null = effectiveTooth ? {
    toothNumber: effectiveTooth,
    state: p.toothState || "C2",
    stateLabel: p.toothStateLabel || "",
    surfaces: [...(p.surfaces || [])],
    applied: false,
  } : null;

  const servicesProposal: ChairsideServiceProposal[] = p.services.map((s) => {
    const sTooth = ("toothNumber" in s && typeof (s as { toothNumber?: unknown }).toothNumber === "number")
      ? (s as { toothNumber: number }).toothNumber
      : undefined;
    return {
      ...s,
      toothNumber: effectiveTooth ?? sTooth,
      applied: false,
    };
  });

  const diagnosis = (effectiveTooth && p.soap.diagnosis)
    ? (p.toothNumber ? p.soap.diagnosis.replace(new RegExp(`зуб\\s*${p.toothNumber}`, "i"), `зуб ${effectiveTooth}`) : p.soap.diagnosis)
    : p.soap.diagnosis;

  const soapProposal: ChairsideSoapProposal = { ...p.soap, diagnosis, applied: false };
  const anestheticProposal: ChairsideAnestheticProposal | null = p.anesthetic ? parseChairsideAnesthetic(p.anesthetic) : null;
  const safetyAlert: ChairsideSafetyAlert | null = p.safetyAlert ? {
    id: p.safetyAlert.id,
    severity: ((p.safetyAlert.severity as string) === "danger" || (p.safetyAlert.severity as string) === "critical" ? "critical" : p.safetyAlert.severity === "warning" ? "warning" : "info") as "critical" | "warning" | "info",
    title: p.safetyAlert.title,
    description: p.safetyAlert.description,
    acknowledged: false,
  } : null;

  return { toothProposal, servicesProposal, soapProposal, anestheticProposal, safetyAlert };
}
