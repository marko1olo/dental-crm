import type { ProcedureCatalogServiceNorm } from "./clinicalWriteoffPresets.js";
import { SERVICE_NORMS_THERAPY } from "./serviceNorms/serviceNormsTherapy.js";
import { SERVICE_NORMS_ENDO_HYGIENE } from "./serviceNorms/serviceNormsEndoHygiene.js";
import { SERVICE_NORMS_SURGERY_IMPLANT } from "./serviceNorms/serviceNormsSurgeryImplant.js";

export const PROCEDURE_CATALOG_SERVICE_NORMS: readonly ProcedureCatalogServiceNorm[] = [
	...SERVICE_NORMS_THERAPY,
	...SERVICE_NORMS_ENDO_HYGIENE,
	...SERVICE_NORMS_SURGERY_IMPLANT,
];

export const ORDER_804N_SERVICE_NORMS = PROCEDURE_CATALOG_SERVICE_NORMS;

export function getProcedureCatalogServiceNorm(serviceCode: string): ProcedureCatalogServiceNorm | undefined {
	return PROCEDURE_CATALOG_SERVICE_NORMS.find((s) => s.serviceCode === serviceCode);
}

export const getOrder804nServiceNorm = getProcedureCatalogServiceNorm;
