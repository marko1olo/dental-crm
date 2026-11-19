import { STOMX_OUTPATIENT_CATEGORY_TREE } from "./stomtCategoryTreeData.js";
import type { StomxOutpatientTemplateMetadata } from "./stomtOutpatientCatalog.js";
import { STOMX_TEMPLATES_PART_1 } from "./stomtTemplatesPart1.js";
import { STOMX_TEMPLATES_PART_2 } from "./stomtTemplatesPart2.js";
import { STOMX_TEMPLATES_PART_3 } from "./stomtTemplatesPart3.js";
import { STOMX_TEMPLATES_PART_4 } from "./stomtTemplatesPart4.js";
import { STOMX_TEMPLATES_PART_5 } from "./stomtTemplatesPart5.js";
import { STOMX_TEMPLATES_PART_6 } from "./stomtTemplatesPart6.js";

export { STOMX_OUTPATIENT_CATEGORY_TREE };
export const OUTPATIENT_CATEGORY_TREE = STOMX_OUTPATIENT_CATEGORY_TREE;

/**
 * Полный канонический реестр всех 448 клинических шаблонов амбулаторной карты приёма (SOAP) (DENTE CRM).
 */
export const CANONICAL_OUTPATIENT_TEMPLATES_INDEX: readonly StomxOutpatientTemplateMetadata[] =
	[
		...STOMX_TEMPLATES_PART_1,
		...STOMX_TEMPLATES_PART_2,
		...STOMX_TEMPLATES_PART_3,
		...STOMX_TEMPLATES_PART_4,
		...STOMX_TEMPLATES_PART_5,
		...STOMX_TEMPLATES_PART_6,
	];

/**
 * @deprecated Use CANONICAL_OUTPATIENT_TEMPLATES_INDEX per Mandate 8x & 8bj.
 */
export const STOMX_ALL_448_TEMPLATES_INDEX = CANONICAL_OUTPATIENT_TEMPLATES_INDEX;
