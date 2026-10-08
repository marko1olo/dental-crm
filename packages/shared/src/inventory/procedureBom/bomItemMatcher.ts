import type { ProcedureBomMap } from "./types.js";
import { PROCEDURE_804N_ALIASES, STANDARD_PROCEDURE_BOM_MAPS } from "./constants.js";

/**
 * Retrieves the standard Bill of Materials (BOM) technological map for an 804n code.
 * Supports exact codes, child sub-codes (e.g. A16.07.002.001), and aliases.
 */
export function getStandardBOMForProcedure(code804n: string): ProcedureBomMap | undefined {
	if (!code804n) return undefined;
	const normalizedCode = code804n.trim().toUpperCase();
	if (STANDARD_PROCEDURE_BOM_MAPS[normalizedCode]) {
		return STANDARD_PROCEDURE_BOM_MAPS[normalizedCode];
	}
	const aliasTarget = PROCEDURE_804N_ALIASES[normalizedCode];
	if (aliasTarget && STANDARD_PROCEDURE_BOM_MAPS[aliasTarget]) {
		return STANDARD_PROCEDURE_BOM_MAPS[aliasTarget];
	}
	const segments = normalizedCode.split(".");
	if (segments.length > 3) {
		const basePrefix = segments.slice(0, 3).join(".");
		if (STANDARD_PROCEDURE_BOM_MAPS[basePrefix]) {
			return STANDARD_PROCEDURE_BOM_MAPS[basePrefix];
		}
	}
	return undefined;
}
