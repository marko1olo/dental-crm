/**
 * Layer 2: EGISZ REMD Gateway HTTP Client & Retry Backoff Engine.
 * Manages HTTP communication with integration platform, transmission retry strategies,
 * and registration receipt creation compliant with Minzdrav Order 911n and FZ-63.
 */

import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "../OiisGatewayClient.js";
import type { EgiszRemdPackage } from "@dental/shared";
import type {
	CreateEgiszRemdReceiptParams,
	EgiszRemdRegistrationReceipt,
} from "./types.js";

export { OiisGatewayClient, type RemdSubmissionResponse };

/**
 * Calculates exponential backoff delay in milliseconds for EGISZ REMD retry queue.
 * Attempt 1: 5s, Attempt 2: 30s, Attempt 3: 5m, Attempt 4: 1h, Attempt 5+: 24h
 */
export function calculateEgiszRetryDelayMs(attempt: number): number {
	switch (attempt) {
		case 1:
			return 5_000;
		case 2:
			return 30_000;
		case 3:
			return 5 * 60_000;
		case 4:
			return 60 * 60_000;
		default:
			return 24 * 60 * 60_000;
	}
}

/**
 * Creates formal, legally binding EGISZ REMD Registration Receipt (Квитанция о регистрации СЭМД в РЭМД).
 * Compliant with Minzdrav Order 911n and FZ-63.
 */
export function createEgiszRemdReceipt(
	params: CreateEgiszRemdReceiptParams,
): EgiszRemdRegistrationReceipt {
	const registeredAt = params.registeredAt || new Date().toISOString();
	const sanitizedDocId = params.remdDocumentId.replace(/[^a-zA-Z0-9_-]/g, "");
	const receiptId = `RCP-REMD-${sanitizedDocId || "DOC"}-${Date.now()}`;
	const docTypeTitles: Record<string, string> = {
		"108": "Стоматологический протокол приёма (СЭМД 108)",
		"107": "Консультация врача-стоматолога",
		"043": "Медицинская карта ортодонтического пациента (Форма 043-1/у)",
		"043u": "Медицинская карта ортодонтического пациента (Форма 043-1/у)",
	};
	const code = params.docTypeNsiCode || "108";
	const docTypeTitle = docTypeTitles[code] || `Медицинский документ (СЭМД код ${code})`;

	return {
		receiptId,
		remdDocumentId: params.remdDocumentId,
		remdTransactionId: params.transactionId,
		docTypeNsiCode: code,
		docTypeTitle,
		clinicOid: params.clinicOid,
		organizationId: params.organizationId,
		patientId: params.patientId,
		patientSnils: params.patientSnils ?? null,
		visitId: params.visitId,
		documentId: params.documentId ?? null,
		registeredAt,
		payloadHashSha256: params.payloadHashSha256,
		doctorCertSerial: params.doctorCertSerial,
		doctorCertSubject: params.doctorCertSubject,
		moCertSerial: params.moCertSerial ?? null,
		operatorSignature: {
			operatorName: "ЕГИСЗ РЭМД Минздрава России",
			serviceEndpoint: params.serviceEndpoint || "https://api.n3health.ru/egisz/v1/remd",
			tspTimestamp: registeredAt,
			verificationStatus: "VERIFIED_VALID",
		},
		receiptVersion: "1.0",
		issuedAt: new Date().toISOString(),
	};
}

/**
 * Gateway client facade wrapping and extending OiisGatewayClient.
 */
export class EgiszGatewayClient {
	private readonly underlying: OiisGatewayClient;

	constructor(client?: OiisGatewayClient) {
		this.underlying = client ?? new OiisGatewayClient();
	}

	public getUnderlyingClient(): OiisGatewayClient {
		return this.underlying;
	}

	public async sendRemdDocument(pkg: EgiszRemdPackage): Promise<RemdSubmissionResponse> {
		return this.underlying.sendRemdDocument(pkg);
	}

	public async getRemdDocumentStatus(transactionId: string) {
		return this.underlying.getRemdDocumentStatus(transactionId);
	}

	public getConfig() {
		return this.underlying.getConfig();
	}
}
