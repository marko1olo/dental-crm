/**
 * Layer 0: Types & DTOs for EGISZ REMD Outbox Dispatcher Subsystem.
 * 0 runtime dependencies, pure interfaces and types.
 * Minzdrav FZ-63 / Order 911n compliant.
 */

import type { EgiszRemdRegistrationReceipt, EgiszRemdPackage } from "@dental/shared";

export type { EgiszRemdRegistrationReceipt };

export interface OutboxProcessResult {
	processedCount: number;
	successCount: number;
	failedCount: number;
	results: Array<{
		outboxId?: string | undefined;
		logId?: string | undefined;
		visitId?: string | null | undefined;
		status: string;
		transactionId?: string | undefined;
		error?: string | undefined;
	}>;
}

export interface EnqueueSignedPackageInput {
	organizationId: string;
	patientId: string;
	visitId: string;
	doctorId: string;
	documentId?: string | null | undefined;
	pkg: EgiszRemdPackage;
	actorUserId?: string | null | undefined;
}

export interface EnqueueSignedPackageResult {
	success: true;
	outboxId: string;
	logId: string;
	dedupeKey: string;
	status: "ready_for_dispatch";
	canonicalXmlLength: number;
}

export interface EgiszQueueHealthSummary {
	organizationId: string;
	queuedCount: number;
	readyCount: number;
	sendingCount: number;
	registeredCount: number;
	failedCount: number;
	rejectedCount: number;
	nextAttemptAt: string | null;
	checkedAt: string;
}

export interface CreateEgiszRemdReceiptParams {
	remdDocumentId: string;
	transactionId: string;
	registeredAt?: string | null | undefined;
	organizationId: string;
	patientId: string;
	patientSnils?: string | null | undefined;
	visitId: string;
	documentId?: string | null | undefined;
	docTypeNsiCode?: string | null | undefined;
	clinicOid: string;
	payloadHashSha256: string;
	doctorCertSerial: string;
	doctorCertSubject: string;
	moCertSerial?: string | null | undefined;
	serviceEndpoint?: string | undefined;
}

export interface EgiszOutboxItem {
	id: string;
	organizationId: string;
	visitId: string;
	patientId: string;
	doctorId: string;
	documentId?: string | null;
	docTypeNsiCode?: string | null;
	status: string;
	payloadXml: string;
	payloadHashSha256: string;
	doctorSignaturePkcs7: string;
	doctorCertSerial: string;
	doctorCertSubject: string;
	doctorSignedAt: Date;
	moSignaturePkcs7?: string | null;
	moCertSerial?: string | null;
	moCertSubject?: string | null;
	moSignedAt?: Date | null;
	attempts: number;
	maxAttempts: number;
	scheduledAt: Date;
	nextAttemptAt?: Date | null;
	lockedAt?: Date | null;
	lockedBy?: string | null;
	remdTransactionId?: string | null;
	remdDocumentId?: string | null;
	lastErrorClass?: string | null;
	lastErrorMessage?: string | null;
	dedupeKey: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface SemdXmlValidationResult {
	isValid: boolean;
	docTypeNsiCode?: string | undefined;
	doctorSnils?: string | undefined;
	clinicOid?: string | undefined;
	errors: string[];
	warnings: string[];
}

export interface CryptoProSignatureVerificationResult {
	isValid: boolean;
	certificateSerialNumber?: string | undefined;
	certificateSubject?: string | undefined;
	algorithmOid?: string | undefined;
	error?: string | undefined;
}
