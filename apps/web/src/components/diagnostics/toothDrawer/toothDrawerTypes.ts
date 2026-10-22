import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { AnesthesiaCalculationResult } from "../../anesthesia/anesthesiaEngine";

export * from "./toothExpressAnesthesiaOptions";

export interface SuggestedRecall {
	readonly cycle: string;
	readonly months: number;
	readonly label: string;
}

export function getSuggestedRecallForToothState(state: ToothState): SuggestedRecall {
	switch (state) {
		case "Healthy":
			return { cycle: "standard_prophylaxis", months: 6, label: "Профгигиена 6 мес." };
		case "Caries":
		case "Filled":
			return { cycle: "caries_high_risk", months: 6, label: "Контроль пломбы 6 мес." };
		case "Pulpitis":
		case "Periodontitis":
			return { cycle: "periodontal_maintenance", months: 3, label: "Контроль пародонта / рентген 3 мес." };
		case "Crown":
			return { cycle: "prosthetic_check", months: 6, label: "Окклюзия / коронка 6 мес." };
		case "Implant":
		case "Planned_Implant":
			return { cycle: "implant_monitoring", months: 3, label: "Остеоинтеграция 3 мес." };
		case "Missing":
		default:
			return { cycle: "standard_prophylaxis", months: 6, label: "Профосмотр 6 мес." };
	}
}

export type WarmAccordionSection =
	| "surfaces_endo"
	| "anesthesia"
	| "rvg_xray"
	| "family_loyalty"
	| "pediatric";

export interface ToothContextDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothData?: ToothData | undefined;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly ageYears?: number | undefined;
		readonly weightKg?: number | undefined;
		readonly hasCardioRisk?: boolean | undefined;
		readonly hasSulfiteAllergy?: boolean | undefined;
		readonly hasAsthma?: boolean | undefined;
		readonly isPregnant?: boolean | undefined;
	} | undefined;
	readonly doctorName?: string | undefined;
	readonly onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	readonly onUpdateToothStatus?: ((toothNumber: number, state: string) => void) | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	readonly onOpenFamilyBilling?: (() => void) | undefined;
	readonly onOpenParentMemo?: (() => void) | undefined;
	readonly onOpenHistory?: ((toothNumber: number) => void) | undefined;
	readonly onOpenEndo?: ((toothNumber: number) => void) | undefined;
	readonly onSetRecall?: ((toothNumber: number, cycleType: string, monthsOffset: number) => void) | undefined;
	readonly initialSection?: WarmAccordionSection | undefined;
	readonly className?: string | undefined;
}
