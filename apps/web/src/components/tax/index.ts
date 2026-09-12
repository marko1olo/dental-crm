/**
 * apps/web/src/components/tax/index.ts
 *
 * DENTE Dental CRM — Tax Deduction Domain Module.
 * Re-exports the canonical 1-click Tax Deduction Modal (Form КНД 1151156 / Приказ ФНС № ЕА-7-11/824@)
 * and related tax deduction calculation utilities.
 */

export { TaxDeductionModal, type TaxDeductionModalProps } from "./TaxDeductionModal";
export { default } from "./TaxDeductionModal";

// Backward-compatibility alias for legacy imports
export {
	TaxDeductionModal as FnsTaxDeductionModal,
	type TaxDeductionModalProps as FnsTaxDeductionModalProps,
} from "./TaxDeductionModal";

export {
	downloadFnsBatchNoMedoplXmlFile,
	downloadFnsBatchTaxXmlFile,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	printTaxCertificateKnd1151156,
	renderTaxDeductionBatchCertificateHtml,
	renderTaxDeductionCertificateHtml,
} from "../finance/taxDeductionEngine";

export {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateExactTaxSplitKopecks,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateCode128Svg,
	generateFamilyTaxDeductionBatch,
	generateFnsBatchNoMedoplXml,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type ExactTaxSplitKopecks,
	type FamilyMemberBatchCertificateSummary,
	type FamilyMemberPayerConfig,
	type FamilyTaxDeductionBatchResult,
	type FnsTaxCertificateValidationResult,
	type GenerateFamilyTaxDeductionBatchOptions,
	type QrSvgOptions,
	type TaxDeductionBatchParams,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionClinicParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionPersonParams,
	type TaxDeductionRelationship,
	type TaxDeductionYearSummary,
	validateFnsTaxXmlStructure,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
	validateTaxCertificateParams,
} from "@dental/shared";

