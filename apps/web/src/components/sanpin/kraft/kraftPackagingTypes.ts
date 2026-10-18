/**
 * apps/web/src/components/sanpin/kraft/kraftPackagingTypes.ts
 *
 * Типы упаковочных материалов для стерилизации по СанПиН 3.3686-21.
 * Мандат 8b: строго <= 120 строк.
 */

export type SanpinPackagingTypeId =
	| "kraft_self_seal"
	| "paper_plastic_heat_seal"
	| "crepe_paper_double"
	| "bix_filter"
	| "bix_no_filter"
	| "calico_double_wrap";

export interface SanpinPackagingTypeDefinition {
	readonly id: SanpinPackagingTypeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly minShelfLifeDays: number;
	readonly maxShelfLifeDays: number;
	readonly defaultShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly storageRequirementsRu: string;
	readonly isHeatSealed: boolean;
	readonly isTransparentFilm: boolean;
}

export * from "./kraftPackagingData";
