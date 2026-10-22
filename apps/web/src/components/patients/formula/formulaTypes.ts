/**
 * apps/web/src/components/patients/formula/formulaTypes.ts
 *
 * Типы зубной формулы пациента (Мандаты 8e, 8b)
 */

import type { ToothData, ToothState } from "../../odontogram/ToothChart";

export type DentitionMode = "adult" | "pediatric" | "mixed";

export interface KpuStats {
	readonly c: number;
	readonly p: number;
	readonly u: number;
	readonly total: number;
}

export interface StampOption {
	readonly state: ToothState;
	readonly label: string;
	readonly colorClass: string;
}

export interface RadialMenuAnchor {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface RadialMenuState {
	readonly toothNumber: number;
	readonly anchorRect: RadialMenuAnchor;
	readonly currentState?: ToothState;
}

export interface PatientDentalFormulaTabProps {
	readonly patientId: string;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly onApplyFindingToDiary?: ((toothNumber: number, state: ToothState, surfaces?: readonly string[]) => void) | undefined;
}
