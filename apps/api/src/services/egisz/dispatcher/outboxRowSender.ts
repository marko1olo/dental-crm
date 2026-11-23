/**
 * Layer 3: EGISZ REMD Outbox Single Row Sender & Transmission Processor.
 * Dispatches individual outbox rows to REMD / ViPNet N3.Health, handles
 * statutory receipts, crypto audit trails, and retry/DLQ backoff state machines.
 */

import { N3HealthVipnetGateway } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	egiszLogs,
	egiszOutbox,
	patients,
	users,
} from "../../../db/schema.js";
import { appendEgiszAuditLog } from "../EgiszAuditService.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "../OiisGatewayClient.js";
import type { EgiszRemdPackage } from "../../cda/signature.js";
import type {
	EgiszRemdRegistrationReceipt,
	OutboxProcessResult,
} from "./types.js";
import { extractSnils } from "./semdXmlValidator.js";
import { isValidSnils, normalizeSnils } from "../../../utils/snils.js";
import {
	calculateEgiszRetryDelayMs,
	createEgiszRemdReceipt,
} from "./egiszGatewayClient.js";
import { resolveN3HealthConfig } from "../../../routes/egisz/n3/n3Config.js";
import {
	readGenderFromProfile,
	splitFullName,
} from "../../../routes/egisz/helpers.js";

export type OutboxRowResultItem = OutboxProcessResult["results"][number];

export interface ProcessOutboxRowResult {
	success: boolean;
	resultItem: OutboxRowResultItem;
}

