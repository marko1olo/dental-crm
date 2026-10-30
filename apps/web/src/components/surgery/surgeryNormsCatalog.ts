/**
 * surgeryNormsCatalog.ts — Каталог хирургических протоколов, физиологических норм операций и спецификаций номенклатуры услуг.
 * Стандарт: «Софт для врача, а не врач для софта. Любой барьер или лишний клик — это брак».
 */

import type {
	SurgicalServiceItem,
	SurgicalService804n,
	SurgicalOperationNorm,
	SurgicalWarehouseOverdraftStatus,
} from "@dental/shared";

export type {
	SurgicalServiceItem,
	SurgicalService804n,
	SurgicalOperationNorm,
	SurgicalWarehouseOverdraftStatus,
};

export * from "./surgeryCatalogData";
export * from "./norms/surgeryCanonicalTexts";
export * from "./norms/surgeryImplantProtocolBuilder";
export * from "./norms/implantNorms";
export * from "./norms/extractionNorms";
export * from "./norms/sinusGbrNorms";
export * from "./norms/perioAndEmergencyNorms";
export * from "./norms/surgeryNormsRegistry";
