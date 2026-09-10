import { STOMX_OUTPATIENT_CATEGORY_TREE } from "./stomtCategoryTreeData.js";
import type { StomxOutpatientTemplateMetadata } from "./stomtOutpatientCatalog.js";
import { STOMX_TEMPLATES_PART_1 } from "./stomtTemplatesPart1.js";
import { STOMX_TEMPLATES_PART_2 } from "./stomtTemplatesPart2.js";
import { STOMX_TEMPLATES_PART_3 } from "./stomtTemplatesPart3.js";
import { STOMX_TEMPLATES_PART_4 } from "./stomtTemplatesPart4.js";
import { STOMX_TEMPLATES_PART_5 } from "./stomtTemplatesPart5.js";
import { STOMX_TEMPLATES_PART_6 } from "./stomtTemplatesPart6.js";

export { STOMX_OUTPATIENT_CATEGORY_TREE };

/**
 * Полный реестр всех 448 клинических шаблонов амбулаторной карты StomX Drop
 */
export const STOMX_ALL_448_TEMPLATES_INDEX: readonly StomxOutpatientTemplateMetadata[] =
	[
		...STOMX_TEMPLATES_PART_1,
		...STOMX_TEMPLATES_PART_2,
		...STOMX_TEMPLATES_PART_3,
		...STOMX_TEMPLATES_PART_4,
		...STOMX_TEMPLATES_PART_5,
		...STOMX_TEMPLATES_PART_6,
	];
