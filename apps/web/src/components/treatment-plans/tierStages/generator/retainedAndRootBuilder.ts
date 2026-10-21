import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleRootTooth(
	num: number,
	ctx: TierGeneratorContext,
	missingUpper: number[],
	missingLower: number[],
): void {
	const { catalog, validDiscountPct, isDemo, stage2Items } = ctx;
	const defExt = SERVICES_CATALOG_DICTIONARY.SimpleExtraction!;
	stage2Items.push(
		createPlanItem(
			"s2-root-" + num,
			2,
			"stage_2_surgery",
			defExt,
			num,
			catalog,
			validDiscountPct,
			{
				customTitle: "Атравматичное удаление корня зуба №" + num,
				isDemoMode: isDemo,
			},
		),
	);
	const quadrant = Math.floor(num / 10);
	if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
	else missingLower.push(num);
}

export function handleRetainedTooth(
	num: number,
	ctx: TierGeneratorContext,
): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage2Items } = ctx;
	const defComplexExt = SERVICES_CATALOG_DICTIONARY.ComplexExtraction!;
	if (tierId === "optimum") {
		stage2Items.push(
			createPlanItem(
				"s2-impacted-" + num,
				2,
				"stage_2_surgery",
				defComplexExt,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Пьезохирургическое атравматичное удаление ретенированного зуба №" + num + " под операционным микроскопом",
					customPriceRub: 15000,
					isDemoMode: isDemo,
				},
			),
		);
		const defBoneGraft = SERVICES_CATALOG_DICTIONARY.BoneGraftingSinusLift!;
		stage2Items.push(
			createPlanItem(
				"s2-bonegraft-" + num,
				2,
				"stage_2_surgery",
				defBoneGraft,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Направленная костная регенерация (GBR) лунки зуба №" + num + " (Geistlich Bio-Oss + биомембрана Bio-Gide)",
					isDemoMode: isDemo,
				},
			),
		);
	} else {
		stage2Items.push(
			createPlanItem(
				"s2-impacted-" + num,
				2,
				"stage_2_surgery",
				defComplexExt,
				num,
				catalog,
				validDiscountPct,
				{ isDemoMode: isDemo },
			),
		);
	}
}
