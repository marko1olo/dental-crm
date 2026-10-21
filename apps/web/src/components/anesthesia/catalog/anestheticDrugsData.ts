import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "./anesthesiaCatalogTypes.js";
import { ARTICAINE_DRUGS } from "./anestheticArticaineDrugs.js";
import { LIDOCAINE_DRUGS } from "./anestheticLidocaineDrugs.js";
import { OTHER_ANESTHETIC_DRUGS } from "./anestheticOtherDrugs.js";

export const DENTAL_ANESTHETICS: Record<AnestheticDrugId, AnestheticDrugInfo> =
	{
		...ARTICAINE_DRUGS,
		...LIDOCAINE_DRUGS,
		...OTHER_ANESTHETIC_DRUGS,
	};
