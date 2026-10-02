/**
 * apps/web/src/utils/snils.ts
 * Re-export facade to formatters.ts per Mandate 8s (SSOT: formatters.ts).
 */
export {
	isValidSnils,
	normalizeSnils,
	formatSnils,
	maskRussianSnils,
} from "./formatters.js";
