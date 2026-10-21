import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Обрабатывает временный (молочный) прикус: кариес, пульпотомия, SSC коронки, удаление.
 */
export function buildDeciduousToothItems(
	tooth: ToothData,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage1: TreatmentPlanItem[]; stage2: TreatmentPlanItem[]; stage3: TreatmentPlanItem[] } {
	const stage1: TreatmentPlanItem[] = [];
	const stage2: TreatmentPlanItem[] = [];
	const stage3: TreatmentPlanItem[] = [];

	const num = tooth.toothNumber;
	const state: ToothState | string = tooth.state || "Healthy";

	if (state === "Caries") {
		const defPedCaries = DENTAL_SERVICES_CATALOG.PediatricCariesTherapy!;
		stage1.push(
			createPlanItem(
				"s1-ped-caries-" + num,
				1,
				"stage_1_therapy",
				defPedCaries,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Лечение кариеса молочного зуба №" + num + " биосовместимым материалом",
					isDemoMode: isDemo,
				},
			),
		);
	} else if (state === "Pulpitis") {
		const defPulpotomy = DENTAL_SERVICES_CATALOG.PediatricPulpitisPulpotomy!;
		stage1.push(
			createPlanItem(
				"s1-ped-pulpotomy-" + num,
				1,
				"stage_1_therapy",
				defPulpotomy,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Витальная пульпотомия молочного зуба №" + num + " с Biodentine/МТА",
					isDemoMode: isDemo,
				},
			),
		);
		const defPedCrown = DENTAL_SERVICES_CATALOG.PediatricCrownSSC!;
		stage3.push(
			createPlanItem(
				"s3-ped-crown-" + num,
				3,
				"stage_3_orthopedics",
				defPedCrown,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Защитная коронка на депульпированный молочный зуб №" + num + " (3M SSC / NuSmile)",
					isDemoMode: isDemo,
				},
			),
		);
	} else if (
		state === "Periodontitis" ||
		state === "Root" ||
		state === "Impacted" ||
		state === "Retained" ||
		state === "Missing"
	) {
		const defPedExt = DENTAL_SERVICES_CATALOG.PediatricExtraction!;
		stage2.push(
			createPlanItem(
				"s2-ped-extract-" + num,
				2,
				"stage_2_surgery",
				defPedExt,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Атравматичное удаление временного зуба №" + num,
					isDemoMode: isDemo,
				},
			),
		);
	}

	return { stage1, stage2, stage3 };
}
