/**
 * chairsideTypes.ts — Interfaces and clinical mappings for ChairsideCopilotHUD.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy.
 * - Zero emojis, 100% strict TypeScript types.
 */

export interface ChairsideThoughtStep {
  id: string;
  stepNumber: number;
  title: string;
  status: "pending" | "running" | "done" | "warning";
  detail?: string | undefined;
  durationMs?: number | undefined;
}

export interface ChairsideToothProposal {
  toothNumber: number;
  state: string; // e.g. "C2"
  stateLabel: string; // e.g. "Кариес дентина (C2)"
  surfaces: string[]; // e.g. ["O"]
  applied?: boolean | undefined;
}

export interface ChairsideServiceProposal {
  id: string;
  code804n: string;
  title: string;
  toothNumber?: number | undefined;
  quantity: number;
  priceRub: number;
  discountPercent?: number | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideSoapProposal {
  complaint: string;
  anamnesis: string;
  objectiveStatus: string;
  diagnosis: string;
  treatmentPlan: string;
  recommendations?: string | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideAnestheticProposal {
  drugName: string;
  carpulesCount: number;
  patientWeightKg: number;
  maxCarpules: number;
  epinephrineMcg: number;
  isCardiovascularRisk: boolean;
  notes?: string | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideConsentProposal {
  consentCode: string;
  consentTitle: string;
  regulatoryBasis: string;
  procedureType: string;
  toothOrArea: string;
  applied?: boolean | undefined;
}

export interface ChairsideSafetyAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendedAction?: string | undefined;
  acknowledged?: boolean | undefined;
}

export interface ChairsideCopilotHUDProps {
  readonly initialOpen?: boolean | undefined;
  readonly initialDocked?: boolean | undefined;
  readonly initialCompact?: boolean | undefined;
  readonly initialDrawerOpen?: boolean | undefined;
  readonly activeTooth?: number | null | undefined;
  readonly patientId?: string | undefined;
  readonly visitId?: string | undefined;
  readonly chairId?: string | undefined;
  readonly patientName?: string | undefined;
  readonly patientAllergies?: readonly string[] | undefined;
  readonly patientSomaticHistory?: readonly string[] | undefined;
  readonly onApplyToothState?: ((toothNumber: number, state: string, surfaces?: string[]) => void) | undefined;
  readonly onUpdateToothStatus?: ((toothNumber: number, status: string, surfaces?: string[]) => void) | undefined;
  readonly onApplyServices?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  readonly onAddBillingItem?: ((item: ChairsideServiceProposal | ChairsideServiceProposal[] | any) => void) | undefined;
  readonly onApplySoapNotes?: ((notes: Record<string, string>) => void) | undefined;
  readonly onApplySoapDiary?: ((diary: any) => void) | undefined;
  readonly onDisposeCarpule?: ((drugName: string, carpulesCount: number) => void) | undefined;
  readonly onPrintInformedConsent?: ((consentCode: string) => void) | undefined;
  readonly onApplyAll?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly className?: string | undefined;
}

/**
 * Maps arbitrary clinical shortcodes and speech words to canonical ToothState.
 * Prevents unknown status drops in useOdontogramSync, ToothChart, and ToothContextDrawer.
 */
export function mapToCanonicalToothState(state: string): string {
  if (!state) return "Caries";
  const s = state.trim().toLowerCase();
  if (
    s === "c2" ||
    s === "c1" ||
    s === "c3" ||
    s === "c4" ||
    s.includes("кариес") ||
    s === "caries"
  ) {
    return "Caries";
  }
  if (s === "p" || s.includes("пульпит") || s === "pulpitis") {
    return "Pulpitis";
  }
  if (s === "pt" || s.includes("периодонтит") || s === "periodontitis") {
    return "Periodontitis";
  }
  if (
    s === "norm" ||
    s === "healthy" ||
    s.includes("здоров") ||
    s.includes("норма")
  ) {
    return "Healthy";
  }
  if (s === "missing" || s === "x" || s === "a" || s.includes("отсутств") || s === "адентия") {
    return "Missing";
  }
  if (s === "crown" || s === "cr" || s === "k" || s.includes("коронк")) {
    return "Crown";
  }
  if (s === "implant" || s === "impl" || s.includes("имплант")) {
    return "Implant";
  }
  if (s === "planned_implant" || s.includes("план")) {
    return "Planned_Implant";
  }
  if (s === "filled" || s.includes("пломб")) {
    return "Filled";
  }
  if (s === "retained" || s.includes("ретин")) {
    return "Retained";
  }
  if (s === "root" || s === "r" || s === "radix" || s.includes("корен")) {
    return "Root";
  }
  return state;
}

// Re-export presets and types
export { CLINICAL_PRESETS, defaultPreset, type ClinicalPreset } from "./chairsidePresets";
