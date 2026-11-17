/**
 * treatmentPlansTabConstants.ts — DTO-контракты, константы и канонический демо-план для вкладки планов лечения.
 * Мандаты 8b, 8zi: Декомпозиция монолита TreatmentPlansTab.tsx по протоколу /decomposer.
 */

import type { TreatmentPlanItem } from "@dental/shared";

export type TierCategory = "economy" | "optimum" | "premium";

export interface TreatmentTierOption {
	id: TierCategory;
	title: string;
	tagline: string;
	totalRub: number;
	warrantyYears: number;
	isRecommended?: boolean;
	accentClass: string;
	badgeText: string;
}

export interface PatientTreatmentPlanStageDto {
	id?: string;
	stageOrder: number;
	stageName: string;
	completionPercentage?: number;
}

export interface PatientTreatmentPlanItemDto {
	id: string;
	toothNumber?: number | null;
	priceId?: string;
	name?: string;
	quantity?: number;
	price?: number;
	discount?: number;
	phase?: number;
	status?: string;
	isCompleted?: boolean;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
}

export interface PatientTreatmentPlanDto {
	id: string;
	patientId: string;
	name: string;
	status: string;
	totalPrice: number;
	createdAt: string;
	updatedAt?: string;
	stages?: PatientTreatmentPlanStageDto[];
	items?: PatientTreatmentPlanItemDto[];
	isAlternative?: boolean;
	alternativeTier?: string | null;
	alternativeStatus?: string;
}

export const EMPTY_PLANS: readonly PatientTreatmentPlanDto[] = [];
export const EMPTY_ITEMS: readonly TreatmentPlanItem[] = [];

export const DEMO_CANONICAL_TREATMENT_PLAN: PatientTreatmentPlanDto = {
	id: "plan-demo-canonical-01",
	patientId: "00000000-0000-0000-0000-000000000001",
	name: "Комплексный терапевтический план санации полости рта",
	status: "approved",
	totalPrice: 34000,
	createdAt: "2026-11-16T10:00:00.000Z",
	stages: [
		{ stageOrder: 1, stageName: "Терапевтическая санация и эндодонтия", completionPercentage: 40 },
		{ stageOrder: 2, stageName: "Ортопедическая реабилитация", completionPercentage: 0 },
	],
	items: [
		{
			id: "item-demo-1",
			toothNumber: 16,
			priceId: "A16.07.002",
			name: "Восстановление зуба пломбой (лечение глубокого кариеса жевательной группы)",
			price: 6500,
			quantity: 1,
			phase: 1,
			status: "proposed",
			doctorName: "Д-р Орлов А.В.",
			doctorSpecialty: "Стоматолог-терапевт",
		},
		{
			id: "item-demo-2",
			toothNumber: 26,
			priceId: "A16.07.030",
			name: "Эндодонтическое лечение 3-канального зуба (механическая и медикаментозная обработка)",
			price: 14500,
			quantity: 1,
			phase: 1,
			status: "proposed",
			doctorName: "Д-р Орлов А.В.",
			doctorSpecialty: "Стоматолог-терапевт",
		},
		{
			id: "item-demo-3",
			toothNumber: 25,
			priceId: "A16.07.002.001",
			name: "Пломбирование кариозной полости современным светоотверждаемым композитом",
			price: 5200,
			quantity: 1,
			phase: 1,
			status: "proposed",
			doctorName: "Д-р Орлов А.В.",
			doctorSpecialty: "Стоматолог-терапевт",
		},
		{
			id: "item-demo-4",
			toothNumber: 46,
			priceId: "A16.07.004",
			name: "Анатомическое восстановление коронковой части зуба со штифтом",
			price: 7800,
			quantity: 1,
			phase: 1,
			status: "proposed",
			doctorName: "Д-р Орлов А.В.",
			doctorSpecialty: "Стоматолог-терапевт",
		},
	],
};
