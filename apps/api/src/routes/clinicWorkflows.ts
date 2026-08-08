import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { clinicWorkflows } from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

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

export async function registerClinicWorkflowRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinic/workflows — список сценариев автоматизации клиники.
	 * Изолирован по organizationId — обязательное условие для медданных.
	 */
	app.get("/api/clinic/workflows", async (request, reply) => {
		try {
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			const rows = await db
				.select()
				.from(clinicWorkflows)
				.where(eq(clinicWorkflows.organizationId, organizationId))
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
	 */
	app.post("/api/clinic/workflows", async (request, reply) => {
		try {
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

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
					organizationId,
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
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

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
						eq(clinicWorkflows.organizationId, organizationId),
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
	 * Hard-delete: запись не архивируется, данные не критичны для аудита.
	 */
	app.delete("/api/clinic/workflows/:id", async (request, reply) => {
		try {
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

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
						eq(clinicWorkflows.organizationId, organizationId),
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
