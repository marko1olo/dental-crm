/**
 * Layer 5: Clean barrel export for all migration normalizers.
 */

export type {
	DateFormatHint,
	DateOrder,
	Gender,
	NormalizedDateTime,
	NormalizedName,
	NormalizedPhone,
	NormalizedValue,
} from "./types.js";

export {
	dateOnlyPart,
	detectDateOrder,
	formatNormalizedDateTime,
	isNullToken,
	normalizeDateTimeValue,
	normalizeDateValue,
	normalizeText,
	storedDateTimeToUtc,
} from "./textAndDateNormalizers.js";

export {
	combineNameParts,
	fixNameCase,
	normalizeNameValue,
	normalizePhoneValue,
} from "./phoneAndNameNormalizers.js";

export {
	normalizeBooleanValue,
	normalizeEmailValue,
	normalizeEnumValue,
	normalizeGenderValue,
	normalizeMoneyRubles,
	normalizeMoneyValue,
	normalizeToothCode,
	truncateForMessage,
} from "./financialAndClinicalNormalizers.js";
