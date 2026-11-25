import {
	patientSchema,
	updatePatientAdministrativeProfileSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import {
	getPatientByIdFromDb,
	updatePatientAdministrativeProfileInDb,
} from "../../db/patientsQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	hasIncompleteRepresentativeIdentity,
	normalizePatientNameForDuplicate,
	parsePatientPayload,
	patientAdministrativeValidationMessage,
	patientRepresentativeValidationMessage,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
	PATIENT_ID_UUID_PATTERN,
} from "./helpers.js";
import {
	type PatientArchiveRowLike,
	patientArchiveBodySchema,
	patientArchiveStatusBodySchema,
} from "./types.js";

/**
 * Оставляет из строк архива и черного списка клиники только те, что относятся к
 * указанному пациенту.
 *
 * БЫЛО: GET /api/patients/:patientId/archive-status отдавал строки ВСЕЙ клиники.
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:7 принимает пациента под именем
 * `_patientId` и не использует его вовсе, а маршрут отправлял результат как есть.
 * Оба виджета карточки читают ответ как статус выбранного пациента:
 * components/patients/PatientArchiveAndBlacklistWidget.tsx:86 берёт
 * reasons[0].isBookingBlocked, а components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx:106
 * печатает каждую строку с ФИО и причиной. Достаточно одного человека в черном
 * списке, чтобы карточка КАЖДОГО пациента клиники показала «Запись на прием
 * заблокирована», предложила кнопку «Восстановить из черного списка» — и заодно
 * показала ФИО и причину блокировки посторонних людей. Это ровно тот же дефект,
 * что уже был исправлен ниже для communication-timelines.
 *
 * Связь по имени применяется ТОЛЬКО к строкам без patient_id. Строку с чужим
 * patient_id тезка не забирает: иначе снятие блокировки у однофамильца снимало
 * бы её у настоящего нарушителя.
 */
export function selectPatientArchiveRows<T extends PatientArchiveRowLike>(
	rows: readonly T[],
	patientId: string,
	patientFullName: string | null | undefined,
): T[] {
	const normalizedPatientName =
		normalizePatientNameForDuplicate(patientFullName);
	return rows.filter((row) => {
		if (row.patientId) return row.patientId === patientId;
		if (!normalizedPatientName) return false;
		return (
			normalizePatientNameForDuplicate(row.patientName) ===
			normalizedPatientName
		);
	});
}

/**
 * Запрещена ли пациенту запись по его строкам архива. Учитывается флаг
 * is_booking_blocked, а не сам факт наличия строки — так же, как в
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:isPatientBookingBlocked,
 * который решает запрет при записи на приём. Иначе карточка утверждала бы одно,
 * а расписание делало другое.
 */
export function patientArchiveRowsBlockBooking(
	rows: readonly PatientArchiveRowLike[],
): boolean {
	return rows.some((row) => row.isBookingBlocked === true);
}

