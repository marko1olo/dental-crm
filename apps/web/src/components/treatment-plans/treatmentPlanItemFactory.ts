/**
 * treatmentPlanItemFactory.ts — фабрика элементов процедур и пустых этапов плана лечения DENTE CRM.
 *
 * Обеспечивает соответствие прейскуранту, ценовым правилам (Мандат 8k),
 * скидкам и клинической номенклатуре услуг.
 */

import type {
	ClinicalProcedureDefinition,
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "./types";
import {
	type CatalogServiceLookupItem,
	type MatchCatalogServiceResult,
	matchCatalogService,
} from "./treatmentPlanPricingEngine";
import { calculateItemPricing } from "./itemFactory/planItemPriceCalculation";

export { makeEmptyStage } from "./itemFactory/makeEmptyStage";

export interface CreatePlanItemOverrides {
	readonly quantity?: number;
	readonly customTitle?: string;
	readonly customPriceRub?: number;
	readonly customMaterials?: string;
	readonly relatedToothNumbers?: readonly number[];
	readonly isDemoMode?: boolean;
	readonly clinicalRationale?: string;
}

/**
 * Создание элемента плана лечения с привязкой к коду услуги и каталогу цен.
 */
export function createPlanItem(
	id: string,
	phase: number,
	stageKind: TreatmentPlanStageKind,
	def: ClinicalProcedureDefinition | undefined,
	toothNumber: number | undefined,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number,
	overrides?: CreatePlanItemOverrides,
): TreatmentPlanItem {
	const quantity = overrides?.quantity ?? 1;

	const safeDef: ClinicalProcedureDefinition = def ?? {
		code: "A16.07.001",
		title: overrides?.customTitle || "Стоматологическая услуга",
		category: "Терапия",
		defaultPriceRub: overrides?.customPriceRub ?? 0,
		stageKind,
		stageNumber: phase,
		keywords: [],
		materialsDefault: "",
		uetDoctor: 1,
		uetNurse: 1,
	};

	let matched: MatchCatalogServiceResult;
	if (typeof overrides?.customPriceRub === "number") {
		matched = {
			priceRub: overrides.customPriceRub,
			unitPriceRub: overrides.customPriceRub,
			title: overrides.customTitle ?? safeDef.title,
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	} else {
		matched = matchCatalogService(
			catalog,
			safeDef.category,
			safeDef.keywords,
			safeDef.defaultPriceRub,
			safeDef.code,
			overrides?.isDemoMode !== undefined ? { isDemoMode: overrides.isDemoMode } : undefined,
		);
	}

	const pricing = calculateItemPricing(matched.priceRub, quantity, discountPercent);

	return {
		id,
		toothNumber,
		relatedToothNumbers: overrides?.relatedToothNumbers,
		serviceCode: safeDef.code,
		code804n: safeDef.code,
		name: overrides?.customTitle || (matched.fromCatalog && matched.title ? matched.title : safeDef.title),
		category: safeDef.category,
		priceRub: pricing.totalPriceRub,
		unitPriceRub: pricing.unitPriceRub,
		discountRub: pricing.discountRub,
		quantity,
		phase,
		stageKind,
		isAuto: true,
		priceId: matched.priceId,
		fromCatalog: matched.fromCatalog,
		materials: overrides?.customMaterials || safeDef.materialsDefault,
		clinicalRationale: overrides?.clinicalRationale,
		isDraft: matched.isDraft,
		requiresManualPricing: matched.requiresManualPricing,
	};
}
