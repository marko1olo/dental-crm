/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Integration Types & Schemas.
 * Layer 0: Pure DTOs, Zod Validation Schemas, and Interface Contracts.
 *
 * Single Source of Truth (SSOT) re-exporting directly from @dental/shared.
 */

export {
	exportCommerceMlParamsSchema,
	type ExportCommerceMlParams,
	oneCReconciledPaymentSchema,
	type OneCReconciledPayment,
	oneCInventoryStockUpdateSchema,
	type OneCInventoryStockUpdate,
	oneCPostedDocumentConfirmationSchema,
	type OneCPostedDocumentConfirmation,
	oneCSyncPayloadSchema,
	type OneCSyncPayload,
	type OneCSyncResult,
	exportCatalogParamsSchema,
	type ExportCatalogParams,
	type OneCCatalogXmlResult,
	exportOffersParamsSchema,
	type ExportOffersParams,
	type OneCOffersXmlResult,
	type CommerceMlPackageResult,
	type DoublePostingCheckResult,
} from "@dental/shared";
