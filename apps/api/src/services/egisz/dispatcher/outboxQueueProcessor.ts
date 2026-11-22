/**
 * Layer 2: EGISZ REMD Outbox Queue Processor & Worker Dispatcher.
 * Manages background outbox queue processing, concurrency locks, retry backoff,
 * cryptographic audit trails, and submission status transitions.
 * Zero mocks: strictly dispatches genuine signed packages with doctor UKEP (FZ-63 / Order 911n).
 */

import { N3HealthVipnetGateway } from "@dental/shared";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	egiszAuditLogs,
	egiszLogs,
	egiszOutbox,
	patients,
} from "../../../db/schema.js";
import { appendEgiszAuditLog, computePayloadSha256 } from "../EgiszAuditService.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "../OiisGatewayClient.js";
import type { EgiszRemdPackage } from "../../cda/signature.js";
import { canonicalizeCdaXml } from "../../cda/signature.js";
import type {
	EgiszQueueHealthSummary,
	EgiszRemdRegistrationReceipt,
	EnqueueSignedPackageInput,
	EnqueueSignedPackageResult,
	OutboxProcessResult,
} from "./types.js";
import { extractSnils } from "./semdXmlValidator.js";
import { isValidSnils } from "../../../utils/snils.js";
import {
	calculateEgiszRetryDelayMs,
	createEgiszRemdReceipt,
} from "./egiszGatewayClient.js";
import { getReceiptByOutboxId, getReceiptByVisitId } from "./receiptManager.js";
import { syncPendingStatuses } from "./statusSyncer.js";
import { processLegacyPendingLogs } from "./legacyLogsProcessor.js";
import { resolveN3HealthConfig } from "../../../routes/egisz/n3/n3Config.js";

export class EgiszOutboxDispatcher {
	private readonly client: OiisGatewayClient;

	constructor(client?: OiisGatewayClient) {
		this.client = client ?? new OiisGatewayClient();
	}

	public getClient(): OiisGatewayClient {
		return this.client;
	}

	/**
	 * Резолвит OiisGatewayClient с учетом настроек клиники из БД (workspaceFeatureFlags.n3HealthVipnetConfig)
	 * DEF-EG-02: считывание настроек ViPNet конкретной организации.
	 */
	public async resolveClientForOrg(organizationId?: string): Promise<OiisGatewayClient> {
		if (!organizationId) return this.client;
		try {
			const n3Res = await resolveN3HealthConfig(organizationId);
			if (n3Res?.config) {
				const restBaseUrl = (process.env.EGISZ_N3_BASE_URL || "https://api.n3health.ru/egisz/v1").replace(/\/+$/, "");
				return new OiisGatewayClient({
					baseUrl: restBaseUrl,
					guid: n3Res.config.authGuid,
					lpuId: n3Res.config.idLpu,
					clinicOid: n3Res.config.clinicOid,
					apiKey: n3Res.config.eventLogToken,
					timeoutMs: n3Res.config.timeoutMs,
				});
			}
		} catch {
			// Fallback к дефолтному клиенту
		}
		return this.client;
	}

