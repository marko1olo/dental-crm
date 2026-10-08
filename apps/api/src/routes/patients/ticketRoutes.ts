import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import {
	PATIENT_ID_UUID_PATTERN,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";
import {
	patientTaskTicketCreateBodySchema,
	patientTaskTicketStatusBodySchema,
} from "./types.js";

export function registerPatientTicketRoutes(app: FastifyInstance) {
	/**
	 * ЗАДАЧИ (ПОРУЧЕНИЯ) ПО КАРТЕ. Четыре маршрута.
	 *
	 * ЧЕГО НЕ БЫЛО. Экран карточки (PatientTaskTicketsWidget) умел создать
	 * поручение, отметить его выполненным, вернуть в работу и удалить — а сервера
	 * под ним не существовало. Живая проверка сети показала 404 на
	 * GET .../tickets. Администратор нажимал «Создать задачу», получал отказ и не
	 * имел ни одного способа поручить «перезвонить по отёку, дослать снимок».
	 * Потерянное поручение — это несделанный звонок больному человеку.
	 *
	 * ИМЕНА ПОЛЕЙ взяты из того, что экран уже отправляет и читает (title,
	 * description, assignedToId, status). Таблица —
	 * drizzle/0144_patient_task_tickets.sql.
	 */
	app.get("/api/patients/:patientId/tickets", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		try {
			// Карта чужой клиники и карта без поручений — разные ответы. Пустой список
			// на несуществующей карте администратор прочитает как «дел по ней нет».
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { getPatientTaskTicketsFromDb } = await import(
				"../../db/patientTaskTicketsQuery.js"
			);
			return reply
				.status(200)
				.send(await getPatientTaskTicketsFromDb(orgId, patientId.trim()));
		} catch (e) {
			// Отказ базы НЕ выдаём за пустой список: экран умеет показать отказ отдельно
			// от пустоты, и эта способность держится на коде ответа.
			request.log.error(
				{ err: e },
				"[Patients] Ошибка чтения задач по пациенту",
			);
			return reply.code(500).send({
				error: "PatientTaskTicketsUnavailable",
				message:
					"Не удалось прочитать задачи по этой карте. Не считайте, что их нет: повторите чтение и не планируйте день по этому списку.",
			});
		}
	});

	app.post("/api/patients/:patientId/tickets", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		const parsedBody = patientTaskTicketCreateBodySchema.safeParse(
			request.body ?? {},
		);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не указано, что нужно сделать — без названия задачи поручение никому ничего не говорит.",
			});
		}
		const body = parsedBody.data;
		const title = typeof body.title === "string" ? body.title.trim() : "";
		if (!title) {
			// Сообщение называет то, что требуется от человека, а не имя поля запроса.
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не указано, что нужно сделать — без названия задачи поручение никому ничего не говорит.",
			});
		}
		/*
		 * Ответственный обязателен. Экран не даёт отправить форму без выбранного
		 * сотрудника (поле required), но проверка на сервере всё равно нужна:
		 * поручение без ответственного не появится ни в чьём списке дел и будет
		 * выглядеть созданным, оставаясь ничьим.
		 */
		const assignedToId =
			typeof body.assignedToId === "string" &&
			PATIENT_ID_UUID_PATTERN.test(body.assignedToId.trim())
				? body.assignedToId.trim()
				: null;
		if (!assignedToId) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не выбран ответственный сотрудник. Задача без исполнителя не попадёт ни в чей список дел.",
			});
		}
		const description =
			typeof body.description === "string" && body.description.trim()
				? body.description.trim()
				: null;
		// Важность экран отправляет всегда ('normal'), но на всякий случай не
		// доверяем: чужое значение не должно попасть в базу мимо смысла.
		const priority =
			typeof body.priority === "string" && body.priority.trim()
				? body.priority.trim()
				: "normal";

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { createPatientTaskTicketInDb } = await import(
				"../../db/patientTaskTicketsQuery.js"
			);
			const created = await createPatientTaskTicketInDb(
				orgId,
				patientId.trim(),
				{
					title,
					description,
					assignedToId,
					priority,
				},
			);
			return reply.status(201).send(created);
		} catch (e) {
			request.log.error(
				{ err: e },
				"[Patients] Ошибка создания задачи по пациенту",
			);
			return reply.code(500).send({
				error: "PatientTaskTicketCreateFailed",
				message:
					"Не удалось создать задачу. Она могла не сохраниться — обновите список перед повторным вводом.",
			});
		}
	});

	app.put(
		"/api/patients/:patientId/tickets/:ticketId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, ticketId } = request.params as {
				patientId?: string;
				ticketId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!ticketId ||
				!PATIENT_ID_UUID_PATTERN.test(ticketId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			const parsedBody = patientTaskTicketStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние задачи: выполнена или возвращена в работу.",
				});
			}
			const body = parsedBody.data;
			const status =
				body.status === "completed"
					? "completed"
					: body.status === "pending"
						? "pending"
						: null;
			if (!status) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние задачи: выполнена или возвращена в работу.",
				});
			}

			try {
				const { setPatientTaskTicketStatusInDb } = await import(
					"../../db/patientTaskTicketsQuery.js"
				);
				const updated = await setPatientTaskTicketStatusInDb(
					orgId,
					patientId.trim(),
					ticketId.trim(),
					status,
				);
				// Записи нет — 404, а не тихий успех: экран переставляет галочку
				// оптимистично и вернёт прежнее значение только по отказу.
				if (!updated) {
					return reply.code(404).send({
						error: "PatientTaskTicketNotFound",
						message:
							"Задача не найдена в этой карте — возможно, её удалил кто-то другой. Обновите список.",
					});
				}
				return reply.status(200).send(updated);
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка смены состояния задачи по пациенту",
				);
				return reply.code(500).send({
					error: "PatientTaskTicketUpdateFailed",
					message:
						"Не удалось изменить состояние задачи. Показанная отметка может не совпадать с сохранённой — обновите список.",
				});
			}
		},
	);

	app.delete(
		"/api/patients/:patientId/tickets/:ticketId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, ticketId } = request.params as {
				patientId?: string;
				ticketId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!ticketId ||
				!PATIENT_ID_UUID_PATTERN.test(ticketId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const { deletePatientTaskTicketFromDb } = await import(
					"../../db/patientTaskTicketsQuery.js"
				);
				const removed = await deletePatientTaskTicketFromDb(
					orgId,
					patientId.trim(),
					ticketId.trim(),
				);
				// Экран по успеху убирает строку из списка. «Удалено» без удаления вернуло бы
				// задачу при следующем открытии карты.
				if (!removed) {
					return reply.code(404).send({
						error: "PatientTaskTicketNotFound",
						message:
							"Задача не найдена в этой карте — возможно, её уже удалили. Обновите список.",
					});
				}
				return reply.status(200).send({ success: true });
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка удаления задачи по пациенту",
				);
				return reply.code(500).send({
					error: "PatientTaskTicketDeleteFailed",
					message:
						"Не удалось удалить задачу. Она осталась в карте — повторите попытку.",
				});
			}
		},
	);
}
