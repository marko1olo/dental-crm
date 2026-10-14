/**
 * labOrderCreateTypes.ts — Строгие типы и контракты создания зуботехнического наряд-заказа (ЗТЛ).
 * 
 * Соблюдение Mandate 8b (<= 500 строк), Mandate 8e (Автономия врача),
 * интеграция со стандартами FDI, шкалой VITA Classical/Bleach/3D-Master и ГОСТ.
 */

import type {
	OrthopedicWorkTypeId,
	LabWorkflowStatus,
	DentalLabWorkflowOrder,
} from "../dentalLabWorkflowEngine";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";

export type {
	OrthopedicWorkTypeId,
	LabWorkflowStatus,
	DentalLabWorkflowOrder,
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
};

export interface DentalLabCreateOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCreateOrder: (order: DentalLabWorkflowOrder) => void;
	readonly sampleLabs?: readonly string[] | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
}

export interface LabOrderFormState {
	patientName: string;
	chartNumber: string;
	doctorName: string;
	labName: string;
	workType: OrthopedicWorkTypeId;
	teethInput: string;
	selectedTeeth: number[];
	isBridge: boolean;
	shade: string;
	stumpShade: string;
	priceRub: number;
	costRub: number;
	doctorPercent: number;
	initialStatus: LabWorkflowStatus;
	expectedLabDate: string;
	fittingDate: string;
	autoBookFitting: boolean;
	appointmentId: string;
	clinicalNotes: string;
	implantPlatform: ImplantPlatformType | "";
	abutmentType: AbutmentCategoryType | "";
	fixationType: FixationType | "";
	techStage: LabTechnologicalStageId;
}

export interface LabOrderQuickPreset {
	id: string;
	labelRu: string;
	workType: OrthopedicWorkTypeId;
	shade: string;
	stumpShade?: string;
	days: number;
	tooltip: string;
}

export const LAB_ORDER_QUICK_PRESETS: readonly LabOrderQuickPreset[] = [
	{
		id: "zirconia_katana",
		labelRu: "ZrO₂ Katana (A2, 5 дн.)",
		workType: "crown_zirconia",
		shade: "A2",
		stumpShade: "ND2",
		days: 5,
		tooltip: "Коронка ZrO2 Katana ML: 5 раб. дн., цвет А2, 22 000 ₽",
	},
	{
		id: "emax_press",
		labelRu: "e.max Press (A1, 5 дн.)",
		workType: "crown_emax",
		shade: "A1",
		stumpShade: "ND1",
		days: 5,
		tooltip: "Коронка IPS e.max Press: 5 раб. дн., цвет А1, 24 000 ₽",
	},
	{
		id: "metal_ceramic",
		labelRu: "Металлокерамика (A3, 6 дн.)",
		workType: "metal_ceramic",
		shade: "A3",
		stumpShade: "ND2",
		days: 6,
		tooltip: "Металлокерамика Co-Cr: 6 раб. дн., цвет А3, 14 000 ₽",
	},
	{
		id: "temporary_pmma",
		labelRu: "Временная PMMA (2 дн.)",
		workType: "temporary_pmma",
		shade: "A2",
		stumpShade: "ND2",
		days: 2,
		tooltip: "Временная коронка PMMA CAD/CAM: 2 раб. дн., цвет А2, 2 500 ₽",
	},
];
