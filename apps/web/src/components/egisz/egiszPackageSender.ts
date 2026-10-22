/**
 * egiszPackageSender.ts — Thin facade for EGISZ REMD and FNS transmission & ZIP export.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./packageSender/
 */

export type {
	PackageZipExportOptions,
	BuildDeferredRemdOptions,
	SubmitCdaPackageOptions,
	SubmitFnsTaxOptions,
} from "./packageSender/packageSenderTypes";

export {
	exportSingleDocumentZip,
	exportBatchDocumentsZip,
} from "./packageSender/remdZipExporter";

export { buildDeferredRemdRecord } from "./packageSender/deferredRemdRecord";

export {
	fetchOutboxRecordsFromBackend,
	submitCdaPackageToRemd,
	submitFnsTaxToGateway,
} from "./packageSender/remdApiSubmissions";