export function registerPatientAdministrativeRoutes(app: FastifyInstance) {
	app.put(
		"/api/patients/:patientId/administrative-profile",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const params = request.params as { patientId?: string };
			if (!params.patientId || !PATIENT_ID_UUID_PATTERN.test(params.patientId)) {
				return sendPatientRouteValidationError(reply);
			}
			const input = parsePatientPayload(
				updatePatientAdministrativeProfileSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PatientValidationError",
					message: patientAdministrativeValidationMessage,
				});
			}

			const sanitizeDigitsAndSpaces = (
				val?: string | null,
				maxLen: number = 80,
			) => {
				if (val === undefined) return undefined;
				if (val === null) return null;
				const cleaned = val.trim().replace(/[^\d\s\-.]/g, "");
				return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
			};

			if (input.snils !== undefined && input.snils !== null) {
				input.snils = sanitizeDigitsAndSpaces(input.snils, 20);
			}
			if (
				input.identityDocument !== undefined &&
				input.identityDocument !== null
			) {
				input.identityDocument = input.identityDocument.trim().slice(0, 240);
			}

			try {
				const existingPatient = await getPatientByIdFromDb(
					orgId,
					params.patientId,
				);
				if (!existingPatient) return sendPatientNotFound(reply);
				const existingProfile =
					(existingPatient.administrativeProfile as Record<string, unknown>) ??
					{};
				const mergedProfile = { ...existingProfile, ...input };

				if (hasIncompleteRepresentativeIdentity(mergedProfile)) {
					return reply.code(400).send({
						error: "PatientValidationError",
						message: patientRepresentativeValidationMessage,
					});
				}

				const isAnonProfile =
					mergedProfile.isAnonymous === true ||
					Boolean(existingPatient.fullName?.startsWith("UUID_ANON")) ||
					Boolean(existingPatient.fullName?.toLowerCase().includes("аноним"));
				const policyProfile =
					typeof mergedProfile.insurancePolicyNumber === "string"
						? (mergedProfile.insurancePolicyNumber as string).trim()
						: "";
				if (isAnonProfile && policyProfile.length > 0) {
					return reply.code(422).send({
						error: "PatientValidationError",
						message:
							"Привязка полиса ОМС к анонимной карте не допускается. Для использования полиса ОМС требуется деанонимизация пациента с указанием паспортных данных и СНИЛС.",
					});
				}

				/*
				 * БЫЛО: mergedProfile считали только для hasIncompleteRepresentativeIdentity,
				 * а в updatePatientAdministrativeProfileInDb уходил partial input.
				 * DB-путь пишет administrative_profile JSONB целиком (= input), без merge
				 * (patientsQuery.ts). Частичный PUT (loyaltyTier / snils) затирал
				 * остальные ключи: orthodonticProgress, адреса, представителя.
				 * In-memory путь мержит сам; Postgres — нет. После F5 tier и каппы
				 * пропадали при HTTP 200.
				 * СТАЛО: на диск уходит полный merge existing ∪ input.
				 */
				const patient = await updatePatientAdministrativeProfileInDb(
					orgId,
					params.patientId,
					mergedProfile as typeof input,
				);
				if (!patient) return sendPatientNotFound(reply);
				return patientSchema.parse(patient);
			} catch (e: unknown) {
				// См. комментарий выше: 404 после успешной записи вводил оператора в
				// заблуждение и приводил к повторному вводу тех же данных.
				request.log.error(
					{ err: e },
					"[Patients] Ошибка обновления профиля пациента",
				);
				return reply.code(500).send({
					error: "PatientProfileUpdateFailed",
					message:
						"Не удалось сохранить профиль. Данные могли быть записаны — обновите карточку перед повторным вводом.",
				});
			}
		},
	);

	// COMPETITOR FEATURE #20: пациенты::архив_причин_и_черный_список
	app.get("/api/patients/:patientId/archive-status", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		try {
			// Карточка чужого или удалённого пациента раньше отвечала пустым списком,
			// то есть «этот человек не заблокирован». Отсутствие пациента и отсутствие
			// блокировки — разные ответы, и путать их нельзя.
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return sendPatientNotFound(reply);

			const { getPatientArchiveReasonsAndBlacklistsFromDb } = await import(
				"../../db/patientArchiveReasonsAndBlacklistsQuery.js"
			);
			const clinicRows = await getPatientArchiveReasonsAndBlacklistsFromDb(
				orgId,
				patientId,
			);
			return reply
				.status(200)
				.send(
					selectPatientArchiveRows(clinicRows, patientId, patient.fullName),
				);
		} catch (e: unknown) {
			// Пустой список вместо отказа читается виджетом как «пациент чист», и
			// администратор запишет на приём того, кому запись запрещена.
			request.log.error(
				{ err: e },
				"[Patients] Ошибка чтения архива и черного списка",
			);
			return reply.code(500).send({
				error: "PatientArchiveStatusUnavailable",
				message:
					"Не удалось прочитать запрет записи по этой карте. Не считайте пациента разрешённым к записи: повторите чтение перед записью на приём.",
			});
		}
	});

	const handleArchiveStatus = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		const parsedBody = patientArchiveStatusBodySchema.safeParse(
			request.body ?? {},
		);
		if (
			!parsedBody.success ||
			typeof parsedBody.data.isBlacklisted !== "boolean"
		) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не указано действие: запретить пациенту запись на приём или снять запрет.",
			});
		}
		const requestedBlacklisted = parsedBody.data.isBlacklisted;

		try {
			const {
				getPatientArchiveReasonsAndBlacklistsFromDb,
				setPatientArchiveStatusInDb,
			} = await import("../../db/patientArchiveReasonsAndBlacklistsQuery.js");

			const txResult = await withTenantCtx(orgId, async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${`${orgId}:patient_archive_status:${patientId}`}))`,
				);
				const [patient] = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.for("update")
					.limit(1);

				if (!patient) return { kind: "not_found" as const };

				const rowsBefore = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId, tx),
					patientId,
					patient.fullName,
				);
				if (patientArchiveRowsBlockBooking(rowsBefore) === requestedBlacklisted) {
					if (!requestedBlacklisted) {
						await tx
							.update(patients)
							.set({ status: "active", updatedAt: new Date() })
							.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)));
					}
					return { kind: "ok" as const };
				}

				await setPatientArchiveStatusInDb(
					orgId,
					patientId,
					requestedBlacklisted,
					patient.fullName,
					tx,
				);

				const rowsAfter = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId, tx),
					patientId,
					patient.fullName,
				);
				if (patientArchiveRowsBlockBooking(rowsAfter) !== requestedBlacklisted) {
					return { kind: "not_saved" as const };
				}
				return { kind: "ok" as const };
			});

			if (txResult.kind === "not_found") {
				return sendPatientNotFound(reply);
			}
			if (txResult.kind === "not_saved") {
				return reply.code(500).send({
					error: "PatientArchiveStatusNotSaved",
					message: requestedBlacklisted
						? "Запрет записи не сохранён в базе. Пациент по-прежнему доступен для записи на приём — повторите действие."
						: "Снятие запрета не сохранено в базе. Пациенту по-прежнему запрещена запись на приём — повторите действие.",
				});
			}

			return reply
				.status(200)
				.send({ success: true, isBlacklisted: requestedBlacklisted });
		} catch (e: unknown) {
			request.log.error(
				{ err: e },
				"[Patients] Ошибка сохранения запрета записи",
			);
			return reply.code(500).send({
				error: "PatientArchiveStatusNotSaved",
				message:
					"Не удалось сохранить запрет записи. Откройте карту заново и проверьте текущий запрет перед повторной попыткой.",
			});
		}
	};

	app.post("/api/patients/:patientId/archive-status", handleArchiveStatus);
	app.put("/api/patients/:patientId/archive-status", handleArchiveStatus);

	app.post("/api/patients/:patientId/archive", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		// 152-ФЗ / 323-ФЗ: Архивация и внесение пациентов в черный список требуют авторизованного сотрудника-администратора
		const identity = getRequestIdentity(request);
		if (!identity.userId) {
			return reply.code(401).send({
				error: "StaffAuthRequired",
				message:
					"Требуется авторизация сотрудника клиники (staff token) для архивации пациента.",
			});
		}

		const staffRole = identity.role ?? request.user?.role ?? null;
		const allowedArchiveRoles = new Set([
			"admin",
			"administrator",
			"owner",
			"chief_doctor",
			"chiefdoctor",
			"head_doctor",
		]);

		if (!staffRole || !allowedArchiveRoles.has(staffRole)) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archive",
				role: staffRole,
				message:
					"Архивация и внесение пациентов в черный список разрешены только администраторам или руководству клиники.",
			});
		}

		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		const parsedBody = patientArchiveBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте правильность заполнения формы архивации.",
				issues: parsedBody.error.issues,
			});
		}
		const {
			archiveReason,
			reasonCode,
			isBlacklisted,
			blacklistReason,
			notes,
		} = parsedBody.data;

		const userId = identity.userId;

		try {
			const { PatientArchiveReasonService } = await import(
				"../../services/patients/PatientArchiveReasonService.js"
			);
			const result = await PatientArchiveReasonService.archivePatient(
				orgId,
				{
					patientId,
					reasonCode: reasonCode ?? undefined,
					archiveReason: archiveReason ?? undefined,
					isBlacklisted,
					blacklistReason: blacklistReason ?? undefined,
					notes: notes ?? undefined,
					actorUserId: userId ?? null,
				},
			);

			return reply.status(200).send({
				success: true,
				isBookingBlocked: result.isBookingBlocked,
				legalBasis: result.legalBasis,
				reasonName: result.reasonName,
			});
		} catch (e: unknown) {
			request.log.error({ err: e }, "[Patients] Ошибка при архивации пациента");
			return reply.code(500).send({
				error: "PatientArchiveError",
				message:
					e instanceof Error
						? e.message
						: "Не удалось архивировать пациента. Пожалуйста, попробуйте еще раз.",
			});
		}
	});

	/**
	 * GET /api/patients/archive-reasons
	 * Справочник нормативных причин списания в архив по 323-ФЗ.
	 */
	app.get("/api/patients/archive-reasons", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const { PatientArchiveReasonService } = await import(
			"../../services/patients/PatientArchiveReasonService.js"
		);
		const reasons = await PatientArchiveReasonService.listReasons(orgId);
		return reply.send({ success: true, reasons });
	});

	const adminMutationOptions = {
		schema: {
			description: "Patient administrative mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	} as const;

	/**
	 * POST /api/patients/:patientId/unarchive
	 * Восстановление пациента из архива (разархивация).
	 */
	app.post("/api/patients/:patientId/unarchive", adminMutationOptions, async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const identity = getRequestIdentity(request);
		if (!identity.userId) {
			return reply.code(401).send({
				error: "StaffAuthRequired",
				message:
					"Требуется авторизация сотрудника клиники (staff token) для разархивации пациента.",
			});
		}

		const staffRole = identity.role ?? request.user?.role ?? null;
		const allowedArchiveRoles = new Set([
			"admin",
			"administrator",
			"owner",
			"chief_doctor",
			"chiefdoctor",
			"head_doctor",
			"doctor",
		]);

		if (!staffRole || !allowedArchiveRoles.has(staffRole)) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archive",
				role: staffRole,
				message:
					"Разархивация пациентов разрешена администраторам, врачам или руководству клиники.",
			});
		}

		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		const { PatientArchiveReasonService } = await import(
			"../../services/patients/PatientArchiveReasonService.js"
		);
		await PatientArchiveReasonService.unarchivePatient(orgId, patientId);
		return reply.send({ success: true });
	});
}
