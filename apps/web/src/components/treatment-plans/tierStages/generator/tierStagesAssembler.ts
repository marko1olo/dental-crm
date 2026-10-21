import { parseKopecks, sumKopecks } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanTierId } from "../../types";
import type { TierGeneratorContext } from "./types";

export function assembleTierStages(
	ctx: TierGeneratorContext,
	hasImplants: boolean,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const { tierId, stage1Items, stage2Items, stage3Items } = ctx;

	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1Total = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2Total = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3Total = Math.round(s3TotalKopecks / 100);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle:
			tierId === "optimum"
				? "Лечение под микроскопом Leica, КЛКТ 3D-диагностика, швейцарская гигиена Air-Flow и реставрации."
				: "Базовая терапия, устранение боли, гигиена и пломбирование.",
		clinicalGoal: "Устранение очагов воспаления и санация кариозных поражений.",
		items: stage1Items,
		totalRub: s1Total,
		totalKopecks: s1TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		serviceCatalogCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Дентальная имплантация по 3D-шаблону. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация полости рта.",
		clinicalGoal: "Установка дентальных имплантатов и подготовка костного ложа.",
		items: stage2Items,
		totalRub: s2Total,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2,
		serviceCatalogCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle:
			tierId === "optimum"
				? "Цифровой 3D-скан TRIOS, индивидуальные Ti-Base абатменты и премиальные коронки IPS e.max / Katana."
				: "Ортопедическое восстановление зубов и мостовидных протезов.",
		clinicalGoal: "Анатомическое протезирование и окклюзионная реабилитация.",
		items: stage3Items,
		totalRub: s3Total,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		serviceCatalogCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}
