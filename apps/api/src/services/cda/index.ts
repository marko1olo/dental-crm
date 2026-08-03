/**
 * EGISZ CDA Form 043/u generator — modular entry point.
 * Parses params with Zod, builds flat (non-recursive) CDA R2 XML.
 */

import { generateCdaAuthorAndCustodian } from "./author.js";
import { generateCdaBody } from "./body.js";
import { generateCdaHeader } from "./header.js";
import { generateCdaPatient } from "./patient.js";
import {
	egiszCdaParamsSchema,
	type EgiszCdaParams,
} from "./schema.js";
import { buildCdaContext } from "./util.js";

export type { EgiszCdaParams };
export { egiszCdaParamsSchema };

/**
 * Generate HL7 CDA R2 XML for Form 043/u dental exam protocol (LOINC 74208-1).
 * Accepts unknown input and validates via Zod before generation.
 */
export function generateDentalCdaXml(params: unknown): string {
	const parsed: EgiszCdaParams = egiszCdaParamsSchema.parse(params);
	const ctx = buildCdaContext(parsed);
	return (
		generateCdaHeader(ctx) +
		generateCdaPatient(ctx) +
		generateCdaAuthorAndCustodian(ctx) +
		generateCdaBody(ctx)
	);
}
