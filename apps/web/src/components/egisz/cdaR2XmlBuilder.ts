/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 XML BUILDER & FNS TAX DEDUCTION (КНД 1151156) FACADE
 * Canonical SSOT delegated to @dental/shared/cda & modular cdaR2 engine
 * Mandate 8s: Single source of truth, elimination of duplicated logic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	escapeXml,
	formatHl7DateTime,
	formatRuDate,
} from "@dental/shared/cda";

export {
	formatKopecksToRubles,
	parseRublesToKopecks,
	canonicalizeCdaXml,
} from "./cdaR2/kopeckMath";

export type {
	EgiszClinicInfo,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
	EgiszDiagnosisItem,
	GostSignatureInfo,
	EgiszDentalCdaPayload,
	FnsTaxPaymentItem,
	FnsTaxCertificatePayload,
} from "./cdaR2/cdaTypes";

export { generateEgiszDentalCdaXml } from "./cdaR2/dentalCdaXmlGenerator";
export { generateFnsTaxCertificateXml } from "./cdaR2/fnsTaxCertificateXmlGenerator";

export {
	validateXmlStructure,
	type XmlStructureValidationResult,
} from "./cdaR2/xmlStructureValidator";

export {
	generateGostXmlSignatureBlock,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
} from "./cdaR2/gostSignatures";
