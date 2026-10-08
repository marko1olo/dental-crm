import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
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
	 *
	 * ЧЕГО НЕ БЫЛО. Экран карточки (PatientReclamationsWidget, 588 строк) умел
	 * фиксировать жалобу, назначать врача-автора работы, помечать инцидент
	 * урегулированным и удалять запись — а сервера под ним не существовало. Живая
	 * проверка сети (scratch/probe-failed-requests.mjs) показала на карточке
	 * пациента 404 на GET .../reclamations. Врач нажимал «Зафиксировать в карту»,
	 * получал отказ и не имел ни одного способа сохранить претензию. Рекламация —
	 * основание для гарантии, возврата и переделки, то есть деньги и разбор.
	 *
	 * Долг был записан в tests/webCallsExistingRoutes.test.ts со словами «таблицы
	 * есть, маршрутов нет» — неправда: не было ни таблицы, ни маршрута. Таблица
	 * создана в drizzle/0143_patient_reclamations.sql.
	 *
	 * ИМЕНА ПОЛЕЙ взяты из того, что экран уже отправляет и читает. Свой контракт
	 * поверх работающего клиента сломал бы его молча.
	 */
	app.get("/api/patients/:patientId/reclamations", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		try {
			// Карта чужой клиники и карта без осложнений — разные ответы. Пустой список
			// на несуществующей карте врач прочитает как «осложнений не было».
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			// 152-ФЗ / 323-ФЗ ст. 13: Защита рекламаций и осложнений архивированного пациента
			if (patient.status === "archived") {
				const identity = getRequestIdentity(request);
				const reqAny = request as unknown as { user?: { role?: string | null } };
				const staffRole = identity.role ?? reqAny.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.reclamations",
						role: staffRole,
						message: "Отказ в доступе к рекламациям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
					});
				}
			}

			const { getPatientReclamationsFromDb } = await import(
				"../../db/patientReclamationsQuery.js"
			);
			return reply
				.status(200)
				.send(await getPatientReclamationsFromDb(orgId, patientId.trim()));
		} catch (e) {
			// Отказ базы НЕ выдаём за пустой журнал: экран умеет показать отказ отдельно
			// от пустоты, и эта способность держится на коде ответа.
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
	});

	app.post("/api/patients/:patientId/reclamations", async (request, reply) => {
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
			// Сообщение называет то, что требуется от человека, а не имя поля запроса.
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не описана суть жалобы или осложнения — без этого запись в карте бесполезна.",
			});
		}
		const doctorId =
			typeof body.doctorId === "string" &&
			PATIENT_ID_UUID_PATTERN.test(body.doctorId.trim())
				? body.doctorId.trim()
				: null;
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

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { createPatientReclamationInDb } = await import(
				"../../db/patientReclamationsQuery.js"
			);
			const created = await createPatientReclamationInDb(
				orgId,
				patientId.trim(),
				{
					complicationDetails: details,
					proposedAction,
					doctorId,
				},
			);
			return reply.status(201).send(created);
		} catch (e) {
			request.log.error({ err: e }, "[Patients] Ошибка фиксации рекламации");
			return reply.code(500).send({
				error: "PatientReclamationCreateFailed",
				message:
					"Не удалось зафиксировать рекламацию. Запись могла не сохраниться — откройте журнал и проверьте перед повторным вводом.",
			});
		}
	});

	app.put(
		"/api/patients/:patientId/reclamations/:reclamationId",
		async (request, reply) => {
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
				const updated = await setPatientReclamationStatusInDb(
					orgId,
					patientId.trim(),
					reclamationId.trim(),
					status,
				);
				// Записи нет — 404, а не тихий успех: экран красит строку оптимистично до
				// ответа и вернёт прежнее значение только по отказу.
				if (!updated) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её удалил кто-то другой. Обновите журнал.",
					});
				}
				return reply.status(200).send(updated);
			} catch (e) {
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
	);

	app.delete(
		"/api/patients/:patientId/reclamations/:reclamationId",
		async (request, reply) => {
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
				const removed = await deletePatientReclamationFromDb(
					orgId,
					patientId.trim(),
					reclamationId.trim(),
				);
				// Экран по успеху убирает строку из списка. «Удалено» без удаления вернуло бы
				// инцидент при следующем открытии карты, и человек решил бы, что программа
				// его обманула, — а он был бы прав.
				if (!removed) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её уже удалили. Обновите журнал.",
					});
				}
				return reply.status(200).send({ success: true });
			} catch (e) {
				request.log.error({ err: e }, "[Patients] Ошибка удаления рекламации");
				return reply.code(500).send({
					error: "PatientReclamationDeleteFailed",
					message:
						"Не удалось удалить запись об инциденте. Она осталась в карте — повторите попытку.",
				});
			}
		},
	);
}
