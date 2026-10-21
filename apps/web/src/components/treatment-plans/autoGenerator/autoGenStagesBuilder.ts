import { parseKopecks, sumKopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Собирает и упаковывает финальные 3 клинических этапа плана лечения.
 */
export function assembleTreatmentPlanStages(
	stage1Items: TreatmentPlanItem[],
	stage2Items: TreatmentPlanItem[],
	stage3Items: TreatmentPlanItem[],
	hasImplants: boolean,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	// Добавляем 3D-сканирование в начало Этапа 3, если есть ортопедия
	if (stage3Items.length > 0) {
		const defScan = DENTAL_SERVICES_CATALOG.IntraoralScanning3D!;
		stage3Items.unshift(
			createPlanItem("s3-intraoral-scan", 3, "stage_3_orthopedics", defScan, undefined, catalog, validDiscountPct, {
				customTitle: "Оптическое внутриротовое 3D-сканирование зубных рядов и регистрация прикуса",
				isDemoMode: isDemo,
			}),
		);
	}

	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1TotalRub = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2TotalRub = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3TotalRub = Math.round(s3TotalKopecks / 100);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle: "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена, лечение кариеса и эндодонтия корневых каналов.",
		clinicalGoal: "Ликвидация очагов острой боли и хронической инфекции, антисептическая санация.",
		items: stage1Items,
		totalRub: s1TotalRub,
		totalKopecks: s1TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		serviceCatalogCodes: Array.from(new Set(stage1Items.map((i) => i.serviceCode || i.code804n || ""))),
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n || i.serviceCode || ""))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Атравматичное удаление корней, 3D-навигационный шаблон, дентальная имплантация. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация, атравматичное удаление разрушенных зубов и корней с консервацией лунок.",
		clinicalGoal: hasImplants
			? "Восстановление костной опоры и установка дентальных имплантатов с фиксацией периода остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация и подготовка альвеолярного отростка.",
		items: stage2Items,
		totalRub: s2TotalRub,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2, // 16 недель = 4 месяца (3–6 мес интервал)
		serviceCatalogCodes: Array.from(new Set(stage2Items.map((i) => i.serviceCode || i.code804n || ""))),
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n || i.serviceCode || ""))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Внутриротовое цифровое 3D-сканирование, установка постоянных коронок, мостовидных протезов и конструкций на имплантатах.",
		clinicalGoal: "Восстановление анатомической формы зубного ряда, окклюзии и жевательной эффективности.",
		items: stage3Items,
		totalRub: s3TotalRub,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		serviceCatalogCodes: Array.from(new Set(stage3Items.map((i) => i.serviceCode || i.code804n || ""))),
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n || i.serviceCode || ""))),
	};

	return [stage1, stage2, stage3];
}
