import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { ClinicalTaskOwnershipError } from "../../db/clinicalTasksQuery.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	ClinicalRouter,
	isClinicalPhaseCode,
} from "../../services/clinical/ClinicalRouter.js";
import {
	UUID_PATTERN,
	clinicalPhaseCompletionValidationMessage,
	optionalUuid,
	resolveClinicalStaffRole,
} from "./types.js";

/**
 * Treatment phases, handovers, clinical routing tasks, and CRM tasks.
 */
export async function registerClinicalTreatmentRoutes(app: FastifyInstance) {
	/**
	 * Завершение клинического этапа и передача пациента следующему врачу.
	 *
	 * БЫЛО: роута не существовало. Сервис ClinicalRouter собирал задачу-передачу
	 * в памяти, печатал её в консоль и возвращал вызывающему, которого не было:
	 * класс не был подключён ни к одному эндпоинту. Передача между этапами
	 * лечения не доходила ни до базы, ни до следующего врача.
	 */
	app.post("/api/clinical/phase-completions", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"clinical phase completion",
			))
		)
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Передача между клиническими этапами разрешена только клиническому персоналу (врач/ассистент)
		const staffRole = resolveClinicalStaffRole(request);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.phase.write",
				role: staffRole,
				message:
					"Передача между клиническими этапами ограничена 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		const body = (
			request.body && typeof request.body === "object" ? request.body : {}
		) as Record<string, unknown>;
		const patientId =
			typeof body.patientId === "string" && UUID_PATTERN.test(body.patientId)
				? body.patientId
				: null;
		const treatmentPlanId = optionalUuid(body.treatmentPlanId);
		const assignedDoctorId = optionalUuid(body.assignedDoctorId);
		const toothCodesRaw = body.toothCodes;
		const toothCodesValid =
			toothCodesRaw === undefined ||
			(Array.isArray(toothCodesRaw) &&
				toothCodesRaw.every((c) => typeof c === "string"));
		const notesValid =
			body.notes === undefined ||
			body.notes === null ||
			typeof body.notes === "string";

		if (
			!patientId ||
			!isClinicalPhaseCode(body.completedPhaseCode) ||
			treatmentPlanId === undefined ||
			assignedDoctorId === undefined ||
			!toothCodesValid ||
			!notesValid
		) {
			return reply.code(400).send({
				error: "ClinicalPhaseValidationError",
				message: clinicalPhaseCompletionValidationMessage,
			});
		}

		try {
			const task = await new ClinicalRouter().handlePhaseCompletion(orgId, {
				patientId,
				completedPhaseCode: body.completedPhaseCode,
				notes: typeof body.notes === "string" ? body.notes : null,
				toothCodes: (toothCodesRaw as string[] | undefined) ?? [],
				treatmentPlanId,
				assignedDoctorId,
			});
			if (!task) {
				return reply.code(400).send({
					error: "ClinicalPhaseValidationError",
					message: clinicalPhaseCompletionValidationMessage,
				});
			}
			return reply.code(201).send(task);
		} catch (error) {
			if (error instanceof ClinicalTaskOwnershipError) {
				return reply.code(404).send({
					error: "ClinicalTaskReferenceNotFound",
					message: error.message,
					field: error.field,
				});
			}
			throw error;
		}
	});

	/** Задачи, созданные передачей между этапами. Это то, что видит следующий врач, открывая карту. */
	app.get("/api/clinical/tasks", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"clinical tasks read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Задачи передачи между клиническими этапами содержат врачебную тайну
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (staffRole && !evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.tasks.read",
					role: staffRole,
					message:
						"Доступ к клиническим задачам ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}
			const { patientId } = request.query as { patientId?: string };
			if (patientId !== undefined && !UUID_PATTERN.test(patientId)) {
				return reply.code(400).send({
					error: "ClinicalTaskValidationError",
					message: "Ошибка валидации: patientId должен быть UUID.",
				});
			}
			return reply
				.code(200)
				.send(await new ClinicalRouter().listTasks(orgId, patientId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении клинических задач.",
			});
		}
	});

	/**
	 * Смена статуса клинической задачи (Мандаты 8e, 8k — закрытие в 1 клик без бюрократии).
	 */
	const handleClinicalTaskStatusUpdate = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"clinical task status update",
			))
		)
			return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { taskId } = request.params as { taskId?: string };
		if (!taskId || !UUID_PATTERN.test(taskId)) {
			return reply.code(400).send({
				error: "ClinicalTaskValidationError",
				message: "Ошибка валидации: taskId должен быть UUID.",
			});
		}

		const body = (
			request.body && typeof request.body === "object" ? request.body : {}
		) as { status?: string };
		const status = body.status ?? "completed";
		if (
			status !== "pending" &&
			status !== "in_progress" &&
			status !== "completed" &&
			status !== "cancelled"
		) {
			return reply.code(400).send({
				error: "ClinicalTaskValidationError",
				message: "Недопустимый статус клинической задачи.",
			});
		}

		try {
			const updated = await new ClinicalRouter().updateTaskStatus(
				orgId,
				taskId,
				status,
			);
			if (!updated) {
				return reply.code(404).send({
					error: "ClinicalTaskNotFound",
					message: "Клиническая задача не найдена в этой организации.",
				});
			}
			return reply.code(200).send(updated);
		} catch (error) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка обновления статуса клинической задачи.",
			});
		}
	};

	app.patch("/api/clinical/tasks/:taskId", handleClinicalTaskStatusUpdate);
	app.put("/api/clinical/tasks/:taskId", handleClinicalTaskStatusUpdate);

	// COMPETITOR FEATURE #47: crm::конструктор_типов_задач_без_привязки_к_визиту
	app.get("/api/crm/custom-task-types", async (request, reply) => {
		try {
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getCustomCrmTaskTypesFromDb } = await import(
				"../../db/customCrmTaskTypesQuery.js"
			);
			return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении типов CRM-задач.",
			});
		}
	});

	// COMPETITOR FEATURE #47: crm::пользовательские_типы_задач_для_администраторов
	app.get("/api/crm/custom-crm-task-types", async (request, reply) => {
		try {
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getCustomCrmTaskTypesFromDb } = await import(
				"../../db/customCrmTaskTypesQuery.js"
			);
			return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении пользовательских типов CRM-задач.",
			});
		}
	});
}
