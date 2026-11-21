/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML ENGINE (ПРИКАЗ ФНС № ЕА-7-11/824@)
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "../documents/ndflXmlGenerator.js";
export {
	fnsTaxPayloadSchema,
	fnsClinicSchema,
	fnsPersonSchema,
	fnsPatientSchema,
	fnsExpensesSchema,
	fnsSignatorySchema,
	fnsFiscalReceiptItemSchema,
	fnsIdentityDocumentSchema,
	fnsFullNameSchema,
} from "../documents/fnsSchema1151156.js";
