/**
 * singleItemSplitTypes.ts — Контракты опций и результатов разделения позиции
 */

import type { DmsPolicy } from "../insuranceCatalogs.js";
import type { DmsGuaranteeLetter, DmsSplitLineResult } from "./types.js";

export interface SingleItemSplitOptions {
	readonly policy?: DmsPolicy | undefined;
	readonly guaranteeLetter?: DmsGuaranteeLetter | undefined;
	readonly visitDate?: string | undefined;
	readonly lastHygieneDate?: string | undefined;
	readonly isUrgentCare: boolean;
	readonly availableLetterLimitKopecks: number;
}

export interface SingleItemSplitOutput {
	readonly splitResult: DmsSplitLineResult;
	readonly dmsCoveredDeductedKopecks: number;
	readonly hasUnapprovedTeeth: boolean;
	readonly hasExcludedServices: boolean;
}
