/**
 * treatmentPlanItemFactory.ts — фабрика элементов процедур и пустых этапов плана лечения DENTE CRM.
 *
 * Обеспечивает соответствие прейскуранту, ценовым правилам (Мандат 8k),
 * скидкам и номенклатуре Минздрава РФ № 804н.
 */

import { type Kopecks, parseKopecks, percentageOfKopecks } from "@dental/shared";
import type {
	Order804nProcedureDefinition,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
} from "./types";
import {
	type CatalogServiceLookupItem,
	type MatchCatalogServiceResult,
	matchCatalogService,
} from "./treatmentPlanPricingEngine";

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
	def: Order804nProcedureDefinition,
	toothNumber: number | undefined,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number,
	overrides?: CreatePlanItemOverrides,
): TreatmentPlanItem {
	const quantity = overrides?.quantity ?? 1;
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

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

	const unitPriceKopecks = parseKopecks(matched.priceRub);
	const discountKopecksPerUnit =
		validDiscountPct > 0
			? percentageOfKopecks(unitPriceKopecks, validDiscountPct * 100)
			: (0 as Kopecks);
	const finalUnitPriceKopecks = Math.max(
		0,
		unitPriceKopecks - discountKopecksPerUnit,
	) as Kopecks;
	const totalKopecks = (finalUnitPriceKopecks * quantity) as Kopecks;
	const totalDiscountKopecks = (discountKopecksPerUnit * quantity) as Kopecks;

	const unitPriceRub = Math.round(unitPriceKopecks / 100);
	const totalPriceRub = Math.round(totalKopecks / 100);
	const discountRub = Math.round(totalDiscountKopecks / 100);

	return {
		id,
		toothNumber,
		relatedToothNumbers: overrides?.relatedToothNumbers,
		code804n: def.code,
		name: overrides?.customTitle || (matched.fromCatalog && matched.title ? matched.title : def.title),
		category: def.category,
		priceRub: totalPriceRub,
		unitPriceRub,
		discountRub,
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

/**
 * Создание пустого этапа плана.
 */
export function makeEmptyStage(
	stageNumber: number,
	stageKind: TreatmentPlanStageKind,
	title: string,
	subtitle: string,
): TreatmentPlanStage {
	return {
		stageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal: subtitle,
		items: [],
		totalRub: 0,
		totalKopecks: 0 as Kopecks,
		estimatedVisits: 0,
		estimatedWeeks: 0,
		order804nCodes: [],
	};
}
