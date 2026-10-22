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
  state: string;
  stateLabel: string;
  surfaces: string[];
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

export { mapToCanonicalToothState } from "./canonicalToothStateMapper";
export { CLINICAL_PRESETS, defaultPreset, type ClinicalPreset } from "./chairsidePresets";
