/**
 * packages/shared/src/utils/index.ts
 *
 * Central utilities barrel per Mandate 8s.
 */

export * from "../money.js";
export * from "./dates.js";
export * from "./strings.js";
export * from "./snils.js";
export {
	validateRussianInn,
	validateRussianOgrn,
	validateRussianKpp,
} from "../finance/taxDeduction.js";
