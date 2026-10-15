import type { AnestheticDrugId, AnestheticDrugInfo } from './anesthesiaCatalogTypes';
import { ARTICAINE_DRUGS } from './anestheticArticaineDrugs';
import { OTHER_ANESTHETIC_DRUGS } from './anestheticOtherDrugs';

export const DENTAL_ANESTHETICS: Record<AnestheticDrugId, AnestheticDrugInfo> = {
	...ARTICAINE_DRUGS,
	...OTHER_ANESTHETIC_DRUGS,
};
