/**
 * apps/web/src/components/treatment-plans/completedActPrint/actFinancialCalculations.ts
 *
 * Точный копеечный расчет сумм услуг, материалов и сумма прописью.
 */

import { type Kopecks, rublesToKopecks } from "@dental/shared";
import type { CompletedWorksActAndWriteOffData } from "../types";
import { numberToWordsRu } from "../treatmentPlanActFormatters";

export function calculateActFinancials(actData: CompletedWorksActAndWriteOffData) {
	const grossServicesRub = actData.completedProcedures.reduce(
		(acc, it) => acc + it.unitPriceRub * it.quantity,
		0,
	);
	const discountTotalRub = actData.completedProcedures.reduce(
		(acc, it) => acc + (it.discountRub || 0),
		0,
	);
	const netServicesRub = actData.totalServiceRub;
	const netServicesKopecks =
		actData.totalServiceKopecks || (rublesToKopecks(netServicesRub) as Kopecks);

	const netMaterialRub = actData.totalMaterialCostRub;
	const netMaterialKopecks =
		actData.totalMaterialCostKopecks || (rublesToKopecks(netMaterialRub) as Kopecks);

	const servicesInWords = numberToWordsRu(
		netServicesRub,
		netServicesKopecks ? netServicesKopecks % 100 : 0,
	);
	const materialsInWords = numberToWordsRu(
		netMaterialRub,
		netMaterialKopecks ? netMaterialKopecks % 100 : 0,
	);

	const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);

	return {
		grossServicesRub,
		discountTotalRub,
		netServicesRub,
		netServicesKopecks,
		netMaterialRub,
		netMaterialKopecks,
		servicesInWords,
		materialsInWords,
		hasDeficit,
	};
}
