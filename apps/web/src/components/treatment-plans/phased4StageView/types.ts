/**
 * types.ts — Типы данных, статусы этапов, таймлайны остеоинтеграции и
 * копеечно-точная агрегация 4-стадийного плана лечения (Layer 0).
 */

import {
	STAGE_CATEGORY_META,
	recalculateTreatmentPlanTotals,
	map3StageKindTo4StageCategory,
	parseKopecks,
	sumKopecks,
	type TreatmentPlanStageCategory,
	type StageCategoryMetadata,
	type Kopecks,
} from "@dental/shared";
import type { TreatmentPlanStage } from "../types";

export interface PhasedStageItem {
	id: string;
	name: string;
	code804n: string;
	toothNumber?: number | undefined;
	category: TreatmentPlanStageCategory;
	priceKopecks: Kopecks;
	priceRub: number;
	durationLabel?: string | undefined;
	clinicalJustification?: string | undefined;
}

export type PhasedStageStatus = "draft" | "agreed" | "in_progress" | "completed";

export interface TreatmentPlanPhased4StageViewProps {
	stages: readonly TreatmentPlanStage[];
	planTierTitle?: string | undefined;
	patientName?: string | undefined;
	/** Возраст плана в днях (для отображения информационного бейджа без блокировки кнопок) */
	planAgeDays?: number | undefined;
	/** Дата создания плана в формате ISO (для честного бейджа возраста сметы) */
	planCreatedAtIso?: string | undefined;
	onToggleStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	/** Переход к выполнению этапа / авто-списанию со склада (Мандат 8e) */
	onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	/** Запись этапа в расписание в 1 клик (Stage-to-Visit 1-Click Booking) */
	onBookStageToVisit?:
		| ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void)
		| undefined;
	/** Открытие кассы / оплаты конкретного этапа (Stage-by-Stage Payment) */
	onOpenStagePayment?:
		| ((category: TreatmentPlanStageCategory, amountRub: number) => void)
		| undefined;
	/** Открытие модалки рассрочки 0% (Фича #444) */
	onOpenInstallment?: ((totalRub: number) => void) | undefined;
	/** Подписание и утверждение комплексного плана (Фича #444) */
	onApproveAndSign?: (() => void) | undefined;
	/** Печать договора и презентации (Фича #444) */
	onPrintContract?: (() => void) | undefined;
	/** Изменение статуса этапа (Черновик -> Согласован -> В работе -> Завершён) */
	onChangeStageStatus?:
		| ((category: TreatmentPlanStageCategory, newStatus: PhasedStageStatus) => void)
		| undefined;
}

export interface PhasedStageCategoryBucket {
	meta: StageCategoryMetadata;
	items: PhasedStageItem[];
	subtotalKopecks: Kopecks;
	subtotalRub: number;
}

export interface CategorizedPhasedPlanData {
	map: Record<TreatmentPlanStageCategory, PhasedStageCategoryBucket>;
	grandTotalKopecks: Kopecks;
	grandTotalRub: number;
	totalItemsCount: number;
}

export type InstallmentMonthsOption = 6 | 12 | 24;

export const CATEGORY_ORDER: readonly TreatmentPlanStageCategory[] = [
	"hygiene_sanitation",
	"endo_therapy",
	"surgery_implant",
	"ortho_prosthetics",
];

export const STAGE_TIMELINE_LABELS: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "1–3 дня",
	endo_therapy: "1–2 недели",
	surgery_implant: "3–6 мес (остеоинтеграция)",
	ortho_prosthetics: "2–3 недели",
};

export const STAGE_TITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "Неотложная помощь и купирование боли / Санация",
	endo_therapy: "Базовая терапия и эндодонтия",
	surgery_implant: "Хирургия, имплантация и пародонтология",
	ortho_prosthetics: "Ортопедия, протезирование и ортодонтия",
};

export const STAGE_SUBTITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation:
		"Купирование острой боли, вскрытие очагов воспаления, удаление безнадёжных зубов и профгигиена",
	endo_therapy:
		"Лечение кариеса, пульпита, ревизия корневых каналов и подготовка под протезирование",
	surgery_implant:
		"Установка дентальных имплантатов, костная пластика, синус-лифтинг и пластика мягких тканей",
	ortho_prosthetics:
		"Цифровое протезирование коронками из диоксида циркония / E.max, виниры и восстановление окклюзии",
};

