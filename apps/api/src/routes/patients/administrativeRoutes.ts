import {
	patientSchema,
	updatePatientAdministrativeProfileSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
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
			if (!params.patientId) return sendPatientRouteValidationError(reply);
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
						error: "Decree659OmsForbiddenError",
						message:
							"Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: привязка полиса ОМС к анонимной карте категорически запрещена. Для использования полиса ОМС требуется деанонимизация пациента с предъявлением паспорта РФ и СНИЛС.",
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
			} catch (e) {
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
		if (!patientId) return sendPatientRouteValidationError(reply);

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
		} catch (e) {
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

	app.post(
		"/api/patients/:patientId/archive-status",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId } = request.params as { patientId?: string };
			if (!patientId) return sendPatientRouteValidationError(reply);

			const parsedBody = patientArchiveStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (
				!parsedBody.success ||
				typeof parsedBody.data.isBlacklisted !== "boolean"
			) {
				// БЫЛО: «isBlacklisted boolean is required» — имя поля запроса на экране
				// администратора вместо того, что от него требуется.
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
				const patient = await getPatientByIdFromDb(orgId, patientId);
				if (!patient) return sendPatientNotFound(reply);

				const rowsBefore = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
					patientId,
					patient.fullName,
				);
				// Повторное нажатие кнопки не должно плодить строки: setPatientArchiveStatusInDb
				// вставляет запись безусловно, а карточка после отправки перечитывает статус
				// и снова показывает ту же кнопку.
				if (
					patientArchiveRowsBlockBooking(rowsBefore) === requestedBlacklisted
				) {
					return reply
						.status(200)
						.send({ success: true, isBlacklisted: requestedBlacklisted });
				}

				await setPatientArchiveStatusInDb(
					orgId,
					patientId,
					requestedBlacklisted,
					patient.fullName,
				);

				// БЫЛО: маршрут отвечал { success: true } сразу после вызова записи, а
				// setPatientArchiveStatusInDb гасит ЛЮБУЮ ошибку базы в пустой catch и
				// оставляет запрет только в памяти процесса. Карточка показывала «Пациент
				// добавлен в черный список. Запись на прием заблокирована», запрет исчезал
				// при перезапуске сервера, и никто об этом не узнавал. Отвечаем успехом
				// только после того, как база подтвердила новое состояние.
				const rowsAfter = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
					patientId,
					patient.fullName,
				);
				if (
					patientArchiveRowsBlockBooking(rowsAfter) !== requestedBlacklisted
				) {
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
			} catch (e) {
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
		},
	);

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

		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
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
		if (!patientId) return sendPatientRouteValidationError(reply);

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
		} catch (e) {
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

	/**
	 * POST /api/patients/:patientId/unarchive
	 * Восстановление пациента из архива (разархивация).
	 */
	app.post("/api/patients/:patientId/unarchive", async (request, reply) => {
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

		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
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
					"Разархивация пациентов разрешена только администраторам или руководству клиники.",
			});
		}

		const { patientId } = request.params as { patientId?: string };
		if (!patientId) return sendPatientRouteValidationError(reply);

		const { PatientArchiveReasonService } = await import(
			"../../services/patients/PatientArchiveReasonService.js"
		);
		await PatientArchiveReasonService.unarchivePatient(orgId, patientId);
		return reply.send({ success: true });
	});
}
