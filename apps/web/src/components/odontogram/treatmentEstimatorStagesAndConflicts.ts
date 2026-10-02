/*
 * treatmentEstimatorStagesAndConflicts.ts — Клинические этапы, СтАР-гарантии, экспорт в кассу 54-ФЗ, конфликты зубов-призраков и коллизии.
 * Мандаты 8b, 8e: <= 800 строк, модульность, копеечная точность.
 */

import {
	type Kopecks,
	parseKopecks,
} from "@dental/shared";
import {
	PLAN_SERVICE_RULES,
	type PlanPriceCatalogItem,
} from "../treatment-plans/planPricing";
import type {
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "../treatment-plans/types";
import {
	type EstimatorRule,
	type EstimatorSuggestionKey,
	isDeciduousFdiToothNumber,
} from "./treatmentEstimatorRules";
import {
	type EstimatorToothInput,
	type PlanItem,
	planItemFromRule,
} from "./treatmentEstimatorCatalogMatching";
import {
	type EstimatorContract,
	estimatorRowMoney,
	safeKopecks,
} from "./treatmentEstimatorMoney";

export type TreatmentStageId =
	| "stage_1_therapy"
	| "stage_2_endo"
	| "stage_3_surgery"
	| "stage_4_orthopedics"
	| "stage_5_hygiene";

export interface TreatmentStageSummary {
	readonly stageId: TreatmentStageId;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly phase: number;
	readonly items: readonly PlanItem[];
	readonly grossKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly payableKopecks: Kopecks;
	readonly dmsCoveredKopecks: Kopecks;
	readonly grossRub: number;
	readonly payableRub: number;
	readonly incompleteRowsCount: number;
}

export function resolveStageIdForItem(item: PlanItem): TreatmentStageId {
	const nameLower = (item.name || "").toLowerCase();
	const cat = (item.category || "").toLowerCase();

	if (
		nameLower.includes("гигиен") ||
		nameLower.includes("чистк") ||
		nameLower.includes("airflow") ||
		cat === "hygiene"
	) {
		return "stage_5_hygiene";
	}

	if (
		nameLower.includes("коронк") ||
		nameLower.includes("протез") ||
		nameLower.includes("e.max") ||
		nameLower.includes("циркон") ||
		nameLower.includes("вкладк") ||
		nameLower.includes("винир") ||
		nameLower.includes("абатмент") ||
		cat === "prosthetics" ||
		item.suggestion === "crown" ||
		item.phase === 3
	) {
		return "stage_4_orthopedics";
	}

	if (
		nameLower.includes("имплант") ||
		nameLower.includes("шаблон") ||
		nameLower.includes("удален") ||
		nameLower.includes("синус") ||
		nameLower.includes("хирург") ||
		cat === "surgery" ||
		item.suggestion === "implant" ||
		item.suggestion === "implantGuide" ||
		item.phase === 2
	) {
		return "stage_3_surgery";
	}

	if (
		nameLower.includes("пульпит") ||
		nameLower.includes("периодонтит") ||
		nameLower.includes("канал") ||
		nameLower.includes("обтурац") ||
		nameLower.includes("эндодонт") ||
		item.suggestion === "pulpitis" ||
		item.suggestion === "periodontitis"
	) {
		return "stage_2_endo";
	}

	return "stage_1_therapy";
}

export const STAGE_DEFINITIONS: Record<
	TreatmentStageId,
	{ titleRu: string; descriptionRu: string; phase: number }
> = {
	stage_1_therapy: {
		titleRu: "Этап I: Терапевтическая санация (кариес, реставрации)",
		descriptionRu: "Лечение кариозных поражений, эстетическая реставрация композитами светового отверждения",
		phase: 1,
	},
	stage_2_endo: {
		titleRu: "Этап II: Эндодонтическое лечение (каналы)",
		descriptionRu: "Инструментальная и антисептическая обработка каналов, 3D-обтурация гуттаперчей",
		phase: 1,
	},
	stage_3_surgery: {
		titleRu: "Этап III: Хирургический этап (имплантация и костная пластика)",
		descriptionRu: "Атравматичное удаление, установка дентальных имплантатов по навигационному шаблону",
		phase: 2,
	},
	stage_4_orthopedics: {
		titleRu: "Этап IV: Ортопедическая реабилитация (протезирование)",
		descriptionRu: "Восстановление анатомии и функции коронками из диоксида циркония и керамики E.max",
		phase: 3,
	},
	stage_5_hygiene: {
		titleRu: "Этап V: Профессиональная гигиена и пародонтология",
		descriptionRu: "Снятие над- и поддесневых зубных отложений ультразвуком и AirFlow, реминерализация",
		phase: 1,
	},
};

export function estimatorStagesBreakdown(
	items: readonly PlanItem[],
	contract: EstimatorContract,
): readonly TreatmentStageSummary[] {
	const stageMap = new Map<TreatmentStageId, PlanItem[]>();
	for (const id of Object.keys(STAGE_DEFINITIONS) as TreatmentStageId[]) {
		stageMap.set(id, []);
	}

	for (const it of items) {
		const stageId = resolveStageIdForItem(it);
		const list = stageMap.get(stageId) ?? [];
		list.push(it);
		stageMap.set(stageId, list);
	}

	return (Object.keys(STAGE_DEFINITIONS) as TreatmentStageId[]).map((stageId) => {
		const def = STAGE_DEFINITIONS[stageId];
		const stageItems = stageMap.get(stageId) ?? [];

		let grossKopecks = 0 as Kopecks;
		let discountKopecks = 0 as Kopecks;
		let payableKopecks = 0 as Kopecks;
		let incompleteRowsCount = 0;

		for (const it of stageItems) {
			const m = estimatorRowMoney(it, contract);
			if (!m.known) {
				incompleteRowsCount += 1;
				continue;
			}
			grossKopecks = (grossKopecks + m.lineKopecks) as Kopecks;
			const disc = safeKopecks(it.discount) ?? (0 as Kopecks);
			discountKopecks = (discountKopecks + disc) as Kopecks;
			payableKopecks = (payableKopecks + m.payableKopecks) as Kopecks;
		}

		const dmsCoveredKopecks = Math.max(0, grossKopecks - payableKopecks) as Kopecks;

		return {
			stageId,
			titleRu: def.titleRu,
			descriptionRu: def.descriptionRu,
			phase: def.phase,
			items: stageItems,
			grossKopecks,
			discountKopecks,
			payableKopecks,
			dmsCoveredKopecks,
			grossRub: Math.round(grossKopecks / 100),
			payableRub: Math.round(payableKopecks / 100),
			incompleteRowsCount,
		};
	});
}

export interface TreatmentWarrantyInfo {
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly categoryRu: string;
	readonly termsDescription: string;
	readonly isManufacturerLifetimeWarranty?: boolean;
}

export function calculateTreatmentWarranty(item: PlanItem): TreatmentWarrantyInfo {
	const nameLower = (item.name || "").toLowerCase();
	const cat = (item.category || "").toLowerCase();

	if (nameLower.includes("имплант") || item.suggestion === "implant") {
		return {
			warrantyMonths: 36,
			serviceLifeMonths: 120,
			categoryRu: "Дентальная имплантация",
			termsDescription: "Гарантия клиники на остеоинтеграцию 3 года при условии прохождения профгигиены каждые 6 мес. Пожизненная гарантия производителя на титановый имплантат.",
			isManufacturerLifetimeWarranty: true,
		};
	}

	if (
		nameLower.includes("коронк") ||
		nameLower.includes("протез") ||
		nameLower.includes("e.max") ||
		nameLower.includes("циркон") ||
		nameLower.includes("винир") ||
		cat === "prosthetics" ||
		item.suggestion === "crown"
	) {
		return {
			warrantyMonths: 24,
			serviceLifeMonths: 60,
			categoryRu: "Ортопедическая конструкция",
			termsDescription: "Гарантия на целостность коронки/вкладки 24 месяца в соответствии с клиническими рекомендациями СтАР.",
		};
	}

	if (
		nameLower.includes("пульпит") ||
		nameLower.includes("периодонтит") ||
		nameLower.includes("канал") ||
		item.suggestion === "pulpitis" ||
		item.suggestion === "periodontitis"
	) {
		return {
			warrantyMonths: 12,
			serviceLifeMonths: 36,
			categoryRu: "Эндодонтическое лечение",
			termsDescription: "Гарантия 12 месяцев при обязательном последующем покрытии зуба коронкой/вкладкой в течение 3 месяцев.",
		};
	}

	if (
		nameLower.includes("кариес") ||
		nameLower.includes("пломб") ||
		item.suggestion === "caries"
	) {
		return {
			warrantyMonths: 12,
			serviceLifeMonths: 24,
			categoryRu: "Терапевтическая реставрация",
			termsDescription: "Гарантия 12 месяцев на краевое прилегание и стабильность цвета фотополимерной пломбы по ГОСТ Р 52623.4-2015.",
		};
	}

	return {
		warrantyMonths: 6,
		serviceLifeMonths: 12,
		categoryRu: "Стоматологическая процедура",
		termsDescription: "Стандартный гарантийный срок согласно Положению об оказании медицинских услуг клиники.",
	};
}

export interface Cashier54FzExportPayload {
	readonly patientId: string;
	readonly patientName: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly discountPercent: number;
	readonly createdAtIso: string;
}

export function exportEstimatorToCashier54Fz(
	items: readonly PlanItem[],
	patientId: string,
	patientName: string,
	discountPercent = 0,
): Cashier54FzExportPayload {
	const validItems = items.filter((it) => it.price !== null && it.price > 0);
	const mapped: TreatmentPlanItem[] = validItems.map((it, idx) => {
		const unitPrice = it.price ?? 0;
		const qty = it.quantity || 1;
		const gross = unitPrice * qty;
		const disc = it.discount || (discountPercent > 0 ? Math.round((gross * discountPercent) / 100) : 0);
		const netPrice = Math.max(0, gross - disc);
		const stageId = resolveStageIdForItem(it);
		const stageKind: TreatmentPlanStageKind =
			stageId === "stage_3_surgery"
				? "stage_2_surgery"
				: stageId === "stage_4_orthopedics"
					? "stage_3_orthopedics"
					: "stage_1_therapy";

		const category =
			it.category ||
			(stageId === "stage_3_surgery"
				? "Хирургия"
				: stageId === "stage_4_orthopedics"
					? "Ортопедия"
					: "Терапия");

		return {
			id: it.id || `est-item-${idx + 1}`,
			name: it.name,
			category,
			priceRub: netPrice,
			unitPriceRub: unitPrice,
			discountRub: disc,
			quantity: qty,
			phase: it.phase,
			code804n:
				it.category === "surgery"
					? "A16.07.054.001"
					: it.category === "prosthetics"
						? "A16.07.004.001"
						: "A16.07.002.001",
			...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
			stageKind,
			...(it.priceId ? { priceId: it.priceId } : {}),
			...(it.isAuto !== undefined ? { isAuto: it.isAuto } : {}),
		};
	});

	const totalRub = mapped.reduce((acc, i) => acc + i.priceRub, 0);
	const totalKopecks = parseKopecks(totalRub);

	return {
		patientId,
		patientName,
		items: mapped,
		totalRub,
		totalKopecks,
		discountPercent,
		createdAtIso: new Date().toISOString(),
	};
}

export function isToothMissingOrExtracted(state?: string | null): boolean {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s === "missing" ||
		s === "extracted" ||
		s === "удален" ||
		s === "удалён" ||
		s === "отсутствует"
	);
}

