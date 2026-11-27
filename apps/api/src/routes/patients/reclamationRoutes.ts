import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { warrantyCertificates } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	PATIENT_ID_UUID_PATTERN,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";
import {
	patientReclamationCreateBodySchema,
	patientReclamationStatusBodySchema,
} from "./types.js";

export function registerPatientReclamationRoutes(app: FastifyInstance) {
	/**
	 * РЕКЛАМАЦИИ И ОСЛОЖНЕНИЯ ПО КАРТЕ. Четыре маршрута.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/:patientId/reclamations",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId } = request.params as { patientId?: string };
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const { getPatientReclamationsFromDb } = await import(
					"../../db/patientReclamationsQuery.js"
				);
				const readResult = await withTenantReadCtx(orgId, async (tx) => {
					const patient = await getPatientByIdFromDb(orgId, patientId.trim(), tx);
					if (!patient) return { kind: "not_found" as const };

					if (patient.status === "archived") {
						const identity = getRequestIdentity(request);
						const staffRole = identity.role ?? request.user?.role ?? null;
						const evalAccess = evaluateClinicalAccess(staffRole);
						if (!evalAccess.hasClinicalAccess) {
							return { kind: "forbidden" as const, staffRole };
						}
					}

					const list = await getPatientReclamationsFromDb(orgId, patientId.trim(), tx);
					return { kind: "ok" as const, list };
				});

				if (readResult.kind === "not_found") {
					return sendPatientNotFound(reply);
				}
				if (readResult.kind === "forbidden") {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.reclamations",
						role: readResult.staffRole,
						message:
							"Отказ в доступе к рекламациям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
					});
				}

				return reply.status(200).send(readResult.list);
			} catch (e: unknown) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка чтения рекламаций пациента",
				);
				return reply.code(500).send({
					error: "PatientReclamationsUnavailable",
					message:
						"Не удалось прочитать рекламации и осложнения по этой карте. Не считайте, что их нет: повторите чтение перед разговором с пациентом.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/patients/:patientId/reclamations",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId } = request.params as { patientId?: string };
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			const parsedBody = patientReclamationCreateBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не описана суть жалобы или осложнения — без этого запись в карте бесполезна.",
				});
			}
			const body = parsedBody.data;
			const details =
				typeof body.complicationDetails === "string"
					? body.complicationDetails.trim()
					: "";
			if (!details) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не описана суть жалобы или осложнения — без этого запись в карте бесполезна.",
				});
			}
			let doctorId =
				typeof body.doctorId === "string" &&
				PATIENT_ID_UUID_PATTERN.test(body.doctorId.trim())
					? body.doctorId.trim()
					: null;
			if (!doctorId) {
				const reqId = getRequestIdentity(request);
				if (reqId.userId && PATIENT_ID_UUID_PATTERN.test(reqId.userId)) {
					doctorId = reqId.userId;
				}
			}
			if (!doctorId) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не выбран врач — автор работы. Без него разобрать рекламацию будет не с кем.",
				});
			}
			const proposedAction =
				typeof body.proposedAction === "string" && body.proposedAction.trim()
					? body.proposedAction.trim()
					: null;

			let toothNumber: number | null = null;
			if (typeof body.toothNumber === "number" && Number.isInteger(body.toothNumber)) {
				toothNumber = body.toothNumber;
			} else if (typeof body.toothNumber === "string") {
				const parsed = Number(body.toothNumber);
				if (Number.isInteger(parsed) && parsed >= 11 && parsed <= 85) {
					toothNumber = parsed;
				}
			}

			let warrantyCertificateId =
				typeof body.warrantyCertificateId === "string" &&
				PATIENT_ID_UUID_PATTERN.test(body.warrantyCertificateId.trim())
					? body.warrantyCertificateId.trim()
					: null;

			const certificateNumber =
				typeof body.certificateNumber === "string" && body.certificateNumber.trim()
					? body.certificateNumber.trim()
					: null;

			const defectType =
				typeof body.defectType === "string" && body.defectType.trim()
					? body.defectType.trim().slice(0, 64)
					: null;

			try {
				const { createPatientReclamationInDb } = await import(
					"../../db/patientReclamationsQuery.js"
				);
				const createdResult = await withTenantWriteCtx(orgId, async (tx) => {
					const patient = await getPatientByIdFromDb(orgId, patientId.trim(), tx);
					if (!patient) return { kind: "not_found" as const };

					let effectiveDetails = details;
					if (!warrantyCertificateId && certificateNumber) {
						const [matchedCert] = await tx
							.select({ id: warrantyCertificates.id })
							.from(warrantyCertificates)
							.where(
								and(
									eq(warrantyCertificates.organizationId, orgId),
									eq(warrantyCertificates.patientId, patientId.trim()),
									eq(warrantyCertificates.certificateNumber, certificateNumber),
								),
							)
							.limit(1);
						if (matchedCert?.id) {
							warrantyCertificateId = matchedCert.id;
						} else if (!effectiveDetails.includes(certificateNumber)) {
							effectiveDetails = `${effectiveDetails} [Паспорт: ${certificateNumber}]`;
						}
					}

					const created = await createPatientReclamationInDb(
						orgId,
						patientId.trim(),
						{
							complicationDetails: effectiveDetails,
							proposedAction,
							doctorId,
							toothNumber,
							warrantyCertificateId,
							defectType,
						},
						tx,
					);
					return { kind: "ok" as const, created };
				});

				if (createdResult.kind === "not_found") {
					return sendPatientNotFound(reply);
				}
				return reply.status(201).send(createdResult.created);
			} catch (e: unknown) {
				request.log.error({ err: e }, "[Patients] Ошибка фиксации рекламации");
				return reply.code(500).send({
					error: "PatientReclamationCreateFailed",
					message:
						"Не удалось зафиксировать рекламацию. Запись могла не сохраниться — откройте журнал и проверьте перед повторным вводом.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/patients/:patientId/reclamations/:reclamationId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, reclamationId } = request.params as {
				patientId?: string;
				reclamationId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!reclamationId ||
				!PATIENT_ID_UUID_PATTERN.test(reclamationId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			const parsedBody = patientReclamationStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние инцидента: урегулирован или возвращён в работу.",
				});
			}
			const body = parsedBody.data;
			const status =
				body.status === "resolved"
					? "resolved"
					: body.status === "under_review"
						? "under_review"
						: null;
			if (!status) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние инцидента: урегулирован или возвращён в работу.",
				});
			}

			try {
				const { setPatientReclamationStatusInDb } = await import(
					"../../db/patientReclamationsQuery.js"
				);
				const updated = await withTenantWriteCtx(orgId, (tx) =>
					setPatientReclamationStatusInDb(
						orgId,
						patientId.trim(),
						reclamationId.trim(),
						status,
						tx,
					),
				);
				if (!updated) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её удалил кто-то другой. Обновите журнал.",
					});
				}
				return reply.status(200).send(updated);
			} catch (e: unknown) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка смены состояния рекламации",
				);
				return reply.code(500).send({
					error: "PatientReclamationUpdateFailed",
					message:
						"Не удалось изменить состояние инцидента. Показанное значение может не совпадать с сохранённым — обновите журнал.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/patients/:patientId/reclamations/:reclamationId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, reclamationId } = request.params as {
				patientId?: string;
				reclamationId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!reclamationId ||
				!PATIENT_ID_UUID_PATTERN.test(reclamationId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const { deletePatientReclamationFromDb } = await import(
					"../../db/patientReclamationsQuery.js"
				);
				const removed = await withTenantWriteCtx(orgId, (tx) =>
					deletePatientReclamationFromDb(
						orgId,
						patientId.trim(),
						reclamationId.trim(),
						tx,
					),
				);
				if (!removed) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её уже удалили. Обновите журнал.",
					});
				}
				return reply.status(200).send({ success: true });
			} catch (e: unknown) {
				request.log.error({ err: e }, "[Patients] Ошибка удаления рекламации");
				return reply.code(500).send({
					error: "PatientReclamationDeleteFailed",
					message:
						"Не удалось удалить запись об инциденте. Она осталась в карте — повторите попытку.",
				});
			}
		},
	});
}
