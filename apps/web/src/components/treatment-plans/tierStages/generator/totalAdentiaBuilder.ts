import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleTotalAdentia(
	jawLabel: "верхней" | "нижней",
	ctx: TierGeneratorContext,
): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage2Items, stage3Items, markHasImplants } = ctx;

	if (tierId === "economy") {
		const defClasp = SERVICES_CATALOG_DICTIONARY.ClaspProsthesisEconomy!;
		stage3Items.push(
			createPlanItem(
				"s3-full-clasp-" + jawLabel,
				3,
				"stage_3_orthopedics",
				defClasp,
				undefined,
				catalog,
				validDiscountPct,
				{
					customTitle: "Полный съемный пластиночный протез (" + jawLabel + " челюсть)",
					isDemoMode: isDemo,
				},
			),
		);
		return;
	}

	markHasImplants();
	const defGuide = SERVICES_CATALOG_DICTIONARY.AllOn4SurgicalGuide!;
	stage2Items.push(
		createPlanItem(
			"s2-allon6-guide-" + jawLabel,
			2,
			"stage_2_surgery",
			defGuide,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: "Прецизионный навигационный 3D-шаблон All-on-6 (" + jawLabel + " челюсть)",
				isDemoMode: isDemo,
			},
		),
	);

	const defAllOn6 = SERVICES_CATALOG_DICTIONARY.AllOn6Implantation!;
	stage2Items.push(
		createPlanItem(
			"s2-allon6-implants-" + jawLabel,
			2,
			"stage_2_surgery",
			defAllOn6,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: "Установка 6 премиальных имплантатов Straumann SLActive All-on-6 (" + jawLabel + " челюсть)",
				isDemoMode: isDemo,
			},
		),
	);

	const defMultiUnit = SERVICES_CATALOG_DICTIONARY.MultiUnitAbutment!;
	stage2Items.push(
		createPlanItem(
			"s2-allon6-multiunit-" + jawLabel,
			2,
			"stage_2_surgery",
			defMultiUnit,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: "Установка мультиюнит-абатментов Straumann (6 шт, " + jawLabel + " челюсть)",
				quantity: 6,
				isDemoMode: isDemo,
			},
		),
	);

	const defAllOn6Prosth = SERVICES_CATALOG_DICTIONARY.AllOn6Prosthesis!;
	stage3Items.push(
		createPlanItem(
			"s3-allon6-prosthesis-" + jawLabel,
			3,
			"stage_3_orthopedics",
			defAllOn6Prosth,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: "Высокоэстетичный циркониевый протез All-on-6 на титановой балке (" + jawLabel + " челюсть)",
				isDemoMode: isDemo,
			},
		),
	);
}
