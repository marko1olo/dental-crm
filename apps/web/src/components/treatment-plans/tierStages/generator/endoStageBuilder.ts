import type { ToothData } from "../../../odontogram/ToothChart";
import {
	SERVICES_CATALOG_DICTIONARY,
	extractCanalCount,
	getEndoPreparationProcedure,
	getEndoObturationProcedure,
	isMolarOrPremolar,
} from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleEndoTooth(
	num: number,
	tooth: ToothData,
	ctx: TierGeneratorContext,
): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage1Items, stage3Items } = ctx;

	const defCofferdam = SERVICES_CATALOG_DICTIONARY.CofferdamIsolation!;
	stage1Items.push(createPlanItem("s1-cofferdam-" + num, 1, "stage_1_therapy", defCofferdam, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

	const canalCount = extractCanalCount(tooth);
	const defPrep = getEndoPreparationProcedure(canalCount);
	stage1Items.push(
		createPlanItem(
			"s1-prep-" + num,
			1,
			"stage_1_therapy",
			defPrep,
			num,
			catalog,
			validDiscountPct,
			{
				customTitle:
					tierId === "optimum"
						? "Обработка корневых каналов зуба №" + num + " под микроскопом Zeiss (" + canalCount + " кан.)"
						: "Инструментальная обработка каналов зуба №" + num + " (" + canalCount + " кан.)",
				isDemoMode: isDemo,
			},
		),
	);

	const defObt = getEndoObturationProcedure(canalCount);
	stage1Items.push(
		createPlanItem(
			"s1-obt-" + num,
			1,
			"stage_1_therapy",
			defObt,
			num,
			catalog,
			validDiscountPct,
			{
				customTitle: "3D-обтурация каналов зуба №" + num + " горячей гуттаперчей (" + canalCount + " кан.)",
				isDemoMode: isDemo,
			},
		),
	);

	const defBuildup = SERVICES_CATALOG_DICTIONARY.BuildupFiberPost!;
	stage1Items.push(createPlanItem("s1-buildup-" + num, 1, "stage_1_therapy", defBuildup, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

	if (isMolarOrPremolar(num)) {
		if (tierId === "economy") {
			const defMKK = SERVICES_CATALOG_DICTIONARY.CrownMetalCeramic!;
			stage3Items.push(
				createPlanItem(
					"s3-crown-mk-" + num,
					3,
					"stage_3_orthopedics",
					defMKK,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Металлокерамическая коронка на зуб №" + num,
						isDemoMode: isDemo,
					},
				),
			);
		} else {
			const defEmax = SERVICES_CATALOG_DICTIONARY.CrownEmaxCeramic!;
			stage3Items.push(
				createPlanItem(
					"s3-crown-emax-" + num,
					3,
					"stage_3_orthopedics",
					defEmax,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Премиальная керамическая коронка IPS e.max Press на зуб №" + num,
						isDemoMode: isDemo,
					},
				),
			);
		}
	}
}