export const STAGE_STATUS_Order: readonly PhasedStageStatus[] = [
	"draft",
	"agreed",
	"in_progress",
	"completed",
];

export const STAGE_STATUS_META: Record<
	PhasedStageStatus,
	{ label: string; badgeClass: string; dotColor: string }
> = {
	draft: {
		label: "Черновик",
		badgeClass:
			"bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]",
		dotColor: "var(--ink-muted)",
	},
	agreed: {
		label: "Согласован",
		badgeClass:
			"bg-[color-mix(in_srgb,var(--teal)_10%,var(--paper))] text-[var(--teal)] border-[color-mix(in_srgb,var(--teal)_32%,transparent)]",
		dotColor: "var(--teal)",
	},
	in_progress: {
		label: "В работе",
		badgeClass:
			"bg-[color-mix(in_srgb,var(--teal)_16%,var(--paper))] text-[var(--ink)] border-[var(--teal)]",
		dotColor: "var(--teal)",
	},
	completed: {
		label: "Завершён",
		badgeClass:
			"bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--teal)]",
		dotColor: "var(--teal)",
	},
};

export const INITIAL_EXPANDED_STAGES: Record<TreatmentPlanStageCategory, boolean> = {
	hygiene_sanitation: true,
	endo_therapy: true,
	surgery_implant: true,
	ortho_prosthetics: true,
};

export const INITIAL_EXPANDED_CONSUMABLES: Record<TreatmentPlanStageCategory, boolean> = {
	hygiene_sanitation: false,
	endo_therapy: false,
	surgery_implant: false,
	ortho_prosthetics: false,
};

export const INITIAL_STAGE_STATUSES: Record<TreatmentPlanStageCategory, PhasedStageStatus> = {
	hygiene_sanitation: "agreed",
	endo_therapy: "draft",
	surgery_implant: "draft",
	ortho_prosthetics: "draft",
};

export function formatPlanAgeBadge(planAgeDays: number, planCreatedAtIso?: string): string {
	const dateObj = planCreatedAtIso ? new Date(planCreatedAtIso) : new Date();
	const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
	const dateStr = safeDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
	return planAgeDays <= 0 ? `План от ${dateStr} · Сегодня` : `План от ${dateStr} · ${planAgeDays} дн. назад`;
}

/**
 * Классифицирует позиции стадий плана в 4 канонические клинические фазы
 * с копеечно-точным расчётом сумм (0 коп. погрешности, Мандат 8c).
 */
