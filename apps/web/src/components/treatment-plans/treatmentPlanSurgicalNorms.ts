/**
 * treatmentPlanSurgicalNorms.ts — Эталонные нормы расхода стоматологических материалов
 * по Номенклатуре медицинских услуг для хирургических, имплантологических и ортопедических процедур.
 */

import type { ProcedureMaterialNorm } from "./types";
import { extractionNorms } from "./surgicalNorms/extractionNorms";
import { graftAndGuideNorms } from "./surgicalNorms/graftAndGuideNorms";
import { implantNorms } from "./surgicalNorms/implantNorms";
import { prostheticNorms } from "./surgicalNorms/prostheticNorms";

export const SURGICAL_MATERIAL_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	...extractionNorms,
	...graftAndGuideNorms,
	...implantNorms,
	...prostheticNorms,
};
