/**
 * EGISZ CDA Form 043/u generator — modular entry point.
 * Parses params with Zod, builds flat (non-recursive) CDA R2 XML.
 */

import { generateCdaAuthorAndCustodian } from "./author.js";
import { generateCdaBody } from "./body.js";
import { generateCdaHeader } from "./header.js";
import { generateCdaPatient } from "./patient.js";
import { type EgiszCdaParams, egiszCdaParamsSchema } from "./schema.js";
import { buildCdaContext } from "./util.js";

export type { EgiszCdaParams };
export { egiszCdaParamsSchema };

export type CdaResult =
	| { success: true; xml: string }
	| { success: false; error: import("zod").ZodError };

/**
 * Generate HL7 CDA R2 XML for Form 043/u dental exam protocol (LOINC 74208-1).
 * Accepts unknown input and validates via Zod before generation.
 * Uses safeParse to avoid fatal errors during recovery (graceful degradation).
 */
export function generateDentalCdaXml(params: unknown): CdaResult {
	const parsedResult = egiszCdaParamsSchema.safeParse(params);
	if (!parsedResult.success) {
		return { success: false, error: parsedResult.error };
	}
	const ctx = buildCdaContext(parsedResult.data);
	const xml =
		generateCdaHeader(ctx) +
		generateCdaPatient(ctx) +
		generateCdaAuthorAndCustodian(ctx) +
		generateCdaBody(ctx);
	return { success: true, xml };
}