export function categorizePhasedPlanStages(
	stages: readonly TreatmentPlanStage[],
): CategorizedPhasedPlanData {
	const map: Record<TreatmentPlanStageCategory, PhasedStageCategoryBucket> = {
		hygiene_sanitation: {
			meta: STAGE_CATEGORY_META.hygiene_sanitation,
			items: [],
			subtotalKopecks: 0 as Kopecks,
			subtotalRub: 0,
		},
		endo_therapy: {
			meta: STAGE_CATEGORY_META.endo_therapy,
			items: [],
			subtotalKopecks: 0 as Kopecks,
			subtotalRub: 0,
		},
		surgery_implant: {
			meta: STAGE_CATEGORY_META.surgery_implant,
			items: [],
			subtotalKopecks: 0 as Kopecks,
			subtotalRub: 0,
		},
		ortho_prosthetics: {
			meta: STAGE_CATEGORY_META.ortho_prosthetics,
			items: [],
			subtotalKopecks: 0 as Kopecks,
			subtotalRub: 0,
		},
	};

	for (const stage of stages) {
		for (const item of stage.items) {
			let cat: TreatmentPlanStageCategory;
			const lowerName = item.name.toLowerCase();
			if (
				lowerName.includes("острой боли") ||
				lowerName.includes("неотложн") ||
				lowerName.includes("купирован") ||
				lowerName.includes("ампутация пульпы") ||
				lowerName.includes("экстирпация пульпы") ||
				lowerName.includes("пульпотом") ||
				lowerName.includes("вскрытие") ||
				lowerName.includes("дренирован") ||
				lowerName.includes("разрез") ||
				lowerName.includes("периостотом") ||
				lowerName.includes("альвеолит") ||
				lowerName.includes("перикоронит") ||
				lowerName.includes("абсцесс") ||
				lowerName.includes("гемостаз") ||
				lowerName.includes("шинирован") ||
				lowerName.includes("удаление зуба") ||
				item.code804n === "A16.07.016"
			) {
				cat = "hygiene_sanitation";
			} else if (
				item.category === "hygiene" ||
				lowerName.includes("гигиен") ||
				lowerName.includes("air-flow") ||
				lowerName.includes("ультразвук") ||
				lowerName.includes("кюретаж") ||
				lowerName.includes("фторирован")
			) {
				cat = "hygiene_sanitation";
			} else if (
				item.category === "therapy" ||
				lowerName.includes("кариес") ||
				lowerName.includes("пульпит") ||
				lowerName.includes("периодонтит") ||
				lowerName.includes("эндодонт") ||
				lowerName.includes("канал") ||
				lowerName.includes("реставрац") ||
				lowerName.includes("пломб")
			) {
				cat = "endo_therapy";
			} else if (
				item.category === "surgery" ||
				lowerName.includes("имплант") ||
				lowerName.includes("удален") ||
				lowerName.includes("синус") ||
				lowerName.includes("костн") ||
				lowerName.includes("формировател") ||
				lowerName.includes("пластик")
			) {
				cat = "surgery_implant";
			} else if (
				item.category === "ortho" ||
				lowerName.includes("коронк") ||
				lowerName.includes("винир") ||
				lowerName.includes("протез") ||
				lowerName.includes("абатмент") ||
				lowerName.includes("вкладк") ||
				lowerName.includes("брекет") ||
				lowerName.includes("элайнер") ||
				lowerName.includes("сплинт") ||
				lowerName.includes("шин")
			) {
				cat = "ortho_prosthetics";
			} else {
				cat = map3StageKindTo4StageCategory(stage.stageKind, item.name);
			}

			const rawPrice =
				(item as any).priceRub ??
				(item as any).unitPriceRub ??
				(item as any).totalPriceRub ??
				0;
			const qty = (item as any).quantity || 1;
			const discount = (item as any).discountRub || 0;
			const unitKop = parseKopecks(rawPrice);
			const discKop = parseKopecks(discount);
			const lineTotalKop = Math.max(0, unitKop * qty - discKop) as Kopecks;
			const itemRub = Math.round(lineTotalKop / 100);

			map[cat].items.push({
				id: item.id,
				name: item.name,
				code804n: item.code804n,
				toothNumber: item.toothNumber,
				category: cat,
				priceKopecks: lineTotalKop,
				priceRub: itemRub,
				durationLabel: STAGE_TIMELINE_LABELS[cat],
				clinicalJustification: stage.clinicalGoal,
			});
		}
	}

	const stagesInput = CATEGORY_ORDER.map((cat, idx) => ({
		id: `stage-${idx + 1}`,
		category: cat,
		items: map[cat].items.map((i) => ({
			unitPriceKopecks: i.priceKopecks,
			quantity: 1,
			discountKopecks: 0 as Kopecks,
			totalPriceKopecks: i.priceKopecks,
			status: "pending" as const,
		})),
	}));

	const recalc = recalculateTreatmentPlanTotals(stagesInput as any);
	for (const stageRes of recalc.stages) {
		const stageCat = (stageRes as any).category as TreatmentPlanStageCategory;
		if (stageCat && map[stageCat]) {
			const kop = (stageRes as any).totalPriceKopecks ?? (stageRes as any).subtotalKopecks ?? 0;
			map[stageCat].subtotalKopecks = kop;
			map[stageCat].subtotalRub = Math.round(kop / 100);
		}
	}

	const grandTotalKopecks = sumKopecks(
		CATEGORY_ORDER.map((c) => map[c].subtotalKopecks),
	);
	const grandTotalRub = Math.round(grandTotalKopecks / 100);
	const totalItemsCount = CATEGORY_ORDER.reduce(
		(acc, c) => acc + map[c].items.length,
		0,
	);

	return {
		map,
		grandTotalKopecks,
		grandTotalRub,
		totalItemsCount,
	};
}
