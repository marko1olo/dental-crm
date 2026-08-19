/**
 * EGISZ SEMD 108 (HL7 CDA R2 Dental Consultation Protocol) generator — modular entry point.
 * Parses params with Zod, validates Minzdrav regulatory rules, and builds CDA R2 XML.
 */

import { generateCdaAuthorAndCustodian } from "./author.js";
import { generateCdaBody } from "./body.js";
import { generateCdaHeader } from "./header.js";
import { generateCdaPatient } from "./patient.js";
import { type EgiszCdaParams, egiszCdaParamsSchema } from "./schema.js";
import { buildCdaContext } from "./util.js";

export type {
	DentalStatusItem,
	DentalToothSurface,
	EgiszCdaParams,
	LegalAuthenticator,
	PersonName,
	ServiceRenderedItem,
} from "./schema.js";

export {
	dentalStatusItemSchema,
	dentalToothSurfaceSchema,
	egiszCdaParamsSchema,
	legalAuthenticatorSchema,
	personNameSchema,
	serviceRenderedItemSchema,
} from "./schema.js";

export {
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	type DetachedSignature,
	type EgiszRemdPackage,
} from "./signature.js";

export {
	ALL_VALID_FDI_TOOTH_NUMBERS,
	DEFAULT_MO_ROOT,
	EGISZ_OIDS,
	VALID_ADULT_TOOTH_NUMBERS,
	VALID_CHILD_TOOTH_NUMBERS,
	buildCdaContext,
	clinicAddrXml,
	clinicTelecomXml,
	doctorCodeXml,
	doctorIdXml,
	doctorNameXml,
	doctorTelecomXml,
	escapeXml,
	flatAssignedEntity,
	flatRepresentedOrganization,
	flatScopingOrganization,
	formatHl7DateTime,
	isAdultToothNumber,
	isChildToothNumber,
	isValidFdiToothNumber,
	normalizeDentalCondition,
	normalizeToothSurfaces,
	orgIdXml,
	patientAddrXml,
	patientTelecomXml,
	type CdaContext,
	type DentalConditionInfo,
	type ToothSurfaceInfo,
} from "./util.js";

export {
	isValidSnils,
	normalizeSnils,
	validateCdaParams,
	validateFdiTooth,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOid,
	validateOrder804nCode,
	type CdaValidationResult,
} from "./validator.js";

export { generateCdaHeader } from "./header.js";
export { generateCdaPatient } from "./patient.js";
export { generateCdaAuthorAndCustodian } from "./author.js";
export { generateCdaBody } from "./body.js";

export type CdaResult =
	| { success: true; xml: string }
	| { success: false; error: import("zod").ZodError };

/**
 * Generate HL7 CDA R2 XML for SEMD 108 dental examination protocol.
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
