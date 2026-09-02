/**
 * EGISZ REMD CDA R3 / R2 XML Generator Facade.
 * Provides deterministic HL7 CDA R2/R3 generation for Russian medical documentation:
 * - SEMD 108 / 101: Dental Consultation Protocol (Протокол консультации стоматолога)
 * - SEMD 104: Stomatological Epicrisis (Выписной эпикриз)
 * - SEMD 109 / Form 043-1/у: Orthodontic Patient Card (Карта ортодонтического пациента)
 * - SEMD 130: Tax Deduction Medical Services Certificate (Справка об оплате мед. услуг, КНД 1151156)
 */

export type {
	DentalStatusItem,
	DentalToothSurface,
	EgiszCdaParams,
	LegalAuthenticator,
	PersonName,
	ServiceRenderedItem,
	CdaResult,
} from "./cda/index.js";

export {
	generateDentalCdaXml,
	canonicalizeCdaXml,
	buildEgiszRemdSubmissionPackage,
	egiszRemdPackageSchema,
	detachedSignatureSchema,
	type EgiszRemdPackage,
	type DetachedSignature,
} from "./cda/index.js";

export {
	generateCdaXml,
	generateSemd101Xml,
	generateSemd104Xml,
	generateSemd130Xml,
	generateSemd043_1uXml,
	type CdaDocumentParams,
	type CdaGenerationResult,
	type CdaSemd101Params,
	type CdaSemd104Params,
	type CdaSemd130Params,
	type CdaSemd043_1uParams,
} from "@dental/shared";

import { generateDentalCdaXml, type CdaResult, type EgiszCdaParams } from "./cda/index.js";

/**
 * Generates SEMD 108 / 101 (CDA R3/R2) XML directly for Form 043/у outpatient visit diary.
 * Enforces deterministic sorting of odontogram surfaces, Order 804n services, and C14N canonicalization.
 */
export function generateVisit043CdaXml(params: unknown): CdaResult {
	return generateDentalCdaXml(params);
}

