import type { OutpatientProtocolTemplate } from "./stomtOutpatientCatalog.js";
import { STOMX_IMPLANT_PERIODONT_PROTOCOLS } from "./stomtProtocolsImplantPeriodont.js";
import { STOMX_ORTHOPEDICS_PROTOCOLS } from "./stomtProtocolsOrthopedics.js";
import { STOMX_SURGERY_PROTOCOLS } from "./stomtProtocolsSurgery.js";
import { STOMX_THERAPY_PROTOCOLS } from "./stomtProtocolsTherapy.js";

/**
 * Базовый каталог ключевых клинических протоколов амбулаторной карты 043/у (StomX Drop)
 * 45 готовых производственных протоколов по 5 специальностям.
 */
export const STOMX_KEY_CLINICAL_PROTOCOLS: readonly OutpatientProtocolTemplate[] =
	[
		...STOMX_THERAPY_PROTOCOLS,
		...STOMX_ORTHOPEDICS_PROTOCOLS,
		...STOMX_SURGERY_PROTOCOLS,
		...STOMX_IMPLANT_PERIODONT_PROTOCOLS,
	];
