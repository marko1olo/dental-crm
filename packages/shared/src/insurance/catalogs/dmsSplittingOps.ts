/**
 * DENTE Dental CRM — DMS Splitting, Co-Payment & Distribution Operations SSOT.
 * Compliant with Mandate 8b (< 400 lines).
 */

import { formatKopecksToRub, kopecksToRubles, rublesToKopecks } from "../../money.js";
import { formatCurrencyKopecks } from "../dmsFranchiseEngine.js";
import type { DmsGuaranteeLetter } from "../guaranteeModules/guaranteeTypes.js";
import { STANDARD_DMS_EXCLUDED_804N_SERVICES } from "../guaranteeModules/guaranteeMatcher.js";
import type { DmsGuaranteeLetterRecord } from "./dmsInsurersCatalog.js";
import { isServiceCodeApprovedByLetter } from "./dmsServiceNomenclature.js";

// ============================================================================
// KOPECK AND CURRENCY HELPERS
// ============================================================================

export function formatRubKopecks(rub: number): string {
	return formatKopecksToRub(rublesToKopecks(Number(rub || 0)));
}

export { formatKopecksToRub };

export function formatRubInt(kopecks: number): string {
	const rub = Math.round(kopecksToRubles(kopecks));
	return `${rub.toLocaleString("ru-RU")} ₽`;
}

export const formatKopecksToRubles = formatKopecksToRub;
export const formatKopecks = formatCurrencyKopecks;

export function validateRegistryKopeckBalance(totalBillKop: number, dmsKop: number, patientKop: number): boolean {
	return totalBillKop === dmsKop + patientKop;
}

export {
	calculateDmsGuaranteeSplit,
	type DmsSplitCalculationItem,
	type DmsSplitLineResult,
	type DmsSplitCalculationResult,
} from "../dmsFranchiseEngine.js";

export interface DmsServiceVerificationParams {
	readonly serviceCode?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly programKey?: string | undefined;
	readonly requestedPriceKopecks?: number | undefined;
	readonly guaranteeLetter?: DmsGuaranteeLetter | DmsGuaranteeLetterRecord | undefined;
}

export type DmsVerificationStatus =
	| "approved"
	| "requires_preauth"
	| "requires_letter"
	| "rejected_exclusion"
	| "excluded";

export interface DmsServiceVerificationResult {
	readonly status: DmsVerificationStatus | string;
	readonly isCovered: boolean;
	readonly requiresPreAuth: boolean;
	readonly dmsPayableKopecks: number;
	readonly patientPayableKopecks: number;
	readonly isExcludedByRule?: boolean | undefined;
	readonly approvedByGuaranteeLetter?: boolean | undefined;
}

export function verifyServiceForDms(
	code: string,
	letter?: DmsGuaranteeLetter | string | undefined,
): boolean;
export function verifyServiceForDms(
	params: DmsServiceVerificationParams,
	letter?: DmsGuaranteeLetter | undefined,
): DmsServiceVerificationResult;
export function verifyServiceForDms(
	paramsOrCode: string | DmsServiceVerificationParams,
	letter?: DmsGuaranteeLetter | string | undefined,
): boolean | DmsServiceVerificationResult {
	if (typeof paramsOrCode === "string") {
		const targetLetter = typeof letter === "object" && letter !== null ? letter : undefined;
		return isServiceCodeApprovedByLetter(paramsOrCode, targetLetter);
	}

	const code = paramsOrCode.serviceCode804n || paramsOrCode.serviceCode || "";
	const price = paramsOrCode.requestedPriceKopecks || 0;
	const gLetter = paramsOrCode.guaranteeLetter || (typeof letter === "object" && letter !== null ? letter : undefined);

	if (gLetter?.status === "expired") {
		return {
			status: "requires_letter",
			isCovered: false,
			requiresPreAuth: true,
			dmsPayableKopecks: 0,
			patientPayableKopecks: price,
		};
	}

	const normCode = code.trim();
	const excludedMatch = STANDARD_DMS_EXCLUDED_804N_SERVICES.find(
		(ex) => normCode === ex.code804n || normCode.startsWith(ex.code804n),
	);
	if (excludedMatch) {
		return {
			status: "rejected_exclusion",
			isCovered: false,
			requiresPreAuth: false,
			dmsPayableKopecks: 0,
			patientPayableKopecks: price,
			isExcludedByRule: true,
		};
	}

	const programKey = paramsOrCode.programKey;
	const isCoveredByProgram = Boolean(
		programKey &&
		(programKey === "standard_therapy" || programKey === "vip_full_coverage" || programKey === "extended_surgery_hygiene")
	);

	if (gLetter || isCoveredByProgram) {
		return {
			status: "approved",
			isCovered: true,
			requiresPreAuth: false,
			dmsPayableKopecks: price,
			patientPayableKopecks: 0,
			approvedByGuaranteeLetter: Boolean(gLetter),
		};
	}

	return {
		status: "requires_letter",
		isCovered: false,
		requiresPreAuth: true,
		dmsPayableKopecks: 0,
		patientPayableKopecks: price,
	};
}
