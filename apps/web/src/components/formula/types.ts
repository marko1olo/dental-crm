/**
 * apps/web/src/components/formula/types.ts
 *
 * Types for Dental Formula (Odontogram) with 100% StomX Defect & Anatomy Parity.
 * Complies with Supreme Law, Mandate 8e (Doctor Autonomy), Mandate 8i, Mandate 8k.
 */

import type {
	CrmToothState,
	StomxAnatomicalSurface,
	StomxAnatomicalTooth,
	StomxDefectCategory,
	StomxDefectColor,
	StomxDefectKey,
	StomxDefectType,
	StomxPositionAnomaly,
	StomxPositionAnomalyCode,
	StomxToothDefect,
	StomxToothDefectItem,
} from "@dental/shared";
import type { ToothData, ToothState } from "../odontogram/ToothChart";

export type {
	CrmToothState,
	StomxAnatomicalSurface,
	StomxAnatomicalTooth,
	StomxDefectCategory,
	StomxDefectColor,
	StomxDefectKey,
	StomxDefectType,
	StomxPositionAnomaly,
	StomxPositionAnomalyCode,
	StomxToothDefect,
	StomxToothDefectItem,
};

export interface ToothFormulaItem {
	toothNumber: number;
	state: ToothState;
	stomxDefects: string[];
	positionAnomaly?: StomxPositionAnomalyCode | undefined;
	surfaces?: string[] | undefined;
	mobility?: 0 | 1 | 2 | 3 | undefined;
	notes?: string | undefined;
	requireTreatment?: boolean | undefined;
}

export type ToothFormulaFilter =
	| "all"
	| "require_treatment"
	| "cured"
	| "anomalies"
	| "healthy";

export type DentitionType = "adult" | "child" | "mixed";

export interface StomxDefectBadge {
	alias: string;
	name: string;
	color: StomxDefectColor;
	category: StomxDefectCategory;
	requireTreatment: boolean;
	badgeBg: string;
	badgeText: string;
	badgeBorder: string;
}

export interface ToothFormulaProps {
	selectedToothNumber?: number | null | undefined;
	onSelectTooth?: ((toothNumber: number) => void) | undefined;
	teethData?: Record<number, ToothFormulaItem> | undefined;
	onUpdateTooth?: ((toothNumber: number, updates: Partial<ToothFormulaItem>) => void) | undefined;
	dentition?: DentitionType | undefined;
	onDentitionChange?: ((dentition: DentitionType) => void) | undefined;
	readOnly?: boolean | undefined;
	className?: string | undefined;
}