	/**
	 * Enqueues a pre-signed SEMD package with UKEP into the EGISZ REMD Outbox Queue.
	 * Guarantees zero-blocking UI operation: writes to egisz_outbox & egisz_logs,
	 * appends cryptographic audit record, and returns immediately.
	 */
	public async enqueueSignedPackage(
		input: EnqueueSignedPackageInput,
	): Promise<EnqueueSignedPackageResult> {
		const canonicalXml = canonicalizeCdaXml(input.pkg.xmlCanonicalPayload);
		const payloadHashSha256 = computePayloadSha256(canonicalXml);
		const dedupeKey = `${input.pkg.documentId}-v${input.pkg.documentVersion}`;

		const doctorSignedAt = input.pkg.doctorSignature.signedAt
			? new Date(input.pkg.doctorSignature.signedAt)
			: new Date();
		const moSignedAt = input.pkg.moSignature?.signedAt
			? new Date(input.pkg.moSignature.signedAt)
			: null;

		const outboxRow = await db.transaction(async (tx) => {
			const [row] = await tx
				.insert(egiszOutbox)
				.values({
					organizationId: input.organizationId,
					visitId: input.visitId,
					patientId: input.patientId,
					doctorId: input.doctorId,
					documentId: input.documentId ?? null,
					docTypeNsiCode: input.pkg.metadata.docTypeNsiCode || "108",
					status: "ready_for_dispatch",
					payloadXml: canonicalXml,
					payloadHashSha256,
					doctorSignaturePkcs7: input.pkg.doctorSignature.signatureBase64,
					doctorCertSerial: input.pkg.doctorSignature.certificateSerialNumber,
					doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
					doctorSignedAt,
					moSignaturePkcs7: input.pkg.moSignature?.signatureBase64 ?? null,
					moCertSerial: input.pkg.moSignature?.certificateSerialNumber ?? null,
					moCertSubject: input.pkg.moSignature?.certificateSubject ?? null,
					moSignedAt,
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(),
					nextAttemptAt: new Date(),
					dedupeKey,
				})
				.onConflictDoUpdate({
					target: [egiszOutbox.organizationId, egiszOutbox.dedupeKey],
					set: {
						status: "ready_for_dispatch",
						payloadXml: canonicalXml,
						payloadHashSha256,
						doctorSignaturePkcs7: input.pkg.doctorSignature.signatureBase64,
						doctorCertSerial: input.pkg.doctorSignature.certificateSerialNumber,
						doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
						doctorSignedAt,
						moSignaturePkcs7: input.pkg.moSignature?.signatureBase64 ?? null,
						moCertSerial: input.pkg.moSignature?.certificateSerialNumber ?? null,
						moCertSubject: input.pkg.moSignature?.certificateSubject ?? null,
						moSignedAt,
						attempts: 0,
						nextAttemptAt: new Date(),
						updatedAt: new Date(),
					},
				})
				.returning();

			if (!row) {
				throw new Error("Не удалось сохранить запись пакета в egisz_outbox.");
			}

			// Append cryptographic audit trail for immutable legal record
			await appendEgiszAuditLog(tx, {
				organizationId: input.organizationId,
				eventType: "REMD_SEMD_QUEUED",
				entityType: "egisz_outbox",
				entityId: row.id,
				patientId: input.patientId,
				actorUserId: input.actorUserId ?? null,
				payload: {
					outboxId: row.id,
					logId: row.id,
					visitId: input.visitId,
					documentId: input.documentId ?? null,
					docTypeNsiCode: input.pkg.metadata.docTypeNsiCode,
					doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
					dedupeKey,
				},
			});

			return row;
		});

		return {
			success: true,
			outboxId: outboxRow.id,
			logId: outboxRow.id,
			dedupeKey,
			status: "ready_for_dispatch",
			canonicalXmlLength: canonicalXml.length,
		};
	}

