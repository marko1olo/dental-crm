/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION PRINTABLE TEMPLATES FACADE — DENTE DENTAL CRM
 * Form 043/u (Медицинская карта) & FNS KND 1151156 (Справка об оплате услуг)
 * Compliant with Order 804n, Order ED-7-11/755@, and Mandate 8d p. 7 (Zero Emojis)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export { generateForm043uPrintHtml } from "./printTemplates/print043uTemplate";
export { generateFnsTaxCertificatePrintHtml } from "./printTemplates/printFnsTaxTemplate";
export {
	generateMedicalRecordExtractPrintHtml,
	type MedicalRecordExtractPayload,
} from "./printTemplates/printExtractTemplate";
