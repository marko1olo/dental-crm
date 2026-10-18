/**
 * treatmentPlanAutoGenerator.ts — автоматическая 1-Click генерация этапов плана лечения по одонтограмме.
 * Фасад модульного распила autoGenerator/ (Мандат 8b: все файлы <= 120 строк).
 */

import type { ToothData } from "../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage } from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import { UPPER_ARCH_TEETH, LOWER_ARCH_TEETH, isDeciduousTooth } from "./treatmentPlanServicesCatalog";
import { makeEmptyStage } from "./treatmentPlanItemFactory";
import { DEMO_SHOWCASE_TEETH, setDemoShowcaseMode, isDemoShowcaseMode } from "./autoGenerator/autoGenDemoMode";
import { buildPeriodontalAndHygieneItems } from "./autoGenerator/autoGenPeriodontal";
import { buildDeciduousToothItems } from "./autoGenerator/autoGenPediatric";
import { buildPermanentToothItems } from "./autoGenerator/autoGenPermanentTherapy";
import { processJawMissingTeeth } from "./autoGenerator/autoGenJawProcessor";
import { assembleTreatmentPlanStages } from "./autoGenerator/autoGenStagesBuilder";

export { DEMO_SHOWCASE_TEETH, setDemoShowcaseMode, isDemoShowcaseMode };

export function generateTreatmentPlanStages(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some((t) => (t.state && t.state !== "Healthy" && t.state !== "Filled") || Boolean(t.boneLossLevel && t.boneLossLevel > 0)))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	const hasPathology = effectiveTeeth.some((t) => {
		const s = t.state || "Healthy";
		return (
			(s !== "Healthy" && s !== "Filled") ||
			Boolean(t.boneLossLevel && t.boneLossLevel > 0) ||
			Boolean(t.mobility && t.mobility > 0) ||
			Boolean(t.furcationGrade && t.furcationGrade > 0)
		);
	});

	if (!hasPathology) {
		return [
			makeEmptyStage(1, "stage_1_therapy", "Этап 1: Неотложная терапия и санация", "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена."),
			makeEmptyStage(2, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Хирургическая санация полости рта."),
			makeEmptyStage(3, "stage_3_orthopedics", "Этап 3: Ортопедическая реабилитация", "Ортопедическое восстановление зубных рядов."),
		];
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];
	let hasImplants = false;

	// 1. Пародонтология и гигиена
	const perio = buildPeriodontalAndHygieneItems(effectiveTeeth, catalog, validDiscountPct, isDemo);
	stage1Items.push(...perio.stage1PerioItems);

	// 2. Терапия и эндодонтия по зубам
	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of effectiveTeeth) {
		if (isDeciduousTooth(tooth.toothNumber)) {
			const ped = buildDeciduousToothItems(tooth, catalog, validDiscountPct, isDemo);
			stage1Items.push(...ped.stage1);
			stage2Items.push(...ped.stage2);
			stage3Items.push(...ped.stage3);
			continue;
		}

		const perm = buildPermanentToothItems(tooth, catalog, validDiscountPct, isDemo);
		stage1Items.push(...perm.stage1);
		stage2Items.push(...perm.stage2);
		stage3Items.push(...perm.stage3);
		if (perm.missingUpperTooth) missingUpper.push(perm.missingUpperTooth);
		if (perm.missingLowerTooth) missingLower.push(perm.missingLowerTooth);
	}

	// 3. Хирургия и ортопедия отсутствующих зубов (All-on-4 или имплантаты)
	const upperMissing = processJawMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней", effectiveTeeth, catalog, validDiscountPct, isDemo);
	stage2Items.push(...upperMissing.stage2Items);
	stage3Items.push(...upperMissing.stage3Items);
	if (upperMissing.hasImplants) hasImplants = true;

	const lowerMissing = processJawMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней", effectiveTeeth, catalog, validDiscountPct, isDemo);
	stage2Items.push(...lowerMissing.stage2Items);
	stage3Items.push(...lowerMissing.stage3Items);
	if (lowerMissing.hasImplants) hasImplants = true;

	// 4. Сборка и упаковка этапов
	return assembleTreatmentPlanStages(
		stage1Items,
		stage2Items,
		stage3Items,
		hasImplants,
		catalog,
		validDiscountPct,
		isDemo,
	);
}