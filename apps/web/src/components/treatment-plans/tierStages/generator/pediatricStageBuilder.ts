import type { ToothState } from "../../../odontogram/ToothChart";
import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handlePediatricTooth(
	num: number,
	state: ToothState,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage1Items, stage2Items, stage3Items } = ctx;

	if (state === "Caries") {
		const defPed = SERVICES_CATALOG_DICTIONARY.PediatricCariesTherapy!;
		stage1Items.push(createPlanItem("s1-ped-" + num, 1, "stage_1_therapy", defPed, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else if (state === "Pulpitis") {
		const defPulp = SERVICES_CATALOG_DICTIONARY.PediatricPulpitisPulpotomy!;
		stage1Items.push(createPlanItem("s1-ped-pulp-" + num, 1, "stage_1_therapy", defPulp, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
		const defCrown = SERVICES_CATALOG_DICTIONARY.PediatricCrownSSC!;
		stage3Items.push(createPlanItem("s3-ped-crown-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else if (state === "Periodontitis" || state === "Root" || state === "Retained") {
		const defExt = SERVICES_CATALOG_DICTIONARY.PediatricExtraction!;
		stage2Items.push(createPlanItem("s2-ped-ext-" + num, 2, "stage_2_surgery", defExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}
}
