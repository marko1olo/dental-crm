/**
 * orthopedicWorkTypes.ts — Orthopedic Work Types Definitions and IDs.
 */

export type OrthopedicWorkTypeId =
	| "crown_zirconia" // #1 Коронка из диоксида циркония (Katana ML / Prettau)
	| "crown_emax" // #2 Коронка IPS e.max Press / CAD (дисиликат лития)
	| "metal_ceramic" // #3 Металлокерамика (Co-Cr фрезерованный/литой)
	| "temporary_pmma" // #4 Временная пластмассовая коронка PMMA CAD/CAM
	| "clasp_prosthesis" // #5 Бюгельный протез (замки Bredent / кламмеры)
	| "custom_abutment" // #6 Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка
	| "removable_acrylic" // #7 Съемный акриловый протез (Acry-Free / Ивокрил)
	| "aligners"; // #8 Элайнеры / Ортодонтические каппы / Сплинты

export interface OrthopedicWorkTypeDefinition {
	readonly id: OrthopedicWorkTypeId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundWorkingDays: number;
	readonly requiresFittingStage: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresImplantSystem: boolean;
	readonly defaultPriceKopecks: number;
	readonly defaultCostKopecks: number;
}
