import type { ProcedureMaterialNorm } from "../types";
import { CARIES_NORMS } from "./cariesNorms";
import { ENDO_OBTURATON_NORMS } from "./endoObturationNorms";
import { ENDO_PREP_NORMS } from "./endoPrepNorms";
import { ENDO_SPECIAL_NORMS } from "./endoSpecialNorms";
import { HYGIENE_NORMS } from "./hygieneNorms";

export * from "./hygieneNorms";
export * from "./cariesNorms";
export * from "./endoPrepNorms";
export * from "./endoObturationNorms";
export * from "./endoSpecialNorms";

export const THERAPY_MATERIAL_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	...HYGIENE_NORMS,
	...CARIES_NORMS,
	...ENDO_PREP_NORMS,
	...ENDO_OBTURATON_NORMS,
	...ENDO_SPECIAL_NORMS,
};
