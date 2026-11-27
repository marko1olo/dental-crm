/**
 * Маршруты задач CRM (CRM Tasks & Tickets).
 *
 * Мандаты 8k, 8s, 8e, 8d:
 * - Снижение трения: быстрые шаблоны стоматологических задач
 * - Автономия врача: быстрая смена статуса без обязательного ввода комментариев
 * - Полный жизненный цикл задач (GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id)
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clinicalTaskStatusSchema } from "@dental/shared";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
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
		hint: "Контроль брекетов/элайнеров через 3 недели",
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
		hint: "Контрольный осмотр после имплантации через 10 дней",
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
		hint: "Отследить готовность работы в лаборатории через 7 дней",
	},
	{
		id: "preset-recall-6m",
		title: "Напоминание о профгигиене через 6 мес",
		label: "Напоминание о профгигиене через 6 мес",
		description:
			"Плановый звонок/сообщение о наступлении срока профгигиены полости рта и контрольного профосмотра.",
		taskType: "recall_hygiene_6m",
		slaDays: 180,
		priority: "normal",
		hint: "Запланировать звонок о профгигиене через 6 месяцев",
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
		hint: "Задача на анализ КТ и 3D-планирование за 3 дня",
	},
];

const createTaskBodySchema = z
	.object({
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
	})
	.strict();

const updateTaskStatusBodySchema = z
	.object({
		status: clinicalTaskStatusSchema,
	})
	.strict();

const getTasksQuerySchema = z
	.object({
		patientId: z.string().optional(),
		status: z.string().optional(),
		assignedToId: z.string().optional(),
	})
	.strict();

const taskIdParamSchema = z
	.object({
		id: z.string().regex(UUID_REGEX),
	})
	.strict();

export const taskIdempotencyMutationOptionsWithOrgIdContext = {
	schema: {
		description:
			"CRM task mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

export const taskMutationRouteOptions = taskIdempotencyMutationOptionsWithOrgIdContext;

export async function registerTasksRoutes(app: FastifyInstance) {
	/**
	 * Получение канонических шаблонов стоматологических задач (Мандат 8k).
	 */
	app.get("/api/tasks/presets", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "tasks presets read")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		return reply.code(200).send(CANONICAL_DENTAL_TASK_PRESETS);
	});

	/**
	 * Получение списка задач CRM по организации.
	 */
	app.get("/api/tasks", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "tasks read")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const queryParsed = getTasksQuerySchema.safeParse(request.query ?? {});
		if (!queryParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации задач.",
			});
		}
		const query = queryParsed.data;

		const patientId =
			query.patientId && UUID_REGEX.test(query.patientId)
				? query.patientId
				: undefined;
		const assignedToId =
			query.assignedToId && UUID_REGEX.test(query.assignedToId)
				? query.assignedToId
				: undefined;
		const statusParsed = clinicalTaskStatusSchema.safeParse(query.status);
		const status = statusParsed.success ? statusParsed.data : undefined;

		try {
			const filters: {
				patientId?: string;
				assignedToId?: string;
				status?: PatientTaskTicketStatus;
			} = {};
			if (patientId) filters.patientId = patientId;
			if (assignedToId) filters.assignedToId = assignedToId;
			if (status) filters.status = status;

			const tasks = await withTenantCtx(orgId, async (tx) =>
				getAllTaskTicketsFromDb(orgId, filters, tx),
			);
			return reply.code(200).send(tasks);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось получить список задач.",
			});
		}
	});

	/**
	 * Создание задачи CRM.
	 */
	app.post("/api/tasks", taskIdempotencyMutationOptionsWithOrgIdContext, async (request, reply) => {
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
		const currentUserId = request.user?.id;
		const effectiveAssignedToId =
			body.assignedToId ??
			(currentUserId && UUID_REGEX.test(currentUserId) ? currentUserId : null);

		try {
			const task = await withTenantCtx(orgId, async (tx) =>
				createPatientTaskTicketInDb(
					orgId,
					body.patientId,
					{
						title: body.title.trim(),
						description: body.description?.trim() ?? null,
						assignedToId: effectiveAssignedToId,
						priority: body.priority,
					},
					tx,
				),
			);

			return reply.code(201).send(task);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось создать задачу.",
			});
		}
	});

	/**
	 * Закрытие или смена статуса задачи (Мандат 8e).
	 */
	const handleStatusUpdate = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (!(await requireClinicalMutationAccess(request, reply, "tasks write")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const paramsParsed = taskIdParamSchema.safeParse(request.params ?? {});
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор задачи должен быть UUID.",
			});
		}
		const { id } = paramsParsed.data;

		const parsed = updateTaskStatusBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Недопустимый статус задачи.",
			});
		}

		try {
			const updated = await withTenantCtx(orgId, async (tx) =>
				setTaskTicketStatusByIdInDb(
					orgId,
					id,
					parsed.data.status,
					tx,
				),
			);
			if (!updated) {
				return reply.code(404).send({
					error: "TaskNotFound",
					message: "Задача не найдена в этой организации.",
				});
			}

			return reply.code(200).send(updated);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось обновить статус задачи.",
			});
		}
	};

	app.patch("/api/tasks/:id", taskIdempotencyMutationOptionsWithOrgIdContext, handleStatusUpdate);
	app.put("/api/tasks/:id", taskIdempotencyMutationOptionsWithOrgIdContext, handleStatusUpdate);

	/**
	 * Удаление задачи.
	 * door-validation: none — удаление задачи по URL-параметру :id без тела запроса
	 */
	app.delete("/api/tasks/:id", taskIdempotencyMutationOptionsWithOrgIdContext, async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "tasks delete")))
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const paramsParsed = taskIdParamSchema.safeParse(request.params ?? {});
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор задачи должен быть UUID.",
			});
		}
		const { id } = paramsParsed.data;

		try {
			const deleted = await withTenantCtx(orgId, async (tx) =>
				deleteTaskTicketByIdInDb(orgId, id, tx),
			);
			if (!deleted) {
				return reply.code(404).send({
					error: "TaskNotFound",
					message: "Задача не найдена.",
				});
			}

			const deletePayload = { success: true, id };

			return reply.code(200).send(deletePayload);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось удалить задачу.",
			});
		}
	});
}
