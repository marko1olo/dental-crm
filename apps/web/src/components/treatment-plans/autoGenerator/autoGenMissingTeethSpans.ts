import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { createPlanItem } from "../treatmentPlanItemFactory";

/**
 * Обрабатывает непрерывный пролет (span) отсутствующих зубов (мост или одиночные имплантаты).
 */
export function buildMissingSpanItems(
	currentSpan: readonly number[],
	effectiveTeeth: readonly ToothData[],
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number,
	isDemo: boolean,
): { stage2: TreatmentPlanItem[]; stage3: TreatmentPlanItem[] } {
	const stage2: TreatmentPlanItem[] = [];
	const stage3: TreatmentPlanItem[] = [];

	// Паттерн: 3 отсутствующих зуба подряд (мостовидный протез на 2 имплантатах)
	if (currentSpan.length === 3) {
		const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
		const defImp = DENTAL_SERVICES_CATALOG.DentalImplantation!;

		stage2.push(
			createPlanItem("s2-implant-span-" + tooth1, 2, "stage_2_surgery", defImp, tooth1, catalog, validDiscountPct, {
				customTitle: "Дентальная имплантация в области зуба №" + tooth1 + " (крайняя опора моста)",
				isDemoMode: isDemo,
			}),
		);
		stage2.push(
			createPlanItem("s2-implant-span-" + tooth3, 2, "stage_2_surgery", defImp, tooth3, catalog, validDiscountPct, {
				customTitle: "Дентальная имплантация в области зуба №" + tooth3 + " (крайняя опора моста)",
				isDemoMode: isDemo,
			}),
		);

		const defBridge = DENTAL_SERVICES_CATALOG.BridgeProsthesis!;
		stage3.push(
			createPlanItem("s3-bridge-span-" + tooth1 + "-" + tooth3, 3, "stage_3_orthopedics", defBridge, tooth1, catalog, validDiscountPct, {
				customTitle: `Мостовидный протез из диоксида циркония на 2 имплантатах (3 единицы: №${tooth1}, №${tooth2}, №${tooth3})`,
				relatedToothNumbers: [tooth1, tooth2, tooth3],
				quantity: 1,
				isDemoMode: isDemo,
			}),
		);
		return { stage2, stage3 };
	}

	// Одиночные дефекты или участки другой длины: 1 имплантат + 1 коронка на каждый отсутствующий зуб
	for (const missingT of currentSpan) {
		const toothObj = effectiveTeeth.find((t) => t.toothNumber === missingT);
		if (toothObj?.boneLossLevel && toothObj.boneLossLevel >= 2) {
			const defBone = DENTAL_SERVICES_CATALOG.BoneGraftingSinusLift!;
			stage2.push(
				createPlanItem("s2-bone-graft-" + missingT, 2, "stage_2_surgery", defBone, missingT, catalog, validDiscountPct, {
					customTitle: "Костная пластика / синус-лифтинг в области зуба №" + missingT,
					isDemoMode: isDemo,
				}),
			);
		}

		const defExt = DENTAL_SERVICES_CATALOG.SimpleExtraction!;
		stage2.push(
			createPlanItem("s2-extract-prep-" + missingT, 2, "stage_2_surgery", defExt, missingT, catalog, validDiscountPct, {
				customTitle: "Подготовка костного ложа / атравматичное удаление корня №" + missingT,
				isDemoMode: isDemo,
			}),
		);

		const defGuide = DENTAL_SERVICES_CATALOG.SurgicalNavigationGuide!;
		stage2.push(
			createPlanItem("s2-guide-" + missingT, 2, "stage_2_surgery", defGuide, missingT, catalog, validDiscountPct, {
				customTitle: "Навигационный хирургический 3D-шаблон (позиция №" + missingT + ")",
				isDemoMode: isDemo,
			}),
		);

		const defImp = DENTAL_SERVICES_CATALOG.DentalImplantation!;
		stage2.push(
			createPlanItem("s2-implant-" + missingT, 2, "stage_2_surgery", defImp, missingT, catalog, validDiscountPct, {
				customTitle: "Дентальная имплантация в области зуба №" + missingT + " (Osstem TS-III / Dentium)",
				isDemoMode: isDemo,
			}),
		);

		const defImpCrown = DENTAL_SERVICES_CATALOG.ImplantCrownProsthetics!;
		stage3.push(
			createPlanItem("s3-implant-crown-" + missingT, 3, "stage_3_orthopedics", defImpCrown, missingT, catalog, validDiscountPct, {
				customTitle: "Протезирование на имплантате коронкой из диоксида циркония (№" + missingT + ")",
				isDemoMode: isDemo,
			}),
		);
	}

	return { stage2, stage3 };
}
