import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { clinicWorkflows } from "../db/schema.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";

const createWorkflowSchema = z.object({
	name: z.string().min(1).max(255),
	trigger: z.string().min(1).max(255),
	active: z.boolean().optional().default(false),
});

const toggleWorkflowSchema = z.object({
	active: z.boolean(),
});

const workflowIdParamsSchema = z.object({
	id: z.string().uuid(),
});

/** Сериализует строку workflows для ответа. */
function serializeWorkflow(wf: typeof clinicWorkflows.$inferSelect) {
	return {
		id: wf.id,
		name: wf.name,
		trigger: wf.trigger,
		active: wf.active,
		createdAt: wf.createdAt.toISOString(),
		updatedAt: wf.updatedAt.toISOString(),
	};
}

export async function registerWorkflowRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinic/workflows — список сценариев автоматизации клиники.
	 * Изолирован по organizationId и проверяет права на чтение.
	 */
	app.get("/api/clinic/workflows", async (request, reply) => {
		try {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"workflows read",
			);
			if (!context) return;

			const rows = await db
				.select()
				.from(clinicWorkflows)
				.where(eq(clinicWorkflows.organizationId, context.organizationId))
				.orderBy(clinicWorkflows.createdAt);

			return reply.status(200).send({ workflows: rows.map(serializeWorkflow) });
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось получить список сценариев",
			});
		}
	});

	/**
	 * POST /api/clinic/workflows — создать сценарий.
	 * Требует права на изменение.
	 */
	app.post("/api/clinic/workflows", async (request, reply) => {
		try {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"workflows mutate",
			);
			if (!context) return;

			const parsed = createWorkflowSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsed.error.issues.map((i) => i.message).join("; "),
				});
			}

			const [created] = await db
				.insert(clinicWorkflows)
				.values({
					organizationId: context.organizationId,
					name: parsed.data.name,
					trigger: parsed.data.trigger,
					active: parsed.data.active,
				})
				.returning();

			if (!created) {
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Сценарий не создан",
				});
			}

			return reply.status(201).send({ workflow: serializeWorkflow(created) });
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось создать сценарий",
			});
		}
	});

	/**
	 * POST /api/clinic/workflows/:id/toggle — включить / выключить сценарий.
	 */
	app.post("/api/clinic/workflows/:id/toggle", async (request, reply) => {
		try {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"workflows mutate",
			);
			if (!context) return;

			const params = workflowIdParamsSchema.safeParse(request.params);
			if (!params.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный ID сценария",
				});
			}

			const body = toggleWorkflowSchema.safeParse(request.body);
			if (!body.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Ожидается { active: boolean }",
				});
			}

			const [updated] = await db
				.update(clinicWorkflows)
				.set({ active: body.data.active, updatedAt: new Date() })
				.where(
					and(
						eq(clinicWorkflows.id, params.data.id),
						eq(clinicWorkflows.organizationId, context.organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply
					.status(404)
					.send({ error: "NotFound", message: "Сценарий не найден" });
			}

			return reply.status(200).send({ workflow: serializeWorkflow(updated) });
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось обновить сценарий",
			});
		}
	});

	/**
	 * DELETE /api/clinic/workflows/:id — удалить сценарий.
	 */
	app.delete("/api/clinic/workflows/:id", async (request, reply) => {
		try {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"workflows mutate",
			);
			if (!context) return;

			const params = workflowIdParamsSchema.safeParse(request.params);
			if (!params.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный ID сценария",
				});
			}

			const [deleted] = await db
				.delete(clinicWorkflows)
				.where(
					and(
						eq(clinicWorkflows.id, params.data.id),
						eq(clinicWorkflows.organizationId, context.organizationId),
					),
				)
				.returning({ id: clinicWorkflows.id });

			if (!deleted) {
				return reply
					.status(404)
					.send({ error: "NotFound", message: "Сценарий не найден" });
			}

			return reply.status(200).send({ deleted: true });
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось удалить сценарий",
			});
		}
	});
}
