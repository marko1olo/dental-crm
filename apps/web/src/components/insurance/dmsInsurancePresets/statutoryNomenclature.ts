/**
 * statutoryNomenclature.ts — Полный каталог номенклатуры стоматологических процедур
 */

import { SURGERY_AND_SPECIALIZED_NOMENCLATURE } from "./statutoryNomenclatureSurgery.js";
import { THERAPY_AND_DIAGNOSTIC_NOMENCLATURE } from "./statutoryNomenclatureTherapy.js";
import type { DmsNomenclature804nItem } from "./types.js";

export const STATUTORY_804N_NOMENCLATURE: readonly DmsNomenclature804nItem[] = [
	...THERAPY_AND_DIAGNOSTIC_NOMENCLATURE,
	...SURGERY_AND_SPECIALIZED_NOMENCLATURE,
];
