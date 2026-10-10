/**
 * planFinancialCalculators.ts — чистые функции расчёта сумм по этапам в копейках,
 * скидок, налогового вычета 13%, прогресса выполнения, возраста плана,
 * ортопедических зубов, списка врачей и валидационного пейлоада.
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import {
	generateCompletedWorksActAndWriteOff,
	type CompletedWorksActResult,
	type InventoryItemLookup,
} from "../treatmentPlanMaterialEngine";
import type {
	PatientFinancialContextSummary,
	StageCompletionProgressSummary,
	ToothData,
	TreatmentPlanDoctorOption,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanValidationPayload,
	TreatmentPlanViewTab,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NDFL_TAX_DEDUCTION_RATE = 0.13;

export function calculatePlanAgeDays(planCreatedAtIso?: string): number {
	if (!planCreatedAtIso) return 0;
	const createdTime = new Date(planCreatedAtIso).getTime();
	if (Number.isNaN(createdTime)) return 0;
	return Math.max(0, Math.floor((Date.now() - createdTime) / MS_PER_DAY));
}

export function resolveInitialActiveViewTab(
	initialViewTab?: TreatmentPlanViewTab,
): TreatmentPlanViewTab {
	if (
		typeof window !== "undefined" &&
		typeof window.location?.hash === "string" &&
		window.location.hash.toLowerCase().includes("roadmap")
	) {
		return "roadmap";
	}
	return initialViewTab || "3tier";
}

export function extractPatientFinancialContext(
	patients: any[] | undefined,
	patientId: string,
): PatientFinancialContextSummary {
	const patient = patients?.find((p: any) => p.id === patientId);
	const patientBalanceRub = Math.max(0, Number(patient?.balanceRub) || 0);
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientBirthDate = patient?.birthDate;
	return {
		patient,
		patientBalanceRub,
		patientPhone,
		patientBirthDate,
	};
}

export function calculateStageTotalsKopecks(
	stages: readonly TreatmentPlanStage[],
): number {
	return stages.reduce(
		(sum, s) => sum + (s.totalKopecks ?? Math.round((s.totalRub || 0) * 100)),
		0,
	);
}

export function calculateEffectiveSignTier(
	currentTier: TreatmentPlanTier,
	stages: readonly TreatmentPlanStage[],
): TreatmentPlanTier {
	const totalKopecks = calculateStageTotalsKopecks(stages);
	const totalRub = totalKopecks / 100;
	return {
		...currentTier,
		stages,
		totalRub,
		totalKopecks: totalKopecks as TreatmentPlanTier["totalKopecks"],
	};
}

export function calculateTotalItemsCount(
	stages: readonly TreatmentPlanStage[],
): number {
	return stages.reduce((acc, s) => acc + s.items.length, 0);
}

export function calculateGrandTotalRub(
	stages: readonly TreatmentPlanStage[],
): number {
	return (
		stages.reduce((acc, s) => acc + Math.round((s.totalRub || 0) * 100), 0) / 100
	);
}

export function calculateTaxDeduction13PercentRub(grandTotalRub: number): number {
	const grandTotalKopecks = Math.max(0, Math.round((grandTotalRub || 0) * 100));
	const taxDeductionKopecks = Math.round(grandTotalKopecks * NDFL_TAX_DEDUCTION_RATE);
	return taxDeductionKopecks / 100;
}

export function calculateStageCompletionProgress(
	stages: readonly TreatmentPlanStage[],
): StageCompletionProgressSummary {
	const totalStages = stages.length;
	if (totalStages === 0) {
		return {
			totalStages: 0,
			completedStages: 0,
			inProgressStages: 0,
			completionPercent: 0,
		};
	}
	const completedStages = stages.filter((s) => s.status === "completed").length;
	const inProgressStages = stages.filter((s) => s.status === "in_progress").length;
	const completionPercent = Math.round((completedStages / totalStages) * 100);
	return {
		totalStages,
		completedStages,
		inProgressStages,
		completionPercent,
	};
}

export function resolveDoctorOptions(
	staffRaw: any[] | undefined,
): readonly TreatmentPlanDoctorOption[] {
	const staff = staffRaw ?? [];
	const activeStaff = staff.filter(
		(s) =>
			s.active !== false &&
			(s.role === "doctor" ||
				s.role === "owner" ||
				s.role === "therapist" ||
				s.role === "surgeon" ||
				s.role === "orthopedist" ||
				s.role === "orthodontist"),
	);
	if (activeStaff.length > 0) {
		return activeStaff.map((s) => ({
			id: s.id,
			fullName: s.name || s.fullName || "Врач-стоматолог",
			role: s.role,
			specialty: Array.isArray(s.specialties)
				? s.specialties.join(", ")
				: s.specialty || (s.role === "doctor" ? "Стоматолог" : s.role),
		}));
	}
	return [
		{ id: "doc-therapist-1", fullName: "Д-р Смирнова Е.А.", role: "doctor", specialty: "Терапевт" },
		{ id: "doc-surgeon-1", fullName: "Д-р Барабаш С.В.", role: "doctor", specialty: "Хирург-имплантолог" },
		{ id: "doc-orthopedist-1", fullName: "Д-р Ковалев В.Н.", role: "doctor", specialty: "Ортопед" },
		{ id: "doc-orthodontist-1", fullName: "Д-р Мельникова А.В.", role: "doctor", specialty: "Ортодонт" },
	];
}

export function resolveOrthopedicTeeth(
	stages: readonly TreatmentPlanStage[],
	effectiveTeethData: readonly ToothData[] | undefined,
): number[] {
	const teethFromStages = stages
		.filter((s) => s.stageKind === "stage_3_orthopedics" || s.stageNumber === 3)
		.flatMap((s) => s.items)
		.map((it) => it.toothNumber)
		.filter((t): t is number => typeof t === "number" && t > 0);

	if (teethFromStages.length > 0) {
		return Array.from(new Set(teethFromStages)).sort((a, b) => a - b);
	}

	const teethFromOdontogram = (effectiveTeethData || [])
		.filter((t) => {
			const s = String(t.state || "").toLowerCase();
			return (
				s.includes("crown") ||
				s.includes("bridge") ||
				s.includes("denture") ||
				s.includes("implant") ||
				Boolean((t as any).isCrown) ||
				Boolean((t as any).isBridge)
			);
		})
		.map((t) => (t as any).toothNumber ?? (t as any).id)
		.filter((id): id is number => typeof id === "number" && id > 0);

	if (teethFromOdontogram.length > 0) {
		return Array.from(new Set(teethFromOdontogram)).sort((a, b) => a - b);
	}

	return [21];
}

export interface BuildValidationPayloadParams {
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientId: string;
	readonly patientName: string;
	readonly currentTierTitle: string;
	readonly doctorId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly discountPercent: number;
	readonly planCreatedAtIso?: string | undefined;
}

export function buildTreatmentPlanValidationPayload({
	stages,
	patientId,
	patientName,
	currentTierTitle,
	doctorId,
	doctorFullName,
	discountPercent,
	planCreatedAtIso,
}: BuildValidationPayloadParams): TreatmentPlanValidationPayload {
	const allItems = stages.flatMap((s) => s.items);
	return {
		planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
		planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
		planTitle: currentTierTitle,
		patientId,
		patientName,
		doctorId: doctorId || "doc-01",
		doctorFullName: doctorFullName || "Лечащий врач",
		createdAtIso: planCreatedAtIso || new Date().toISOString(),
		items: allItems.map((it) => ({
			itemId: it.id,
			...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
			code804n: it.code804n,
			serviceTitle: it.name,
			category: it.category,
			planUnitPriceRub: it.unitPriceRub,
			planDiscountPercent: discountPercent,
			planDiscountRub: it.discountRub,
			quantity: it.quantity,
			planLineTotalRub:
				(Math.max(
					0,
					Math.round((it.unitPriceRub || 0) * 100) - Math.round((it.discountRub || 0) * 100),
				) *
					(it.quantity || 1)) /
				100,
		})),
	};
}

export function formatPlanContractNumber(patientId: string): string {
	return `D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;
}

export interface BuildStageCompletedActDataParams {
	readonly selectedActStage: TreatmentPlanStage | null;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly inventoryItems?: unknown;
}

export function buildStageCompletedActData({
	selectedActStage,
	contractNumber,
	patientId,
	patientName,
	doctorFullName,
	clinicName,
	inventoryItems,
}: BuildStageCompletedActDataParams): CompletedWorksActResult | null {
	if (!selectedActStage) return null;
	return generateCompletedWorksActAndWriteOff({
		stage: selectedActStage,
		contractNumber,
		patientId,
		patientName,
		doctorFullName: doctorFullName || "Лечащий врач стоматолог",
		clinicName: clinicName || "Клиника ДЕНТЕ",
		...(Array.isArray(inventoryItems) && inventoryItems.length > 0
			? { inventoryItems: inventoryItems as InventoryItemLookup[] }
			: {}),
	});
}
