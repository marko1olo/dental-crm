/**
 * Маршруты задач CRM (CRM Tasks & Tickets).
 *
 * Мандаты 8k, 8s, 8e, 8d:
 * - Снижение трения: быстрые 1-клик шаблоны стоматологических задач
 * - Автономия врача: 1-клик смена статуса без обязательного ввода комментариев
 * - Паритет со StomX (GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id)
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";
import {
	createPatientTaskTicketInDb,
	deleteTaskTicketByIdInDb,
	getAllTaskTicketsFromDb,
	type PatientTaskTicketStatus,
	setTaskTicketStatusByIdInDb,
} from "../db/patientTaskTicketsQuery.js";
import { requireOrganizationId } from "../security/identity.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TaskPresetDto = {
	id: string;
	title: string;
	label: string;
	description: string;
	taskType: string;
	slaDays: number;
	priority: "normal" | "high" | "urgent";
	hint: string;
};

export const CANONICAL_DENTAL_TASK_PRESETS: readonly TaskPresetDto[] = [
	{
		id: "preset-ortho-call",
		title: "Звонок ортодонта / контроль брекетов",
		label: "Звонок ортодонта / контроль брекетов",
		description:
			"Контрольный звонок ортодонтического пациента: оценка адаптации, целостности дуг, фиксации брекетов/элайнеров.",
		taskType: "orthodontics_recall",
		slaDays: 21,
		priority: "normal",
		hint: "1 клик: контроль брекетов/элайнеров через 3 недели",
	},
	{
		id: "preset-implant-check",
		title: "Контрольный осмотр после имплантации",
		label: "Контрольный осмотр после имплантации",
		description:
			"Осмотр зоны имплантации, контроль заживления слизистой, оценка стабильности формирователя десны / винтов.",
		taskType: "implant_check",
		slaDays: 10,
		priority: "high",
		hint: "1 клик: контрольный осмотр после имплантации через 10 дней",
	},
	{
		id: "preset-ztl-ready",
		title: "Готовность работы ЗТЛ",
		label: "Готовность работы ЗТЛ",
		description:
			"Проверка поступления ортопедической конструкции из зуботехнической лаборатории (ЗТЛ), контроль качества и вызов пациента на припасовку.",
		taskType: "ztl_ready",
		slaDays: 7,
		priority: "normal",
		hint: "1 клик: отследить готовность работы в лаборатории через 7 дней",
	},
	{
		id: "preset-recall-6m",
		title: "Напоминание о профгигиене через 6 мес",
		label: "Напоминание о профгигиене через 6 мес",
		description:
			"Плановый звонок/сообщение о наступлении срока профгигиены полости рта и диспансерного осмотра.",
		taskType: "recall_hygiene_6m",
		slaDays: 180,
		priority: "normal",
		hint: "1 клик: запланировать звонок о профгигиене через 6 месяцев",
	},
	{
		id: "preset-ct-planning",
		title: "Снимок КТ / планирование",
		label: "Снимок КТ / планирование",
		description:
			"Анализ КЛКТ/визиографии, виртуальная расстановка имплантов, разметка нижнечелюстного канала или заказ хирургического шаблона.",
		taskType: "ct_planning",
		slaDays: 3,
		priority: "high",
		hint: "1 клик: задача на анализ КТ и 3D-планирование за 3 дня",
	},
];

const createTaskBodySchema = z.object({
	title: z.string().min(1, "Название задачи обязательно"),
	description: z.string().nullable().optional(),
	patientId: z.string().regex(UUID_REGEX, "patientId должен быть UUID"),
	assignedToId: z
		.string()
		.regex(UUID_REGEX, "assignedToId должен быть UUID")
		.nullable()
		.optional(),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal"),
	taskType: z.string().optional(),
});

const updateTaskStatusBodySchema = z.object({
	status: z.enum(["pending", "completed"]),
});

export async function registerTasksRoutes(app: FastifyInstance) {
	/**
	 * Получение канонических шаблонов стоматологических задач (Мандат 8k).
	 */
	app.get("/api/tasks/presets", async (_request, reply) => {
		return reply.code(200).send(CANONICAL_DENTAL_TASK_PRESETS);
	});

	/**
	 * Получение списка задач CRM по организации (StomX паритет 370).
	 */
	app.get("/api/tasks", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "tasks read")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const query = (
			request.query && typeof request.query === "object" ? request.query : {}
		) as {
			patientId?: string;
			status?: string;
			assignedToId?: string;
		};

		const patientId =
			query.patientId && UUID_REGEX.test(query.patientId)
				? query.patientId
				: undefined;
		const assignedToId =
			query.assignedToId && UUID_REGEX.test(query.assignedToId)
				? query.assignedToId
				: undefined;
		const status =
			query.status === "pending" || query.status === "completed"
				? (query.status as PatientTaskTicketStatus)
				: undefined;

		try {
			const tasks = await getAllTaskTicketsFromDb(orgId, {
				patientId,
				assignedToId,
				status,
			});
			return reply.code(200).send(tasks);
		} catch (error) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось получить список задач.",
			});
		}
	});

	/**
	 * Создание задачи CRM (StomX паритет 371, 1 клик).
	 */
	app.post("/api/tasks", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "tasks write")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = createTaskBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Ошибка валидации задачи.",
			});
		}

		const body = parsed.data;
		// Если assignedToId не передан, берем текущего пользователя (соло-врач автономия)
		const currentUserId = (
			request as unknown as { user?: { id?: string } }
		).user?.id;
		const effectiveAssignedToId =
			body.assignedToId ??
			(currentUserId && UUID_REGEX.test(currentUserId) ? currentUserId : null);

		try {
			const task = await createPatientTaskTicketInDb(orgId, body.patientId, {
				title: body.title.trim(),
				description: body.description?.trim() ?? null,
				assignedToId: effectiveAssignedToId,
				priority: body.priority,
			});
			return reply.code(201).send(task);
		} catch (error) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось создать задачу.",
			});
		}
	});

	/**
	 * Закрытие или смена статуса задачи (StomX паритет 372, 1 клик, Мандат 8e).
	 */
	const handleStatusUpdate = async (
		request: Parameters<Parameters<FastifyInstance["patch"]>[1]>[0],
		reply: Parameters<Parameters<FastifyInstance["patch"]>[1]>[1],
	) => {
		if (!(await requireClinicalMutationAccess(request, reply, "tasks write")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id?: string };
		if (!id || !UUID_REGEX.test(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор задачи должен быть UUID.",
			});
		}

		const parsed = updateTaskStatusBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Недопустимый статус задачи.",
			});
		}

		try {
			const updated = await setTaskTicketStatusByIdInDb(
				orgId,
				id,
				parsed.data.status,
			);
			if (!updated) {
				return reply.code(404).send({
					error: "TaskNotFound",
					message: "Задача не найдена в этой организации.",
				});
			}
			return reply.code(200).send(updated);
		} catch (error) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось обновить статус задачи.",
			});
		}
	};

	app.patch("/api/tasks/:id", handleStatusUpdate);
	app.put("/api/tasks/:id", handleStatusUpdate);

	/**
	 * Удаление задачи.
	 */
	app.delete("/api/tasks/:id", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "tasks delete")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id?: string };
		if (!id || !UUID_REGEX.test(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор задачи должен быть UUID.",
			});
		}

		try {
			const deleted = await deleteTaskTicketByIdInDb(orgId, id);
			if (!deleted) {
				return reply.code(404).send({
					error: "TaskNotFound",
					message: "Задача не найдена.",
				});
			}
			return reply.code(200).send({ success: true, id });
		} catch (error) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось удалить задачу.",
			});
		}
	});
}
