import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { clinicWorkflows } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";

const createWorkflowSchema = z.object({
	name: z.string().min(1).max(255),
	definition: z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())]),
	trigger: z.string().optional().nullable(),
	active: z.boolean().optional().default(false),
});

const toggleWorkflowBodySchema = z
	.object({
		active: z.boolean().optional(),
	})
	.optional();

const workflowParamsSchema = z.object({
	id: z.string().min(1),
});

function serializeWorkflow(wf: typeof clinicWorkflows.$inferSelect) {
	return {
		id: wf.id,
		organizationId: wf.organizationId,
		name: wf.name,
		trigger: wf.trigger,
		definition: wf.definition,
		active: wf.active,
		createdAt: wf.createdAt instanceof Date ? wf.createdAt.toISOString() : wf.createdAt,
		updatedAt: wf.updatedAt instanceof Date ? wf.updatedAt.toISOString() : wf.updatedAt,
	};
}

export async function registerClinicWorkflowsRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinic/workflows
	 * List workflows for organization (settings.read permission required).
	 */
	app.get("/api/clinic/workflows", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const perm = await requirePermission(request, reply, "settings.read");
		if (!perm) return;

		const rows = await db
			.select()
			.from(clinicWorkflows)
			.where(eq(clinicWorkflows.organizationId, organizationId))
			.orderBy(clinicWorkflows.createdAt);

		return reply.status(200).send({ workflows: rows.map(serializeWorkflow) });
	});

	/**
	 * POST /api/clinic/workflows
	 * Create workflow expecting body { name: string, definition: string | object, trigger?: string }
	 * (settings.write permission required, default trigger to "manual" if omitted/falsy).
	 */
	app.post("/api/clinic/workflows", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const perm = await requirePermission(request, reply, "settings.write");
		if (!perm) return;

		const parsed = createWorkflowSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.issues.map((i) => i.message).join("; "),
			});
		}

		const { name, definition, trigger: rawTrigger, active } = parsed.data;

		let parsedDefinition: unknown = definition;
		if (typeof definition === "string") {
			try {
				parsedDefinition = JSON.parse(definition);
			} catch {
				parsedDefinition = definition;
			}
		}

		const trigger = rawTrigger && rawTrigger.trim() ? rawTrigger.trim() : "manual";

		const [created] = await db
			.insert(clinicWorkflows)
			.values({
				organizationId,
				name,
				trigger,
				definition: parsedDefinition,
				active: active ?? false,
			})
			.returning();

		if (!created) {
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось создать сценарий автоматизации.",
			});
		}

		return reply.status(201).send({ workflow: serializeWorkflow(created) });
	});

	/**
	 * POST /api/clinic/workflows/:id/toggle
	 * Toggle active boolean field for workflow matching :id and organization
	 * (settings.write permission required).
	 */
	app.post("/api/clinic/workflows/:id/toggle", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const perm = await requirePermission(request, reply, "settings.write");
		if (!perm) return;

		const params = workflowParamsSchema.safeParse(request.params);
		if (!params.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный ID сценария.",
			});
		}

		const body = toggleWorkflowBodySchema.safeParse(request.body ?? {});
		const requestedActive = body.success ? body.data?.active : undefined;

		const [existing] = await db
			.select()
			.from(clinicWorkflows)
			.where(
				and(
					eq(clinicWorkflows.id, params.data.id),
					eq(clinicWorkflows.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!existing) {
			return reply.status(404).send({
				error: "WorkflowNotFound",
				message: "Сценарий автоматизации не найден.",
			});
		}

		const nextActive = typeof requestedActive === "boolean" ? requestedActive : !existing.active;

		const [updated] = await db
			.update(clinicWorkflows)
			.set({
				active: nextActive,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(clinicWorkflows.id, params.data.id),
					eq(clinicWorkflows.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated) {
			return reply.status(404).send({
				error: "WorkflowNotFound",
				message: "Сценарий автоматизации не найден.",
			});
		}

		return reply.status(200).send({ workflow: serializeWorkflow(updated) });
	});

	/**
	 * DELETE /api/clinic/workflows/:id
	 * Delete workflow matching :id and organization
	 * (settings.write permission required).
	 */
	app.delete("/api/clinic/workflows/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const perm = await requirePermission(request, reply, "settings.write");
		if (!perm) return;

		const params = workflowParamsSchema.safeParse(request.params);
		if (!params.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный ID сценария.",
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
			return reply.status(404).send({
				error: "WorkflowNotFound",
				message: "Сценарий автоматизации не найден.",
			});
		}

		return reply.status(200).send({ ok: true, deleted: true, id: deleted.id });
	});
}
