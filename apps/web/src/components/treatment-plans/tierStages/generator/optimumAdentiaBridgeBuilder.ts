import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function buildOptimum3ToothBridge(
	tooth1: number,
	tooth2: number,
	tooth3: number,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage2Items, stage3Items, markHasImplants } = ctx;
	markHasImplants();

	const defGuide = SERVICES_CATALOG_DICTIONARY.SurgicalNavigationGuide!;
	stage2Items.push(
		createPlanItem("s2-guide-" + tooth1, 2, "stage_2_surgery", defGuide, tooth1, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defImpPrem = SERVICES_CATALOG_DICTIONARY.DentalImplantationPremium!;
	stage2Items.push(
		createPlanItem(
			"s2-imp-opt-" + tooth1,
			2,
			"stage_2_surgery",
			defImpPrem,
			tooth1,
			catalog,
			validDiscountPct,
			{
				customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth1,
				isDemoMode: isDemo,
			},
		),
	);
	stage2Items.push(
		createPlanItem(
			"s2-imp-opt-" + tooth3,
			2,
			"stage_2_surgery",
			defImpPrem,
			tooth3,
			catalog,
			validDiscountPct,
			{
				customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth3,
				isDemoMode: isDemo,
			},
		),
	);

	const defBridge = SERVICES_CATALOG_DICTIONARY.BridgeProsthesis!;
	stage3Items.push(
		createPlanItem(
			"s3-bridge-opt-" + tooth1 + "-" + tooth3,
			3,
			"stage_3_orthopedics",
			defBridge,
			tooth1,
			catalog,
			validDiscountPct,
			{
				customTitle: "Премиальный мостовидный протез E.max / Katana UTML на 2 имплантатах Straumann (№" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
				relatedToothNumbers: [tooth1, tooth2, tooth3],
				isDemoMode: isDemo,
			},
		),
	);
}