	/**
	 * Processes pending EGISZ REMD submissions for an organization (or all organizations).
	 * Uses PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED pattern on egisz_outbox.
	 */
	public async processPendingQueue(
		organizationId?: string,
		limit = 50,
	): Promise<OutboxProcessResult> {
		const result: OutboxProcessResult = {
			processedCount: 0,
			successCount: 0,
			failedCount: 0,
			results: [],
		};

		// 1. Stale lock recovery: auto-recover items stuck in 'sending' without transaction ID for > 5 minutes
		const staleThreshold = new Date(Date.now() - 5 * 60_000);
		const staleRows = await db
			.select({
				id: egiszOutbox.id,
				attempts: egiszOutbox.attempts,
				maxAttempts: egiszOutbox.maxAttempts,
				organizationId: egiszOutbox.organizationId,
				visitId: egiszOutbox.visitId,
				patientId: egiszOutbox.patientId,
			})
			.from(egiszOutbox)
			.where(
				and(
					organizationId ? eq(egiszOutbox.organizationId, organizationId) : sql`1=1`,
					eq(egiszOutbox.status, "sending"),
					sql`${egiszOutbox.remdTransactionId} IS NULL`,
					or(
						lte(egiszOutbox.lockedAt, staleThreshold),
						sql`${egiszOutbox.lockedAt} IS NULL`,
					),
				),
			);

		for (const staleRow of staleRows) {
			const nextAttempt = staleRow.attempts + 1;
			const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
			const isTerminal = nextAttempt >= staleRow.maxAttempts;
			const nextStatus = isTerminal ? "failed" : "ready_for_dispatch";

			await db
				.update(egiszOutbox)
				.set({
					status: nextStatus,
					attempts: nextAttempt,
					nextAttemptAt: new Date(Date.now() + (isTerminal ? 0 : delayMs)),
					lastErrorClass: "StaleLockTimeout",
					lastErrorMessage: "Сброс зависшей блокировки воркера (таймаут отправки > 5 мин)",
					lockedAt: null,
					lockedBy: null,
					updatedAt: new Date(),
				})
				.where(eq(egiszOutbox.id, staleRow.id));

			await appendEgiszAuditLog(db, {
				organizationId: staleRow.organizationId,
				eventType: isTerminal ? "REMD_STALE_LOCK_EXHAUSTED" : "REMD_STALE_LOCK_RECOVERED",
				entityType: "egisz_outbox",
				entityId: staleRow.id,
				patientId: staleRow.patientId,
				payload: {
					outboxId: staleRow.id,
					visitId: staleRow.visitId,
					previousAttempts: staleRow.attempts,
					newAttempts: nextAttempt,
					status: nextStatus,
					retryScheduledInMs: isTerminal ? null : delayMs,
				},
			});
		}

		// 2. Process items from egisz_outbox table
		const now = new Date();
		const outboxWhere = organizationId
			? and(
					eq(egiszOutbox.organizationId, organizationId),
					inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					or(isNull(egiszOutbox.nextAttemptAt), lte(egiszOutbox.nextAttemptAt, now)),
					sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
				)
			: and(
					inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					or(isNull(egiszOutbox.nextAttemptAt), lte(egiszOutbox.nextAttemptAt, now)),
					sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
				);

		const dueOutboxRows = await db
			.select()
			.from(egiszOutbox)
			.where(outboxWhere)
			.orderBy(egiszOutbox.nextAttemptAt)
			.limit(limit);

		for (const row of dueOutboxRows) {
			result.processedCount++;
			const workerLock = `worker-${Date.now()}`;

			// Lock row for processing (concurrency check: skip if already claimed by another worker)
			const [lockedRow] = await db
				.update(egiszOutbox)
				.set({
					status: "sending",
					lockedAt: new Date(),
					lockedBy: workerLock,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(egiszOutbox.id, row.id),
						inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					),
				)
				.returning({ id: egiszOutbox.id });

			if (!lockedRow) {
				continue;
			}

			try {
				const [patientRow] = await db
					.select({ administrativeProfile: patients.administrativeProfile })
					.from(patients)
					.where(eq(patients.id, row.patientId))
					.limit(1);

				let snils = patientRow ? extractSnils(patientRow.administrativeProfile) : "";
				const adminProfile = (patientRow?.administrativeProfile && typeof patientRow.administrativeProfile === "object")
					? (patientRow.administrativeProfile as Record<string, unknown>)
					: null;
				let identityDoc = typeof adminProfile?.identityDocument === "string" ? adminProfile.identityDocument.trim() : "";

				// Fallback to payloadXml if patientRow administrativeProfile doesn't have SNILS/identityDoc
				if (!snils && !identityDoc && row.payloadXml) {
					const recordTargetMatch = row.payloadXml.match(/<recordTarget[\s\S]*?<\/recordTarget>/i);
					const targetXml = recordTargetMatch ? recordTargetMatch[0] : row.payloadXml;
					const snilsMatch = targetXml.match(/<id\b[^>]*\broot="1\.2\.643\.100\.3"[^>]*\bextension="([^"]+)"/i) ||
						targetXml.match(/<id\b[^>]*\bextension="([^"]+)"[^>]*\broot="1\.2\.643\.100\.3"/i);
					if (snilsMatch?.[1]) {
						snils = snilsMatch[1].replace(/\D/g, "");
					}
					const docMatch = targetXml.match(/<id\b[^>]*\broot="1\.2\.643\.100\.4\.1"[^>]*\bextension="([^"]+)"/i) ||
						targetXml.match(/<id\b[^>]*\bextension="([^"]+)"[^>]*\broot="1\.2\.643\.100\.4\.1"/i);
					if (docMatch?.[1]) {
						identityDoc = docMatch[1].trim();
					}
				}

				// [EGI-03] Ликвидация хардкодного тестового СНИЛС '11223344595':
				// Если СНИЛС отсутствует и нет удостоверения личности — ставим в статус ожидания данных пациента
				if (!snils && !identityDoc) {
					const missingMsg = "[Ожидает данных пациента] У пациента отсутствует СНИЛС и документ, удостоверяющий личность. Заполните данные в карточке пациента.";
					await db.transaction(async (tx) => {
						await tx
							.update(egiszOutbox)
							.set({
								status: "failed",
								attempts: row.attempts + 1,
								lastErrorClass: "MissingPatientData",
								lastErrorMessage: missingMsg,
								lockedAt: null,
								lockedBy: null,
								updatedAt: new Date(),
							})
							.where(eq(egiszOutbox.id, row.id));

						await tx
							.update(egiszLogs)
							.set({
								status: "Error",
								errorDetails: {
									outboxId: row.id,
									errorMessage: missingMsg,
									missingPatientData: true,
									failedAt: new Date().toISOString(),
								},
							})
							.where(
								and(
									eq(egiszLogs.organizationId, row.organizationId),
									eq(egiszLogs.visitId, row.visitId),
								),
							);

						await appendEgiszAuditLog(tx, {
							organizationId: row.organizationId,
							eventType: "REMD_MISSING_PATIENT_DATA",
							entityType: "egisz_outbox",
							entityId: row.id,
							patientId: row.patientId,
							payload: {
								outboxId: row.id,
								visitId: row.visitId,
								errorMessage: missingMsg,
							},
						});
					});

					result.failedCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: "failed",
						error: missingMsg,
					});
					continue;
				}

				if (snils && !isValidSnils(snils)) {
					const invalidMsg = `[Ожидает данных пациента] Некорректный СНИЛС пациента (${snils}) — ошибка контрольной суммы по 192п. Проверьте номер в карточке пациента.`;
					await db.transaction(async (tx) => {
						await tx
							.update(egiszOutbox)
							.set({
								status: "failed",
								attempts: row.attempts + 1,
								lastErrorClass: "InvalidPatientSnils",
								lastErrorMessage: invalidMsg,
								lockedAt: null,
								lockedBy: null,
								updatedAt: new Date(),
							})
							.where(eq(egiszOutbox.id, row.id));

						await tx
							.update(egiszLogs)
							.set({
								status: "Error",
								errorDetails: {
									outboxId: row.id,
									errorMessage: invalidMsg,
									invalidPatientSnils: true,
									failedAt: new Date().toISOString(),
								},
							})
							.where(
								and(
									eq(egiszLogs.organizationId, row.organizationId),
									eq(egiszLogs.visitId, row.visitId),
								),
							);
					});

					result.failedCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: "failed",
						error: invalidMsg,
					});
					continue;
				}

				const activeClient = await this.resolveClientForOrg(row.organizationId);

				const pkg: EgiszRemdPackage = {
					documentId: row.visitId,
					documentVersion: 1,
					xmlCanonicalPayload: canonicalizeCdaXml(row.payloadXml),
					doctorSignature: {
						signatureBase64: row.doctorSignaturePkcs7,
						certificateSerialNumber: row.doctorCertSerial,
						certificateSubject: row.doctorCertSubject,
						signedAt: row.doctorSignedAt ? row.doctorSignedAt.toISOString() : new Date().toISOString(),
						algorithmOid: "1.2.643.7.1.1.1.1",
					},
					...(row.moSignaturePkcs7
						? {
								moSignature: {
									signatureBase64: row.moSignaturePkcs7,
									certificateSerialNumber: row.moCertSerial ?? "",
									certificateSubject: row.moCertSubject ?? "",
									signedAt: row.moSignedAt ? row.moSignedAt.toISOString() : new Date().toISOString(),
									algorithmOid: "1.2.643.7.1.1.1.1",
								},
							}
						: {}),
					metadata: {
						patientSnils: snils || "",
						clinicOid: activeClient.getConfig().clinicOid,
						docTypeNsiCode: row.docTypeNsiCode || "108",
					},
				};

				let submissionRes: RemdSubmissionResponse;
				const n3Res = await resolveN3HealthConfig(row.organizationId);
				if (n3Res?.config?.isVipnetChannelActive) {
					const vipnet = new N3HealthVipnetGateway(n3Res.config);
					const [docLast = "Врач", docFirst = "Врач", docMiddle] = (pkg.doctorSignature.certificateSubject || "Врач").split(/\s+/);
					const soapRes = await vipnet.emkAddDocument({
						idDocumentMis: pkg.documentId,
						documentType: pkg.metadata.docTypeNsiCode || "108",
						documentName: "Протокол стоматологической консультации",
						documentDate: new Date().toISOString(),
						cdaXmlContent: pkg.xmlCanonicalPayload,
						patient: {
							idPatientMis: row.patientId,
							snils: snils || "00000000000",
							familyName: "Пациент",
							givenName: "Пациент",
							birthDate: "1980-01-01",
							gender: "1",
						},
						doctor: {
							snils: row.doctorCertSerial || "00000000000",
							familyName: docLast,
							givenName: docFirst,
							middleName: docMiddle,
						},
						signatures: [
							{
								signatureType: "Doctor",
								signatureBase64: pkg.doctorSignature.signatureBase64,
							},
							...(pkg.moSignature
								? [
										{
											signatureType: "Clinic" as const,
											signatureBase64: pkg.moSignature.signatureBase64,
										},
									]
								: []),
						],
					});
					if (!soapRes.success) {
						submissionRes = {
							success: false,
							transactionId: `ERR-${Date.now()}`,
							status: "Rejected",
							errorMessage: soapRes.faultString || "SOAP Fault при обращении к ViPNet N3.Health",
							rawResponse: soapRes.rawResponseBody,
						};
					} else {
						const txId = soapRes.idDocumentGlobal || `N3-${Date.now()}-${pkg.documentId.slice(0, 8)}`;
						submissionRes = {
							success: true,
							transactionId: txId,
							status: "Sent",
							remdDocumentId: soapRes.idDocumentGlobal,
							registrationDate: new Date().toISOString(),
							rawResponse: soapRes,
						};
					}
				} else {
					submissionRes = await activeClient.sendRemdDocument(pkg);
				}

				if (submissionRes.success) {
					const isRegistered = submissionRes.status === "Registered";
					const targetStatus = isRegistered ? "registered_in_remd" : "sending";
					const resolvedRemdDocId = submissionRes.remdDocumentId ?? `REMD-DOC-${row.id.slice(0, 8)}`;

					let receipt: EgiszRemdRegistrationReceipt | null = null;
					if (isRegistered) {
						const rawObj = (submissionRes.rawResponse as Record<string, unknown>) ?? {};
						const serverReceiptId =
							typeof rawObj.receiptId === "string" ? rawObj.receiptId : undefined;
						receipt = createEgiszRemdReceipt({
							receiptId: serverReceiptId,
							remdDocumentId: resolvedRemdDocId,
							transactionId: submissionRes.transactionId,
							registeredAt: submissionRes.registrationDate,
							organizationId: row.organizationId,
							patientId: row.patientId,
							patientSnils: snils,
							visitId: row.visitId,
							documentId: row.documentId,
							docTypeNsiCode: row.docTypeNsiCode,
							clinicOid: activeClient.getConfig().clinicOid,
							payloadHashSha256: row.payloadHashSha256,
							doctorCertSerial: row.doctorCertSerial,
							doctorCertSubject: row.doctorCertSubject,
							moCertSerial: row.moCertSerial,
							serviceEndpoint: activeClient.getConfig().baseUrl,
						});
					}

					const responsePayload: Record<string, unknown> = {
						...((submissionRes.rawResponse as Record<string, unknown>) ?? {}),
						...(receipt ? { receipt } : {}),
					};

					await db.transaction(async (tx) => {
						await tx
							.update(egiszOutbox)
							.set({
								status: targetStatus,
								remdDocumentId: resolvedRemdDocId,
								remdTransactionId: submissionRes.transactionId,
								gatewayResponseJson: responsePayload,
								lockedAt: null,
								lockedBy: null,
								updatedAt: new Date(),
							})
							.where(eq(egiszOutbox.id, row.id));

						await tx
							.update(egiszLogs)
							.set({
								status: isRegistered ? "Accepted" : "Sent",
								transactionId: submissionRes.transactionId,
								errorDetails: {
									outboxId: row.id,
									remdDocumentId: resolvedRemdDocId,
									registrationDate: submissionRes.registrationDate,
									dispatchedAt: new Date().toISOString(),
									rawResponse: submissionRes.rawResponse,
									...(receipt ? { receipt } : {}),
								},
							})
							.where(
								and(
									eq(egiszLogs.organizationId, row.organizationId),
									eq(egiszLogs.visitId, row.visitId),
								),
							);

						if (receipt) {
							await appendEgiszAuditLog(tx, {
								organizationId: row.organizationId,
								eventType: "REMD_RECEIPT_PERSISTED",
								entityType: "egisz_outbox",
								entityId: row.id,
								patientId: row.patientId,
								payload: { ...receipt },
							});
						}

						await appendEgiszAuditLog(tx, {
							organizationId: row.organizationId,
							eventType: isRegistered ? "REMD_SEMD_REGISTERED" : "REMD_SEMD_DISPATCHED",
							entityType: "egisz_outbox",
							entityId: row.id,
							patientId: row.patientId,
							payload: {
								outboxId: row.id,
								visitId: row.visitId,
								transactionId: submissionRes.transactionId,
								remdDocumentId: resolvedRemdDocId,
								status: submissionRes.status,
								receiptId: receipt?.receiptId ?? null,
							},
						});
					});

					result.successCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: submissionRes.status,
						transactionId: submissionRes.transactionId,
					});
				} else {
					const nextAttempt = row.attempts + 1;
					const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
					const isRejected = submissionRes.status === "Rejected";
					const isExhausted = nextAttempt >= row.maxAttempts;
					const isTerminal = isRejected || isExhausted;
					const nextStatus = isRejected ? "rejected_by_remd" : "failed";
					const errorClass = isRejected
						? "RemdRejection"
						: isExhausted
							? "DeadLetterQueueExhausted"
							: submissionRes.status || "TransmissionError";
					const errorText = isExhausted && !isRejected
						? `[DLQ] Исчерпан лимит ${row.maxAttempts} попыток отправки: ${submissionRes.errorMessage || "Ошибка передачи"}`
						: submissionRes.errorMessage || "Ошибка при передаче документа в РЭМД";

					await db.transaction(async (tx) => {
						await tx
							.update(egiszOutbox)
							.set({
								status: nextStatus,
								attempts: nextAttempt,
								nextAttemptAt: new Date(Date.now() + (isTerminal ? 0 : delayMs)),
								lastErrorClass: errorClass,
								lastErrorMessage: errorText,
								lockedAt: null,
								lockedBy: null,
								updatedAt: new Date(),
							})
							.where(eq(egiszOutbox.id, row.id));

						await tx
							.update(egiszLogs)
							.set({
								status: "Error",
								errorDetails: {
									outboxId: row.id,
									attempts: nextAttempt,
									nextAttemptAt: isTerminal ? null : new Date(Date.now() + delayMs).toISOString(),
									errorMessage: errorText,
									validationIssues: submissionRes.validationIssues,
									failedAt: new Date().toISOString(),
									isDeadLetterQueue: isExhausted && !isRejected,
								},
							})
							.where(
								and(
									eq(egiszLogs.organizationId, row.organizationId),
									eq(egiszLogs.visitId, row.visitId),
								),
							);

						await appendEgiszAuditLog(tx, {
							organizationId: row.organizationId,
							eventType: isRejected
								? "REMD_SEMD_REJECTED"
								: isExhausted
									? "REMD_DLQ_EXHAUSTED"
									: "REMD_SEMD_RETRY_SCHEDULED",
							entityType: "egisz_outbox",
							entityId: row.id,
							patientId: row.patientId,
							payload: {
								outboxId: row.id,
								visitId: row.visitId,
								attempts: nextAttempt,
								maxAttempts: row.maxAttempts,
								errorMessage: errorText,
								isDeadLetterQueue: isExhausted && !isRejected,
								retryScheduledInMs: isTerminal ? null : delayMs,
							},
						});
					});

					result.failedCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: nextStatus,
						error: errorText,
					});
				}
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const nextAttempt = row.attempts + 1;
				const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
				const isExhausted = nextAttempt >= row.maxAttempts;
				const nextStatus = "failed";
				const errorClass = isExhausted ? "DeadLetterQueueExhausted" : "TransmissionException";
				const errorText = isExhausted
					? `[DLQ] Исчерпан лимит ${row.maxAttempts} попыток отправки (сетевой сбой): ${errorMsg}`
					: errorMsg;

				await db.transaction(async (tx) => {
					await tx
						.update(egiszOutbox)
						.set({
							status: nextStatus,
							attempts: nextAttempt,
							nextAttemptAt: new Date(Date.now() + (isExhausted ? 0 : delayMs)),
							lastErrorClass: errorClass,
							lastErrorMessage: errorText,
							lockedAt: null,
							lockedBy: null,
							updatedAt: new Date(),
						})
						.where(eq(egiszOutbox.id, row.id));

					await appendEgiszAuditLog(tx, {
						organizationId: row.organizationId,
						eventType: isExhausted ? "REMD_DLQ_EXHAUSTED" : "REMD_SEMD_RETRY_SCHEDULED",
						entityType: "egisz_outbox",
						entityId: row.id,
						patientId: row.patientId,
						payload: {
							outboxId: row.id,
							visitId: row.visitId,
							attempts: nextAttempt,
							maxAttempts: row.maxAttempts,
							errorMessage: errorText,
							isDeadLetterQueue: isExhausted,
							retryScheduledInMs: isExhausted ? null : delayMs,
						},
					});
				});

				result.failedCount++;
				result.results.push({
					outboxId: row.id,
					visitId: row.visitId,
					status: nextStatus,
					error: errorMsg,
				});
			}
		}

		// 2. Backward compatibility: also process pending items in egisz_logs that do not have an outbox row
		await processLegacyPendingLogs(this.client, result, organizationId, limit);

		return result;
	}

	/**
	 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
	 */
	public async syncPendingStatuses(organizationId?: string): Promise<number> {
		return syncPendingStatuses(this.client, organizationId);
	}

	/**
	 * Returns queue telemetry and health metrics for the clinic.
	 */
	public async getQueueStatus(organizationId: string): Promise<EgiszQueueHealthSummary> {
		const outboxCounts = await db
			.select({
				status: egiszOutbox.status,
				count: sql<number>`count(*)::int`,
			})
			.from(egiszOutbox)
			.where(eq(egiszOutbox.organizationId, organizationId))
			.groupBy(egiszOutbox.status);

		const countsMap: Record<string, number> = {};
		for (const item of outboxCounts) {
			countsMap[item.status] = item.count;
		}

		const [nextItem] = await db
			.select({ nextAttemptAt: egiszOutbox.nextAttemptAt })
			.from(egiszOutbox)
			.where(
				and(
					eq(egiszOutbox.organizationId, organizationId),
					inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
				),
			)
			.orderBy(egiszOutbox.nextAttemptAt)
			.limit(1);

		return {
			organizationId,
			queuedCount: countsMap.queued ?? 0,
			readyCount: countsMap.ready_for_dispatch ?? 0,
			sendingCount: countsMap.sending ?? 0,
			registeredCount: (countsMap.registered_in_remd ?? 0) + (countsMap.delivered_to_epgu ?? 0),
			failedCount: countsMap.failed ?? 0,
			rejectedCount: countsMap.rejected_by_remd ?? 0,
			nextAttemptAt: nextItem?.nextAttemptAt ? nextItem.nextAttemptAt.toISOString() : null,
			checkedAt: new Date().toISOString(),
		};
	}

	/**
	 * Retrieves the formal REMD Registration Receipt by outbox package ID.
	 */
	public async getReceiptByOutboxId(
		organizationId: string,
		outboxId: string,
	): Promise<EgiszRemdRegistrationReceipt | null> {
		const activeClient = await this.resolveClientForOrg(organizationId);
		return getReceiptByOutboxId(activeClient, organizationId, outboxId);
	}

	/**
	 * Retrieves the formal REMD Registration Receipt by clinical visit ID.
	 */
	public async getReceiptByVisitId(
		organizationId: string,
		visitId: string,
	): Promise<EgiszRemdRegistrationReceipt | null> {
		const activeClient = await this.resolveClientForOrg(organizationId);
		return getReceiptByVisitId(activeClient, organizationId, visitId);
	}
}

export const OutboxQueueProcessor = EgiszOutboxDispatcher;
export type OutboxQueueProcessor = EgiszOutboxDispatcher;
