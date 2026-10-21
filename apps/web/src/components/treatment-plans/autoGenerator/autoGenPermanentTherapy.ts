import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";
import { buildEndodonticTherapyItems } from "./autoGenEndodontics";

/**
 * Обрабатывает постоянный зуб (терапия, эндодонтия, удаление корней).
 */
export function buildPermanentToothItems(
	tooth: ToothData,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): {
	stage1: TreatmentPlanItem[];
	stage2: TreatmentPlanItem[];
	stage3: TreatmentPlanItem[];
	missingUpperTooth?: number | undefined;
	missingLowerTooth?: number | undefined;
} {
	const stage1: TreatmentPlanItem[] = [];
	const stage2: TreatmentPlanItem[] = [];
	const stage3: TreatmentPlanItem[] = [];
	let missingUpperTooth: number | undefined;
	let missingLowerTooth: number | undefined;

	const num = tooth.toothNumber;
	const state: ToothState | string = tooth.state || "Healthy";
	const quadrant = Math.floor(num / 10);

	if (state === "Missing") {
		if (quadrant === 1 || quadrant === 2) missingUpperTooth = num;
		else if (quadrant === 3 || quadrant === 4) missingLowerTooth = num;
		return { stage1, stage2, stage3, missingUpperTooth, missingLowerTooth };
	}

	if (state === "Root") {
		const defExt = DENTAL_SERVICES_CATALOG.SimpleExtraction!;
		stage2.push(
			createPlanItem("s2-root-extract-" + num, 2, "stage_2_surgery", defExt, num, catalog, validDiscountPct, {
				customTitle: "Атравматичное удаление разрушенного корня зуба №" + num + " с консервацией лунки",
				isDemoMode: isDemo,
			}),
		);
		if (quadrant === 1 || quadrant === 2) missingUpperTooth = num;
		else missingLowerTooth = num;
		return { stage1, stage2, stage3, missingUpperTooth, missingLowerTooth };
	}

	if (state === "Impacted" || state === "Retained") {
		const defComplexExt = DENTAL_SERVICES_CATALOG.ComplexExtraction!;
		stage2.push(
			createPlanItem("s2-impacted-extract-" + num, 2, "stage_2_surgery", defComplexExt, num, catalog, validDiscountPct, {
				customTitle: "Сложное хирургическое удаление ретенированного/дистопированного зуба №" + num,
				isDemoMode: isDemo,
			}),
		);
		return { stage1, stage2, stage3 };
	}

	if (state === "Caries") {
		const defCaries = DENTAL_SERVICES_CATALOG.CariesTherapy!;
		stage1.push(
			createPlanItem("s1-caries-" + num, 1, "stage_1_therapy", defCaries, num, catalog, validDiscountPct, {
				customTitle: "Лечение кариеса зуба №" + num + " нанокомпозитом Estelite / Filtek",
				isDemoMode: isDemo,
			}),
		);
	} else if (state === "Pulpitis" || state === "Periodontitis") {
		const endo = buildEndodonticTherapyItems(tooth, catalog, validDiscountPct, isDemo);
		stage1.push(...endo.stage1);
		stage3.push(...endo.stage3);
	} else if (state === "Crown" || state === "CrownNeeded") {
		const defCrown = DENTAL_SERVICES_CATALOG.CrownZirconia!;
		stage3.push(
			createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, {
				customTitle: "Восстановление зуба №" + num + " коронкой из диоксида циркония Prettau",
				isDemoMode: isDemo,
			}),
		);
	}

	return { stage1, stage2, stage3, missingUpperTooth, missingLowerTooth };
}
