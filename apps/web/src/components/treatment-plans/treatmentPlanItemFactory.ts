/**
 * treatmentPlanItemFactory.ts — фабрика элементов процедур и пустых этапов плана лечения DENTE CRM.
 *
 * Обеспечивает соответствие прейскуранту, ценовым правилам (Мандат 8k),
 * скидкам и номенклатуре Минздрава РФ № 804н.
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
 * Создание элемента плана лечения с привязкой к номенклатуре Приказа № 804н и каталогу цен.
 */
export function createPlanItem(
	id: string,
	phase: number,
	stageKind: TreatmentPlanStageKind,
	def: ClinicalProcedureDefinition,
	toothNumber: number | undefined,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number,
	overrides?: CreatePlanItemOverrides,
): TreatmentPlanItem {
	const quantity = overrides?.quantity ?? 1;

	let matched: MatchCatalogServiceResult;
	if (typeof overrides?.customPriceRub === "number") {
		matched = {
			priceRub: overrides.customPriceRub,
			unitPriceRub: overrides.customPriceRub,
			title: overrides.customTitle ?? def.title,
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	} else {
		matched = matchCatalogService(
			catalog,
			def.category,
			def.keywords,
			def.defaultPriceRub,
			def.code,
			overrides?.isDemoMode !== undefined ? { isDemoMode: overrides.isDemoMode } : undefined,
		);
	}

	const pricing = calculateItemPricing(matched.priceRub, quantity, discountPercent);

	return {
		id,
		toothNumber,
		relatedToothNumbers: overrides?.relatedToothNumbers,
		serviceCode: def.code,
		code804n: def.code,
		name: overrides?.customTitle || (matched.fromCatalog && matched.title ? matched.title : def.title),
		category: def.category,
		priceRub: pricing.totalPriceRub,
		unitPriceRub: pricing.unitPriceRub,
		discountRub: pricing.discountRub,
		quantity,
		phase,
		stageKind,
		isAuto: true,
		priceId: matched.priceId,
		fromCatalog: matched.fromCatalog,
		materials: overrides?.customMaterials || def.materialsDefault,
		clinicalRationale: overrides?.clinicalRationale,
		isDraft: matched.isDraft,
		requiresManualPricing: matched.requiresManualPricing,
	};
}