export interface GhostToothConflict {
	readonly toothNumber: number;
	readonly toothState: string;
	readonly itemName: string;
	readonly itemSuggestion?: EstimatorSuggestionKey | undefined;
	readonly warningBadgeText: string;
	readonly message: string;
	readonly replacementKind: "implant" | "bridge_or_prosthesis";
}

export function getGhostToothConflict(
	item: PlanItem,
	teeth: readonly EstimatorToothInput[],
): GhostToothConflict | null {
	if (item.toothNumber === undefined) return null;
	const tooth = teeth.find((t) => t.toothNumber === item.toothNumber);
	if (!tooth || !isToothMissingOrExtracted(tooth.state)) return null;

	if (item.suggestion === "implant" || item.suggestion === "implantGuide") {
		return null;
	}
	const nameLower = (item.name || "").toLowerCase();
	if (
		nameLower.includes("имплант") ||
		nameLower.includes("шаблон") ||
		nameLower.includes("синус") ||
		nameLower.includes("протез съемн") ||
		nameLower.includes("бюгель") ||
		nameLower.includes("мостовидн")
	) {
		return null;
	}

	let treatmentKind = "терапии";
	if (
		item.suggestion === "crown" ||
		nameLower.includes("коронк") ||
		nameLower.includes("вкладк")
	) {
		treatmentKind = "коронки";
	} else if (
		item.suggestion === "caries" ||
		nameLower.includes("кариес") ||
		nameLower.includes("пломб")
	) {
		treatmentKind = "пломбы";
	} else if (
		item.suggestion === "pulpitis" ||
		item.suggestion === "periodontitis" ||
		nameLower.includes("пульпит") ||
		nameLower.includes("канал") ||
		nameLower.includes("эндодонт")
	) {
		treatmentKind = "эндодонтии";
	}

	const warningBadgeText = `Зуб ${item.toothNumber} удален на формуле! Требуется корректировка плана (имплантация/мостовидный протез вместо ${treatmentKind})`;
	const message = `На зуб #${item.toothNumber} назначена услуга «${item.name}», однако в зубной формуле этот зуб отмечен как удаленный (${tooth.state}). Требуется корректировка плана (имплантация/мостовидный протез вместо ${treatmentKind}), либо восстановление статуса зуба на формуле (врачебная автономия).`;

	return {
		toothNumber: item.toothNumber,
		toothState: tooth.state,
		itemName: item.name,
		itemSuggestion: item.suggestion,
		warningBadgeText,
		message,
		replacementKind: "implant",
	};
}

