import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { ClinicalTaskOwnershipError } from "../../db/clinicalTasksQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	ClinicalRouter,
} from "../../services/clinical/ClinicalRouter.js";
import {
	clinicalPhaseCompletionSchema,
	clinicalPhaseCompletionValidationMessage,
	resolveClinicalStaffRole,
	UUID_PATTERN,
} from "./types.js";

const clinicalTaskStatusUpdateSchema = z
	.object({
		status: z
			.enum(["pending", "in_progress", "completed", "cancelled"])
			.default("completed"),
	})
	.strict();

const clinicalTasksQuerySchema = z
	.object({
		patientId: z.string().regex(UUID_PATTERN).optional(),
	})
	.strict();

const clinicalTaskParamsSchema = z
	.object({
		taskId: z.string().regex(UUID_PATTERN),
	})
	.strict();

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

		const parsed = clinicalPhaseCompletionSchema.safeParse(
			request.body ?? {},
		);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ClinicalPhaseValidationError",
				message: clinicalPhaseCompletionValidationMessage,
			});
		}

		const {
			patientId,
			completedPhaseCode,
			treatmentPlanId,
			assignedDoctorId,
			toothCodes,
			notes,
		} = parsed.data;

		try {
			const task = await new ClinicalRouter().handlePhaseCompletion(orgId, {
				patientId,
				completedPhaseCode,
				notes: notes ?? null,
				toothCodes,
				treatmentPlanId: treatmentPlanId ?? null,
				assignedDoctorId: assignedDoctorId ?? null,
			});
			if (!task) {
				return reply.code(400).send({
					error: "ClinicalPhaseValidationError",
					message: clinicalPhaseCompletionValidationMessage,
				});
			}
			return reply.code(201).send(task);
		} catch (error: unknown) {
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
			const staffRole = identity.role ?? request.user?.role ?? null;
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
			const parsedQuery = clinicalTasksQuerySchema.safeParse(
				request.query ?? {},
			);
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ClinicalTaskValidationError",
					message: "Ошибка валидации: patientId должен быть UUID.",
				});
			}
			const { patientId } = parsedQuery.data;
			return reply
				.code(200)
				.send(await new ClinicalRouter().listTasks(orgId, patientId));
		} catch (error: unknown) {
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

		const staffRole = resolveClinicalStaffRole(request);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.tasks.write",
				role: staffRole,
				message:
					"Изменение статуса клинических задач ограничено 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		const parsedParams = clinicalTaskParamsSchema.safeParse(
			request.params ?? {},
		);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ClinicalTaskValidationError",
				message: "Ошибка валидации: taskId должен быть UUID.",
			});
		}
		const { taskId } = parsedParams.data;

		const parsedBody = clinicalTaskStatusUpdateSchema.safeParse(
			request.body ?? {},
		);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ClinicalTaskValidationError",
				message: "Недопустимый статус клинической задачи.",
			});
		}
		const { status } = parsedBody.data;

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
		} catch (error: unknown) {
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
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"crm custom task types",
				))
			) {
				return;
			}
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			if (staffRole) {
				const evalAccess = evaluateClinicalAccess(staffRole, {
					clinicalRole: identity.clinicalRole ?? null,
					canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
					specialties: identity.specialties ?? null,
				});
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.tasks.read",
						role: staffRole,
						message:
							"Доступ к типам CRM-задач ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
					});
				}
			}

			const { getCustomCrmTaskTypesFromDb } = await import(
				"../../db/customCrmTaskTypesQuery.js"
			);
			const taskTypes = await withTenantCtx(orgId, () =>
				getCustomCrmTaskTypesFromDb(orgId),
			);
			return reply.status(200).send(taskTypes);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении типов CRM-задач.",
			});
		}
	});

}
