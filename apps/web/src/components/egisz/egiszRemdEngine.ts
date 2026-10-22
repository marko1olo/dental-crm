/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION ENGINE FACADE — DENTE DENTAL CRM
 * Re-exports modular statutory preflight engines, dictionaries, and formats
 * Mandate 8s: Modular architecture and Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "./remdXml/egiszRemdPresets";

export {
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type GostSignatureInfo,
	type XmlStructureValidationResult,
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificateXml,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	validateXmlStructure,
} from "./cdaR2XmlBuilder";

export type {
	EgiszPreflightCheckResult,
	EgiszPreflightReport,
	FnsTaxPreflightReport,
} from "./engine/engineTypes";

export {
	generateEgiszXmlFilename,
	generateFnsTaxXmlFilename,
} from "./engine/egiszFilenames";

export { runEgisz043uPreflight } from "./engine/clinicalPreflightEngine";
export { runFnsTaxCertificatePreflight } from "./engine/fnsTaxPreflightEngine";

export {
	generateForm043uPrintHtml,
	generateFnsTaxCertificatePrintHtml,
} from "./egiszRemdPrintTemplates";

export {
	SAMPLE_DENTAL_SEMD_105_PRESET,
	SAMPLE_FNS_TAX_1151156_PRESET,
} from "./egiszRemdSamplePresets";

// Backwards compatibility alias
import type { EgiszDentalCdaPayload } from "./cdaR2XmlBuilder";
import { generateEgiszDentalCdaXml } from "./cdaR2XmlBuilder";
export type Egisz043uPayload = EgiszDentalCdaPayload;
export const generateEgisz043uCdaXml = generateEgiszDentalCdaXml;