export function detectGhostTeethConflicts(
	items: readonly PlanItem[],
	teeth: readonly EstimatorToothInput[],
): readonly GhostToothConflict[] {
	const conflicts: GhostToothConflict[] = [];
	for (const item of items) {
		const conflict = getGhostToothConflict(item, teeth);
		if (conflict) conflicts.push(conflict);
	}
	return conflicts;
}

export type { PlanPriceCatalogItem };

export function convertGhostItemToImplant(
	item: PlanItem,
	catalog: readonly PlanPriceCatalogItem[],
): PlanItem {
	if (item.toothNumber === undefined) return item;
	if (isDeciduousFdiToothNumber(item.toothNumber)) {
		const { suggestion: _removedSuggestion, ...rest } = item;
		return {
			...rest,
			name: `Удаление корня молочного зуба ${item.toothNumber}`,
			phase: 2,
		};
	}
	const implantRule: EstimatorRule = {
		key: "implant",
		phase: 2,
		match: PLAN_SERVICE_RULES.Planned_Implant ?? {
			category: "surgery",
			keywords: ["имплант"],
			humanName: "установка имплантата",
		},
	};
	return planItemFromRule(
		implantRule,
		{ toothNumber: item.toothNumber, state: "Planned_Implant" },
		catalog,
	);
}

