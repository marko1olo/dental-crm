/**
 * @dental/shared/anesthesia/catalog.ts
 * Russian Dental Anesthetics & Vasoconstrictor Pharmacopeia Facade (Mandate 8b, <= 120 lines)
 */

export {
	HEALTHY_MAX_EPINEPHRINE_MG,
	CARDIO_MAX_EPINEPHRINE_MG,
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	EPINEPHRINE_CEILINGS_MG,
} from "./catalogModules/catalogConstants.js";

export {
	ANESTHESIA_DRUG_CATALOG,
	ANESTHESIA_KEY_TO_CLINICAL_ID,
	CHAIRSIDE_KEY_TO_CLINICAL_ID,
	getClinicalSpecForChairsideDrug,
} from "./catalogModules/catalogKeyMappings.js";

export { ANESTHESIA_DRUGS } from "./catalogModules/catalogDrugDefinitions.js";

export {
	ANESTHESIA_METHODS,
	ANESTHESIA_TO_MDLP_MAP,
	getMdlpInfoForAnesthesiaDrug,
	getClinicalDrugForMdlpGtin,
	getClinicalSpecForMdlp,
} from "./catalogModules/catalogMethodsAndMdlp.js";
