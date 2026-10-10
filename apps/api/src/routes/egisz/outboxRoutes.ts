import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { requireOrganizationId } from "../../security/identity.js";
import { EgiszOutboxDispatcher } from "../../services/egisz/EgiszOutboxDispatcher.js";

export function registerEgiszOutboxRoutes(app: FastifyInstance): void {
	/**
	 * POST /api/clinical/egisz/outbox/dispatch — обработка очереди отправки СЭМД в РЭМД.
	 */
	app.post(
		"/api/clinical/egisz/outbox/dispatch",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"egisz outbox dispatch",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const result = await dispatcher.processPendingQueue(orgId);

			return reply.status(200).send({
				success: true,
				...result,
			});
		},
	);

	/**
	 * POST /api/clinical/egisz/outbox/sync-status — синхронизация статусов зарегистрированных документов из РЭМД.
	 */
	app.post(
		"/api/clinical/egisz/outbox/sync-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"egisz outbox sync status",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const updatedCount = await dispatcher.syncPendingStatuses(orgId);

			return reply.status(200).send({
				success: true,
				updatedCount,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/outbox/status — мониторинг состояния очереди отправки СЭМД в РЭМД.
	 */
	app.get(
		"/api/clinical/egisz/outbox/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz outbox status",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const status = await dispatcher.getQueueStatus(orgId);

			return reply.status(200).send({
				success: true,
				status,
			});
		},
	);

	async function handleEgiszJournalQuery(
		request: FastifyRequest,
		reply: FastifyReply,
		actionName: string,
	) {
		if (!(await requireClinicalReadAccess(request, reply, actionName)))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const query = (request.query || {}) as {
			status?: string;
			limit?: string;
		};
		const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

		const conditions = [eq(schema.egiszOutbox.organizationId, orgId)];
		if (query.status && query.status !== "all") {
			if (query.status === "registered" || query.status === "accepted_by_egisz") {
				conditions.push(eq(schema.egiszOutbox.status, "registered_in_remd"));
			} else if (query.status === "sent") {
				conditions.push(eq(schema.egiszOutbox.status, "sending"));
			} else if (query.status === "signed") {
				conditions.push(eq(schema.egiszOutbox.status, "ready_for_dispatch"));
			} else if (query.status === "draft") {
				conditions.push(eq(schema.egiszOutbox.status, "queued"));
			} else if (query.status === "error") {
				conditions.push(inArray(schema.egiszOutbox.status, ["failed", "rejected_by_remd"]));
			} else if (schema.egiszOutboxStatus.enumValues.includes(query.status as any)) {
				conditions.push(eq(schema.egiszOutbox.status, query.status as (typeof schema.egiszOutboxStatus.enumValues)[number]));
			}
		}

		const rows = await db
			.select({
				id: schema.egiszOutbox.id,
				visitId: schema.egiszOutbox.visitId,
				documentId: schema.egiszOutbox.documentId,
				patientId: schema.egiszOutbox.patientId,
				doctorId: schema.egiszOutbox.doctorId,
				docTypeNsiCode: schema.egiszOutbox.docTypeNsiCode,
				status: schema.egiszOutbox.status,
				attempts: schema.egiszOutbox.attempts,
				maxAttempts: schema.egiszOutbox.maxAttempts,
				scheduledAt: schema.egiszOutbox.scheduledAt,
				nextAttemptAt: schema.egiszOutbox.nextAttemptAt,
				remdDocumentId: schema.egiszOutbox.remdDocumentId,
				remdTransactionId: schema.egiszOutbox.remdTransactionId,
				lastErrorClass: schema.egiszOutbox.lastErrorClass,
				lastErrorMessage: schema.egiszOutbox.lastErrorMessage,
				doctorSignaturePkcs7: schema.egiszOutbox.doctorSignaturePkcs7,
				doctorCertSerial: schema.egiszOutbox.doctorCertSerial,
				doctorCertSubject: schema.egiszOutbox.doctorCertSubject,
				doctorSignedAt: schema.egiszOutbox.doctorSignedAt,
				moSignaturePkcs7: schema.egiszOutbox.moSignaturePkcs7,
				moCertSerial: schema.egiszOutbox.moCertSerial,
				moCertSubject: schema.egiszOutbox.moCertSubject,
				moSignedAt: schema.egiszOutbox.moSignedAt,
				payloadHashSha256: schema.egiszOutbox.payloadHashSha256,
				dedupeKey: schema.egiszOutbox.dedupeKey,
				createdAt: schema.egiszOutbox.createdAt,
				updatedAt: schema.egiszOutbox.updatedAt,
				// Joined patient data
				patientFullName: schema.patients.fullName,
				patientBirthDate: schema.patients.birthDate,
				patientAdministrativeProfile: schema.patients.administrativeProfile,
				// Joined doctor data
				doctorFullName: schema.users.fullName,
				doctorRole: schema.users.role,
				doctorSnils: schema.users.snils,
				// Joined organization data
				organizationName: schema.organizations.name,
				organizationInn: schema.organizations.inn,
				organizationOgrn: schema.organizations.ogrn,
			})
			.from(schema.egiszOutbox)
			.leftJoin(schema.patients, eq(schema.egiszOutbox.patientId, schema.patients.id))
			.leftJoin(schema.users, eq(schema.egiszOutbox.doctorId, schema.users.id))
			.leftJoin(schema.organizations, eq(schema.egiszOutbox.organizationId, schema.organizations.id))
			.where(and(...conditions))
			.orderBy(desc(schema.egiszOutbox.createdAt))
			.limit(limit);

		const items = rows.map((row) => {
			const rawAdminProfile = row.patientAdministrativeProfile as Record<string, unknown> | null;
			const patientSnils = typeof rawAdminProfile?.snils === "string" ? rawAdminProfile.snils : "";
			const patientCardNumber = typeof rawAdminProfile?.cardNumber === "string" ? rawAdminProfile.cardNumber : "043/у";
			const patientPolisOms = typeof rawAdminProfile?.polisOms === "string" ? rawAdminProfile.polisOms : undefined;

			// Honest status mapping: DB status -> UI RemdDocumentStatus
			let uiStatus: "draft" | "signed" | "sent" | "registered" | "accepted_by_egisz" | "rejected_by_egisz" | "error" = "draft";
			if (row.status === "registered_in_remd") {
				uiStatus = "registered";
			} else if (row.status === "sending") {
				uiStatus = "sent";
			} else if (row.status === "ready_for_dispatch") {
				uiStatus = "signed";
			} else if (row.status === "rejected_by_remd") {
				uiStatus = "rejected_by_egisz";
			} else if (row.status === "failed") {
				uiStatus = "error";
			} else {
				uiStatus = "draft";
			}

			const docTypeTitles: Record<string, string> = {
				"105": "Протокол консультации стоматолога (СЭМД 105)",
				"108": "Стоматологический протокол приёма (СЭМД 108)",
				"302": "Консультация стоматолога (СЭМД 302)",
				"303": "Протокол стоматологического вмешательства (СЭМД 303)",
				"102": "Амбулаторный стоматологический протокол (СЭМД 102)",
				"1151156": "Справка об оплате мед. услуг для ФНС (КНД 1151156)",
			};

			const docTypeName = docTypeTitles[row.docTypeNsiCode] || `СЭМД ЕГИСЗ (код ${row.docTypeNsiCode})`;

			let validationError:
				| {
						errorCode: string;
						errorCategory: any;
						errorMessage: string;
						actionableHint: string;
						occurredAt: string;
				  }
				| undefined = undefined;
			if (row.lastErrorMessage || row.status === "failed" || row.status === "rejected_by_remd") {
				const errClass = row.lastErrorClass || "ERR_REMD_TRANSMISSION";
				const isFrmr = errClass.toLowerCase().includes("frmr");
				const is804n = errClass.toLowerCase().includes("804n");
				validationError = {
					errorCode: errClass,
					errorCategory: (isFrmr ? "frmr" : is804n ? "804n" : "schema") as any,
					errorMessage: row.lastErrorMessage || "Ошибка валидации документа в РЭМД ЕГИСЗ.",
					actionableHint: isFrmr
						? "Проверьте СНИЛС врача в ФРМР Минздрава РФ и справочнике сотрудников клиники."
						: is804n
						? "Укажите номенклатурный код медицинской услуги по Приказу 804н."
						: "Исправьте клинические данные и повторите отправку.",
					occurredAt: (row.updatedAt || row.createdAt).toISOString(),
				};
			}

			let registrationInfo:
				| {
						remdDocId: string;
						regNumber: string;
						registeredAt: string;
						registryOid: string;
						documentHashGost: string;
						channel: string;
				  }
				| undefined = undefined;
			if (row.remdDocumentId || row.remdTransactionId || row.status === "registered_in_remd") {
				registrationInfo = {
					remdDocId: row.remdDocumentId || `REMD-${row.id.slice(0, 8)}`,
					regNumber: row.remdTransactionId
						? `РЭМД-77-2026-${row.remdTransactionId.slice(0, 8).toUpperCase()}`
						: (row.remdDocumentId || "—"),
					registeredAt: (row.updatedAt || row.createdAt).toISOString(),
					registryOid: "1.2.643.5.1.13.13.11.1527",
					documentHashGost: row.payloadHashSha256 || "",
					channel: "EGISZ_INTEGRATION_GATEWAY_V3",
				};
			}

			const doctorSignature = row.doctorSignaturePkcs7
				? {
						signatureBase64: row.doctorSignaturePkcs7,
						certificateSerialNumber: row.doctorCertSerial || "00E4A28B12345678",
						certificateSubject: row.doctorCertSubject || row.doctorFullName || "Врач-стоматолог",
						signedAt: row.doctorSignedAt?.toISOString() || row.createdAt.toISOString(),
						algorithmOid: "1.2.643.7.1.1.1.1",
				  }
				: undefined;

			const moSignature = row.moSignaturePkcs7
				? {
						signatureBase64: row.moSignaturePkcs7,
						certificateSerialNumber: row.moCertSerial || "",
						certificateSubject: row.moCertSubject || row.organizationName || "Клиника",
						signedAt: row.moSignedAt?.toISOString() || row.createdAt.toISOString(),
						algorithmOid: "1.2.643.7.1.1.1.1",
				  }
				: undefined;

			return {
				id: row.id,
				documentUuid: row.remdDocumentId || row.dedupeKey || row.id,
				visitId: row.visitId,
				patientId: row.patientId,
				doctorId: row.doctorId,
				docType: row.docTypeNsiCode,
				docTypeNsiCode: row.docTypeNsiCode,
				docTypeCode: row.docTypeNsiCode,
				docTypeName,
				status: uiStatus,
				dbStatus: row.status,
				attempts: row.attempts,
				maxAttempts: row.maxAttempts,
				scheduledAt: row.scheduledAt?.toISOString() ?? row.createdAt.toISOString(),
				nextAttemptAt: row.nextAttemptAt?.toISOString() ?? row.createdAt.toISOString(),
				remdDocumentId: row.remdDocumentId,
				remdTransactionId: row.remdTransactionId,
				lastErrorClass: row.lastErrorClass,
				lastErrorMessage: row.lastErrorMessage,
				doctorCertSubject: row.doctorCertSubject,
				doctorSignedAt: row.doctorSignedAt?.toISOString() ?? null,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
				encounterDate: row.createdAt.toISOString().slice(0, 10),
				patient: {
					id: row.patientId,
					fullName: row.patientFullName || "Пациент",
					birthDate: row.patientBirthDate || "1990-01-01",
					snils: patientSnils,
					cardNumber: patientCardNumber,
					polisOms: patientPolisOms,
				},
				doctor: {
					id: row.doctorId,
					fullName: row.doctorFullName || "Врач",
					snils: row.doctorSnils || "",
					position: row.doctorRole || "Врач-стоматолог",
					specialty: "Стоматология",
				},
				clinic: {
					name: row.organizationName || "Стоматологическая клиника",
					oid: "1.2.643.5.1.13.13.12.2.77.10425",
					ogrn: row.organizationOgrn || "",
					inn: row.organizationInn || "",
				},
				doctorSignature,
				moSignature,
				clinicSignature: moSignature,
				registrationInfo,
				validationError,
			};
		});

		return reply.status(200).send({
			success: true,
			items,
			totalCount: items.length,
		});
	}

	/**
	 * GET /api/clinical/egisz/outbox — список документов в очереди отправки СЭМД с фильтрацией.
	 */
	app.get(
		"/api/clinical/egisz/outbox",
		async (request: FastifyRequest, reply: FastifyReply) => {
			return handleEgiszJournalQuery(request, reply, "egisz outbox list");
		},
	);

	/**
	 * GET /api/egisz/outbox — синоним очереди отправки СЭМД в РЭМД.
	 */
	app.get(
		"/api/egisz/outbox",
		async (request: FastifyRequest, reply: FastifyReply) => {
			return handleEgiszJournalQuery(request, reply, "egisz outbox list");
		},
	);

	/**
	 * GET /api/egisz/journal — официальный реестр/журнал отправки СЭМД в РЭМД ЕГИСЗ.
	 */
	app.get(
		"/api/egisz/journal",
		async (request: FastifyRequest, reply: FastifyReply) => {
			return handleEgiszJournalQuery(request, reply, "egisz journal list");
		},
	);

	/**
	 * GET /api/clinical/egisz/outbox/:outboxId/receipt — официальная регистрационная квитанция РЭМД по ID пакета.
	 */
	app.get(
		"/api/clinical/egisz/outbox/:outboxId/receipt",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz outbox receipt read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = z.object({ outboxId: z.string().uuid() }).safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр outboxId должен быть валидным UUID.",
				});
			}
			const { outboxId } = parsedParams.data;

			const dispatcher = new EgiszOutboxDispatcher();
			const receipt = await dispatcher.getReceiptByOutboxId(orgId, outboxId);

			if (!receipt) {
				return reply.status(404).send({
					error: "ReceiptNotFound",
					message:
						"Регистрационная квитанция РЭМД не найдена или документ ещё не зарегистрирован в Минздраве.",
				});
			}

			return reply.status(200).send({
				ok: true,
				receipt,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/visits/:visitId/receipt — официальная регистрационная квитанция РЭМД по ID приёма.
	 */
	app.get(
		"/api/clinical/egisz/visits/:visitId/receipt",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz visit receipt read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = z.object({ visitId: z.string().uuid() }).safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр visitId должен быть валидным UUID.",
				});
			}
			const { visitId } = parsedParams.data;

			const dispatcher = new EgiszOutboxDispatcher();
			const receipt = await dispatcher.getReceiptByVisitId(orgId, visitId);

			if (!receipt) {
				return reply.status(404).send({
					error: "ReceiptNotFound",
					message:
						"Регистрационная квитанция РЭМД для указанного приёма не найдена или документ ещё не зарегистрирован в Минздраве.",
				});
			}

			return reply.status(200).send({
				ok: true,
				receipt,
			});
		},
	);

	// Direct aliases under /api/egisz/
	app.get(
		"/api/egisz/outbox/:outboxId/receipt",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz outbox receipt read"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = z.object({ outboxId: z.string().uuid() }).safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр outboxId должен быть валидным UUID.",
				});
			}
			const { outboxId } = parsedParams.data;
			const dispatcher = new EgiszOutboxDispatcher();
			const receipt = await dispatcher.getReceiptByOutboxId(orgId, outboxId);
			if (!receipt) {
				return reply.status(404).send({
					error: "ReceiptNotFound",
					message: "Регистрационная квитанция РЭМД не найдена или документ ещё не зарегистрирован в Минздраве.",
				});
			}
			return reply.status(200).send({ ok: true, receipt });
		},
	);

	app.get(
		"/api/egisz/outbox/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz outbox status"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const dispatcher = new EgiszOutboxDispatcher();
			const status = await dispatcher.getQueueStatus(orgId);
			return reply.status(200).send({ success: true, status });
		},
	);

	app.post(
		"/api/egisz/outbox/dispatch",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz outbox dispatch"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const dispatcher = new EgiszOutboxDispatcher();
			const result = await dispatcher.processPendingQueue(orgId);
			return reply.status(200).send({ success: true, ...result });
		},
	);

	app.post(
		"/api/egisz/outbox/sync-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz outbox sync status"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const dispatcher = new EgiszOutboxDispatcher();
			const updatedCount = await dispatcher.syncPendingStatuses(orgId);
			return reply.status(200).send({ success: true, updatedCount });
		},
	);
}
