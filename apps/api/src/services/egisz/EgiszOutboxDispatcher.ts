/**
 * Canonical Facade for EGISZ REMD Outbox Dispatcher Service.
 * Decomposed into modular DAG layers under ./dispatcher/
 * Preserves 100% backward compatibility for all imports and call sites.
 */

export type {
	EgiszRemdRegistrationReceipt,
	OutboxProcessResult,
	EnqueueSignedPackageInput,
	EnqueueSignedPackageResult,
	EgiszQueueHealthSummary,
	CreateEgiszRemdReceiptParams,
	EgiszOutboxItem,
	SemdXmlValidationResult,
	CryptoProSignatureVerificationResult,
} from "./dispatcher/index.js";

export {
	calculateEgiszRetryDelayMs,
	createEgiszRemdReceipt,
	extractSnils,
	isValidSnilsChecksum,
	validateSemdXml,
	sanitizeXmlString,
	verifyCryptoProSignature,
	validateDoctorSignature,
	GOST_3410_2012_256_OID,
	GOST_3410_2012_512_OID,
	EgiszGatewayClient,
	getReceiptByOutboxId,
	getReceiptByVisitId,
	syncPendingStatuses,
	OutboxQueueProcessor,
	EgiszOutboxDispatcher,
} from "./dispatcher/index.js";
