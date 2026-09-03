/**
 * apps/web/src/components/tax/index.ts
 *
 * DENTE Dental CRM — Tax Deduction Domain Module.
 * Re-exports the canonical 1-click Tax Deduction Modal (Form КНД 1151156 / Приказ ФНС № ЕА-7-11/824@)
 * and related tax deduction calculation utilities.
 */

export { TaxDeductionModal, type TaxDeductionModalProps } from "./TaxDeductionModal";
export { default } from "./TaxDeductionModal";

export {
	FnsTaxDeductionModal,
	type FnsTaxDeductionModalProps,
} from "../billing/tax/FnsTaxDeductionModal";

export {
	calculateExactTaxSplitKopecks,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionXml,
	generateTaxCertificateQrSvg,
	printTaxCertificateKnd1151156,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "../billing/tax/fnsTaxDeductionEngine";