export async function processOutboxRow(
	row: typeof egiszOutbox.$inferSelect,
	activeClient: OiisGatewayClient,
): Promise<ProcessOutboxRowResult> {
	try {
		const [patientRow] = await db
			.select({
				fullName: patients.fullName,
				birthDate: patients.birthDate,
				administrativeProfile: patients.administrativeProfile,
			})
			.from(patients)
			.where(eq(patients.id, row.patientId))
			.limit(1);

		let doctorRow: { fullName: string; snils: string | null } | undefined = undefined;
		if (row.doctorId) {
			const [doc] = await db
				.select({
					fullName: users.fullName,
					snils: users.snils,
				})
				.from(users)
				.where(eq(users.id, row.doctorId))
				.limit(1);
			doctorRow = doc;
		}

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

		// Reconstruct signed package representation for gateway
		const pkg: EgiszRemdPackage = {
			documentId: row.documentId ?? row.id,
			documentVersion: 1,
			xmlCanonicalPayload: row.payloadXml,
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

			// ─── 1. DOCTOR DATA RESOLUTION (REAL SNILS & NAME) ───────────
			let doctorSnils = "";
			let doctorFamilyName = "";
			let doctorGivenName = "";
			let doctorMiddleName: string | undefined = undefined;

			if (doctorRow) {
				if (doctorRow.snils) {
					const normalized = normalizeSnils(doctorRow.snils);
					if (isValidSnils(normalized)) {
						doctorSnils = normalized;
					}
				}
				if (doctorRow.fullName) {
					const parts = splitFullName(doctorRow.fullName);
					doctorFamilyName = parts.last;
					doctorGivenName = parts.first;
					doctorMiddleName = parts.middle;
				}
			}

			const certSubject = pkg.doctorSignature.certificateSubject || row.doctorCertSubject || "";
			if (!doctorSnils && certSubject) {
				const snilsMatch = certSubject.match(/(?:SNILS|OID\.1\.2\.643\.100\.3|1\.2\.643\.100\.3)\s*=\s*([0-9\s-]+)/i);
				if (snilsMatch?.[1]) {
					const normalized = normalizeSnils(snilsMatch[1]);
					if (isValidSnils(normalized)) {
						doctorSnils = normalized;
					}
				}
			}

			if (!doctorFamilyName && certSubject) {
				const surnameMatch = certSubject.match(/(?:SURNAME|SN)\s*=\s*([^,]+)/i);
				const givenNameMatch = certSubject.match(/(?:GIVENNAME|GN)\s*=\s*([^,]+)/i);
				if (surnameMatch?.[1]) {
					doctorFamilyName = surnameMatch[1].trim();
					if (givenNameMatch?.[1]) {
						const gnParts = givenNameMatch[1].trim().split(/\s+/);
						doctorGivenName = gnParts[0] || "Врач";
						doctorMiddleName = gnParts.slice(1).join(" ") || undefined;
					}
				} else {
					const cnMatch = certSubject.match(/CN\s*=\s*([^,]+)/i);
					const nameToSplit = cnMatch?.[1] ? cnMatch[1].trim() : certSubject;
					const parts = splitFullName(nameToSplit);
					doctorFamilyName = parts.last || "Врач";
					doctorGivenName = parts.first || "Врач";
					doctorMiddleName = parts.middle;
				}
			}

			// ─── 2. PATIENT DATA RESOLUTION (REAL FIO, BIRTH DATE, GENDER) ───
			const patientParts = splitFullName(patientRow?.fullName || "");
			let patientFamilyName = patientParts.last;
			let patientGivenName = patientParts.first;
			let patientMiddleName = patientParts.middle;

			if (!patientFamilyName && row.payloadXml) {
				const patientXmlMatch = row.payloadXml.match(/<patient[\s\S]*?<\/patient>/i);
				const targetXml = patientXmlMatch ? patientXmlMatch[0] : row.payloadXml;
				const familyMatch = targetXml.match(/<family>([^<]+)<\/family>/i);
				const givenMatch = targetXml.match(/<given>([^<]+)<\/given>/i);
				if (familyMatch?.[1]) patientFamilyName = familyMatch[1].trim();
				if (givenMatch?.[1]) patientGivenName = givenMatch[1].trim();
			}

			patientFamilyName = patientFamilyName || "Пациент";
			patientGivenName = patientGivenName || "Пациент";

			let patientBirthDate = patientRow?.birthDate ? patientRow.birthDate.trim() : "";
			if (/^\d{2}\.\d{2}\.\d{4}$/.test(patientBirthDate)) {
				const [d, m, y] = patientBirthDate.split(".");
				patientBirthDate = `${y}-${m}-${d}`;
			}
			if (!patientBirthDate && row.payloadXml) {
				const birthMatch = row.payloadXml.match(/<birthTime\b[^>]*\bvalue="(\d{4})(\d{2})(\d{2})"/i);
				if (birthMatch?.[1] && birthMatch[2] && birthMatch[3]) {
					patientBirthDate = `${birthMatch[1]}-${birthMatch[2]}-${birthMatch[3]}`;
				}
			}
			if (!patientBirthDate) {
				patientBirthDate = "1980-01-01";
			}

			let patientGender: "1" | "2" = "1";
			const genderProfile = readGenderFromProfile(patientRow?.administrativeProfile);
			if (genderProfile === "female") {
				patientGender = "2";
			} else if (genderProfile === "male") {
				patientGender = "1";
			} else if (row.payloadXml) {
				const genderMatch = row.payloadXml.match(/<administrativeGenderCode\b[^>]*\bcode="([12])"/i);
				if (genderMatch?.[1] === "2") {
					patientGender = "2";
				}
			}

			const soapRes = await vipnet.emkAddDocument({
				idDocumentMis: pkg.documentId,
				documentType: pkg.metadata.docTypeNsiCode || "108",
				documentName: "Протокол стоматологической консультации",
				documentDate: new Date().toISOString(),
				cdaXmlContent: pkg.xmlCanonicalPayload,
				patient: {
					idPatientMis: row.patientId,
					snils: snils || "00000000000",
					familyName: patientFamilyName,
					givenName: patientGivenName,
					...(patientMiddleName ? { middleName: patientMiddleName } : {}),
					birthDate: patientBirthDate,
					gender: patientGender,
				},
				doctor: {
					snils: doctorSnils || "00000000000",
					familyName: doctorFamilyName || "Врач",
					givenName: doctorGivenName || "Врач",
					...(doctorMiddleName ? { middleName: doctorMiddleName } : {}),
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

			return {
				success: true,
				resultItem: {
					outboxId: row.id,
					visitId: row.visitId,
					status: submissionRes.status,
					transactionId: submissionRes.transactionId,
				},
			};
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

			return {
				success: false,
				resultItem: {
					outboxId: row.id,
					visitId: row.visitId,
					status: nextStatus,
					error: errorText,
				},
			};
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

		return {
			success: false,
			resultItem: {
				outboxId: row.id,
				visitId: row.visitId,
				status: nextStatus,
				error: errorMsg,
			},
		};
	}
}
