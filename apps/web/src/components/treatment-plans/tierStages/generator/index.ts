import type { ToothData, ToothState } from "../../../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { DEMO_SHOWCASE_TEETH, isDemoShowcaseMode, generateTreatmentPlanStages } from "../../treatmentPlanAutoGenerator";
import { ORDER_804N_DICTIONARY, SERVICES_CATALOG_DICTIONARY, UPPER_ARCH_TEETH, LOWER_ARCH_TEETH, isDeciduousTooth } from "../../treatmentPlanServicesCatalog";
import { createPlanItem, makeEmptyStage } from "../../treatmentPlanItemFactory";
import { getDefaultClinicalPresetStages } from "../clinicalPresets";
import { normalizeToothState, hasToothDefect } from "../toothStateHelpers";
import type { TierGeneratorContext } from "./types";
import { handlePediatricTooth } from "./pediatricStageBuilder";
import { handleRootTooth, handleRetainedTooth } from "./retainedAndRootBuilder";
import { handleCariesTooth, handleCrownTooth } from "./cariesAndCrownBuilder";
import { handleEndoTooth } from "./endoStageBuilder";
import { processTierMissingTeeth } from "./adentiaTierBuilder";
import { assembleTierStages } from "./tierStagesAssembler";

export function generateTierPlanStages(
	tierId: TreatmentPlanTierId,
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some(hasToothDefect))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	const hasPathology = (effectiveTeeth || []).some(hasToothDefect);
	if (!hasPathology) {
		if (options?.isDemoMode === false) {
			return [
				makeEmptyStage(1, "stage_1_therapy", "Этап I: Терапия и санация", "Санация полости рта"),
				makeEmptyStage(2, "stage_2_surgery", "Этап II: Хирургия и имплантация", "Хирургический этап"),
				makeEmptyStage(3, "stage_3_orthopedics", "Этап III: Ортопедия и протезирование", "Ортопедический этап"),
			];
		}
		return getDefaultClinicalPresetStages(tierId, catalog, validDiscountPct, { isDemoMode: isDemo });
	}

	if (tierId === "standard") {
		return generateTreatmentPlanStages(effectiveTeeth, catalog, discountPercent, { isDemoMode: isDemo });
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];
	let hasImplants = false;

	const ctx: TierGeneratorContext = {
		tierId,
		catalog,
		validDiscountPct,
		isDemo,
		stage1Items,
		stage2Items,
		stage3Items,
		markHasImplants: () => { hasImplants = true; },
	};

	const defCT = SERVICES_CATALOG_DICTIONARY.DiagnosticsCT!;
	stage1Items.push(createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }));

	const defHygiene = SERVICES_CATALOG_DICTIONARY.HygieneComplex!;
	stage1Items.push(
		createPlanItem("s1-hygiene", 1, "stage_1_therapy", defHygiene, undefined, catalog, validDiscountPct, {
			customTitle: tierId === "optimum"
				? "Премиальная гигиена Air-Flow Plus с глицином + фторирование Clinpro"
				: "Базовая профессиональная гигиена и снятие зубного камня",
			isDemoMode: isDemo,
		}),
	);

	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of effectiveTeeth) {
		const num = tooth.toothNumber ?? (tooth as any).id ?? (tooth as any).number;
		if (typeof num !== "number" || !Number.isFinite(num)) continue;
		const state: ToothState = normalizeToothState(tooth.state);

		if (isDeciduousTooth(num)) {
			handlePediatricTooth(num, state, ctx);
		} else if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
		} else if (state === "Root") {
			handleRootTooth(num, ctx, missingUpper, missingLower);
		} else if (state === "Retained") {
			handleRetainedTooth(num, ctx);
		} else if (state === "Caries") {
			handleCariesTooth(num, ctx);
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			handleEndoTooth(num, tooth, ctx);
		} else if (state === "Crown") {
			handleCrownTooth(num, ctx);
		}
	}

	processTierMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней", ctx);
	processTierMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней", ctx);

	if (stage3Items.length > 0) {
		const defScan = SERVICES_CATALOG_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(createPlanItem("s3-scan", 3, "stage_3_orthopedics", defScan, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}

	return assembleTierStages(ctx, hasImplants);
}