export interface PlanItemCollision {
	readonly toothNumber: number;
	readonly items: readonly PlanItem[];
	readonly type: "preservation_vs_replacement" | "duplicate_treatment";
	readonly messageRu: string;
}

export function detectPlanItemCollisions(
	items: readonly PlanItem[],
): readonly PlanItemCollision[] {
	const itemsByTooth = new Map<number, PlanItem[]>();
	for (const item of items) {
		if (item.toothNumber === undefined) continue;
		const list = itemsByTooth.get(item.toothNumber) ?? [];
		list.push(item);
		itemsByTooth.set(item.toothNumber, list);
	}

	const collisions: PlanItemCollision[] = [];
	for (const [toothNumber, toothItems] of itemsByTooth.entries()) {
		if (toothItems.length <= 1) continue;

		const hasPreservation = toothItems.some(
			(i) =>
				i.suggestion === "caries" ||
				i.suggestion === "pulpitis" ||
				i.suggestion === "periodontitis" ||
				i.suggestion === "crown" ||
				(i.name || "").toLowerCase().includes("пломб") ||
				(i.name || "").toLowerCase().includes("вкладк") ||
				(i.name || "").toLowerCase().includes("коронк"),
		);

		const hasReplacementOrExtraction = toothItems.some(
			(i) =>
				i.suggestion === "implant" ||
				i.suggestion === "implantGuide" ||
				(i.name || "").toLowerCase().includes("имплант") ||
				(i.name || "").toLowerCase().includes("удален") ||
				(i.name || "").toLowerCase().includes("съемн") ||
				(i.name || "").toLowerCase().includes("протез"),
		);

		if (hasPreservation && hasReplacementOrExtraction) {
			collisions.push({
				toothNumber,
				items: toothItems,
				type: "preservation_vs_replacement",
				messageRu: `Зуб ${toothNumber}: коллизия альтернативных планов (сохранение vs удаление/имплантация). Проверьте сценарий лечения во избежание задвоения сметы.`,
			});
		} else {
			const keys = toothItems.map((i) => i.suggestion ?? i.priceId ?? i.name);
			const hasDupes = keys.some((k, idx) => keys.indexOf(k) !== idx);
			if (hasDupes) {
				collisions.push({
					toothNumber,
					items: toothItems,
					type: "duplicate_treatment",
					messageRu: `Зуб ${toothNumber}: задвоение одинаковых услуг в смете.`,
				});
			}
		}
	}

	return collisions;
}

export function resolvePlanItemCollision(
	items: readonly PlanItem[],
	toothNumber: number,
	keepItemIndexOrId: number | string,
): PlanItem[] {
	return items.filter((item, idx) => {
		if (item.toothNumber !== toothNumber) return true;
		if (typeof keepItemIndexOrId === "number") {
			return idx === keepItemIndexOrId;
		}
		return item.id === keepItemIndexOrId;
	});
}
