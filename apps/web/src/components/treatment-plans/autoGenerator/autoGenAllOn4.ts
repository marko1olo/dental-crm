import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Генерирует услуги по хирургическому и ортопедическому протоколу All-on-4 при тотальной адентии.
 */
export function buildAllOn4Items(
	jawName: "верхней" | "нижней",
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage2: TreatmentPlanItem[]; stage3: TreatmentPlanItem[] } {
	const stage2: TreatmentPlanItem[] = [];
	const stage3: TreatmentPlanItem[] = [];

	// 1. Навигационный 3D-шаблон для All-on-4
	const defGuide = DENTAL_SERVICES_CATALOG.AllOn4SurgicalGuide!;
	stage2.push(
		createPlanItem("s2-allon4-guide-" + jawName, 2, "stage_2_surgery", defGuide, undefined, catalog, validDiscountPct, {
			customTitle: "Хирургический навигационный 3D-шаблон для протокола All-on-4 (" + jawName + " челюсть)",
			isDemoMode: isDemo,
		}),
	);

	// 2. Установка 4 имплантатов
	const defAllOn4 = DENTAL_SERVICES_CATALOG.AllOn4Implantation!;
	stage2.push(
		createPlanItem("s2-allon4-implants-" + jawName, 2, "stage_2_surgery", defAllOn4, undefined, catalog, validDiscountPct, {
			customTitle: "Установка 4 дентальных имплантатов по протоколу All-on-4 (" + jawName + " челюсть)",
			quantity: 1,
			isDemoMode: isDemo,
		}),
	);

	// 3. Мультиюнит абатменты (4 шт)
	const defMultiUnit = DENTAL_SERVICES_CATALOG.MultiUnitAbutment!;
	stage2.push(
		createPlanItem("s2-allon4-multiunit-" + jawName, 2, "stage_2_surgery", defMultiUnit, undefined, catalog, validDiscountPct, {
			customTitle: "Установка мультиюнит-абатментов Multi-Unit (4 шт, " + jawName + " челюсть)",
			quantity: 4,
			isDemoMode: isDemo,
		}),
	);

	// 4. Несъемный армированный протез All-on-4 в Этап 3
	const defProsthesis = DENTAL_SERVICES_CATALOG.AllOn4Prosthesis!;
	stage3.push(
		createPlanItem("s3-allon4-prosthesis-" + jawName, 3, "stage_3_orthopedics", defProsthesis, undefined, catalog, validDiscountPct, {
			customTitle: "Несъемный армированный протез с винтовой фиксацией All-on-4 (" + jawName + " челюсть)",
			quantity: 1,
			isDemoMode: isDemo,
		}),
	);

	return { stage2, stage3 };
}
