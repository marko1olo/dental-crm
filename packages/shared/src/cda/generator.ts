/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED EGISZ REMD CDA R2 XML GENERATOR (МИНЗДРАВ РФ)
 * Central routing and generation facade for SEMD 101, 104, and 130.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { canonicalizeCdaXml } from "./c14n.js";
import { generateSemd101Xml } from "./generator101.js";
import { generateSemd104Xml } from "./generator104.js";
import { generateSemd130Xml } from "./generator130.js";
import { cdaSemd101Schema, cdaSemd104Schema, cdaSemd130Schema } from "./schemas.js";
import type {
	CdaDocumentParams,
	CdaGenerationResult,
	CdaSemd101Params,
	CdaSemd104Params,
	CdaSemd130Params,
} from "./types.js";
import { validateCdaParams } from "./validator.js";

/**
 * Universal generator for Russian EGISZ REMD CDA Release 2 XML documents.
 * Validates input parameters against statutory rules, produces valid HL7 CDA R2 XML,
 * and canonicalizes it for digital signing (ГОСТ Р 34.10-2012 / УКЭП).
 */
export function generateCdaXml(params: unknown): CdaGenerationResult {
	const validation = validateCdaParams(params);
	if (!validation.valid) {
		return {
			success: false,
			errors: validation.errors,
			issues: validation.issues,
		};
	}

	const docParams = params as CdaDocumentParams;
	let xml = "";

	if (docParams.docKind === "104") {
		const parsed = cdaSemd104Schema.parse(params);
		xml = generateSemd104Xml(parsed as CdaSemd104Params);
	} else if (docParams.docKind === "130") {
		const parsed = cdaSemd130Schema.parse(params);
		xml = generateSemd130Xml(parsed as CdaSemd130Params);
	} else {
		const parsed = cdaSemd101Schema.parse(params);
		xml = generateSemd101Xml(parsed as CdaSemd101Params);
	}

	const canonicalXml = canonicalizeCdaXml(xml);

	return {
		success: true,
		xml,
		canonicalXml,
		docType: docParams.docKind,
	};
}
