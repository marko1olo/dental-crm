import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Генерирует диагностические, пародонтологические и гигиенические услуги (Этап 1).
 */
export function buildPeriodontalAndHygieneItems(
	effectiveTeeth: readonly ToothData[],
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage1PerioItems: TreatmentPlanItem[]; hasPeriodontalNeeds: boolean } {
	const stage1PerioItems: TreatmentPlanItem[] = [];
	let hasPeriodontalNeeds = false;

	// 1. Предварительный пародонтологический скрининг
	for (const tooth of effectiveTeeth) {
		const hasBoneLoss = Boolean(tooth.boneLossLevel && tooth.boneLossLevel > 0);
		const hasMobility = Boolean(tooth.mobility && tooth.mobility > 0);
		const hasFurcation = Boolean(tooth.furcationGrade && tooth.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			hasPeriodontalNeeds = true;
			const defSrp = DENTAL_SERVICES_CATALOG.PeriodontalScalingSRP!;
			stage1PerioItems.push(
				createPlanItem(
					"s1-perio-srp-" + tooth.toothNumber,
					1,
					"stage_1_therapy",
					defSrp,
					tooth.toothNumber,
					catalog,
					validDiscountPct,
					{
						customTitle: "Скейлинг и пародонтологическая обработка корня зуба №" + tooth.toothNumber + " (SRP)",
						isDemoMode: isDemo,
					},
				),
			);

			if (hasBoneLoss && (tooth.boneLossLevel ?? 0) >= 2) {
				const defCurettage = DENTAL_SERVICES_CATALOG.PeriodontalClosedCurettage!;
				stage1PerioItems.push(
					createPlanItem(
						"s1-perio-curettage-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defCurettage,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Закрытый кюретаж пародонтального кармана зуба №" + tooth.toothNumber,
							isDemoMode: isDemo,
						},
					),
				);
			}

			if (hasMobility && (tooth.mobility ?? 0) >= 2) {
				const defSplint = DENTAL_SERVICES_CATALOG.PeriodontalSplinting!;
				stage1PerioItems.push(
					createPlanItem(
						"s1-perio-splint-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defSplint,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Шинирование подвижного зуба №" + tooth.toothNumber + " стекловолоконной лентой",
							isDemoMode: isDemo,
						},
					),
				);
			}
		}
	}

	// 2. Базовая гигиена и 3D КЛКТ диагностика
	const defCT = DENTAL_SERVICES_CATALOG.DiagnosticsCT!;
	stage1PerioItems.unshift(
		createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defHygiene = DENTAL_SERVICES_CATALOG.HygieneComplex!;
	stage1PerioItems.push(
		createPlanItem(
			"s1-hygiene",
			1,
			"stage_1_therapy",
			defHygiene,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: hasPeriodontalNeeds
					? "Комплексная гигиена + пародонтологическая антисептическая обработка (Air-Flow + УЗ)"
					: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
				isDemoMode: isDemo,
			},
		),
	);

	return { stage1PerioItems, hasPeriodontalNeeds };
}
