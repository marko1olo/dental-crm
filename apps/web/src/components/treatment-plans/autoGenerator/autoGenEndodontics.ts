import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import {
	ORDER_804N_DICTIONARY,
	extractCanalCount,
	getEndoPreparationProcedure,
	getEndoObturationProcedure,
	isMolarOrPremolar,
} from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Генерирует услуги эндодонтического протокола (коффердам, обработка каналов, обтурация, билд-ап, коронка на моляр).
 */
export function buildEndodonticTherapyItems(
	tooth: ToothData,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage1: TreatmentPlanItem[]; stage3: TreatmentPlanItem[] } {
	const stage1: TreatmentPlanItem[] = [];
	const stage3: TreatmentPlanItem[] = [];
	const num = tooth.toothNumber;

	const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
	stage1.push(
		createPlanItem("s1-cofferdam-" + num, 1, "stage_1_therapy", defCofferdam, num, catalog, validDiscountPct, {
			customTitle: "Наложение коффердама для изоляции зуба №" + num,
			isDemoMode: isDemo,
		}),
	);

	const canalCount = extractCanalCount(tooth);
	const defPrep = getEndoPreparationProcedure(canalCount);
	const canalSuffix = canalCount === 1 ? " канал" : canalCount < 5 ? " канала" : " каналов";
	stage1.push(
		createPlanItem("s1-endo-prep-" + num, 1, "stage_1_therapy", defPrep, num, catalog, validDiscountPct, {
			customTitle: `Инструментальная и медикаментозная обработка корневых каналов зуба №${num} (${canalCount}${canalSuffix})`,
			isDemoMode: isDemo,
		}),
	);

	const defObt = getEndoObturationProcedure(canalCount);
	stage1.push(
		createPlanItem("s1-endo-obt-" + num, 1, "stage_1_therapy", defObt, num, catalog, validDiscountPct, {
			customTitle: `3D-обтурация корневых каналов зуба №${num} горячей гуттаперчей с биокерамикой (${canalCount}${canalSuffix})`,
			isDemoMode: isDemo,
		}),
	);

	const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
	stage1.push(
		createPlanItem("s1-buildup-" + num, 1, "stage_1_therapy", defBuildup, num, catalog, validDiscountPct, {
			customTitle: "Восстановление культи зуба №" + num + " под коронку (Build-up со стекловолоконным штифтом)",
			isDemoMode: isDemo,
		}),
	);

	if (isMolarOrPremolar(num)) {
		const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
		stage3.push(
			createPlanItem("s3-crown-endo-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, {
				customTitle: "Ортопедическая защита депульпированного зуба №" + num + " коронкой из диоксида циркония",
				isDemoMode: isDemo,
			}),
		);
	}

	return { stage1, stage3 };
}
