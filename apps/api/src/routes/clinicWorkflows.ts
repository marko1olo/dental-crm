import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import { clinicWorkflows } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";

const createWorkflowSchema = z
	.object({
		name: z.string().min(1).max(255),
		definition: z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())]),
		trigger: z.string().optional().nullable(),
		active: z.boolean().optional().default(false),
	})
	.strict();

const toggleWorkflowBodySchema = z
	.object({
		active: z.boolean().optional(),
	})
	.strict()
	.optional();

const workflowParamsSchema = z.object({
	id: z.string().uuid(),
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
	const workflowMutationOptions = {
		schema: {
			description: "Clinic workflow mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	} as const;

	/**
	 * GET /api/clinic/workflows
	 * List workflows for organization (settings.read permission required).
	 */
	app.get("/api/clinic/workflows", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const perm = await requirePermission(request, reply, "settings.read");
		if (!perm) return;

		const rows = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select()
				.from(clinicWorkflows)
				.where(eq(clinicWorkflows.organizationId, organizationId))
				.orderBy(clinicWorkflows.createdAt),
		);

		return reply.status(200).send({ workflows: rows.map(serializeWorkflow) });
	});

	/**
	 * POST /api/clinic/workflows
	 * Create workflow expecting body { name: string, definition: string | object, trigger?: string }
	 * (settings.write permission required, default trigger to "manual" if omitted/falsy).
	 */
	app.post("/api/clinic/workflows", workflowMutationOptions, async (request: FastifyRequest, reply: FastifyReply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

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

		const [created] = await withTenantCtx(organizationId, async (tx) =>
			tx
				.insert(clinicWorkflows)
				.values({
					organizationId,
					name,
					trigger,
					definition: parsedDefinition,
					active: active ?? false,
				})
				.returning(),
		);

		if (!created) {
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось создать сценарий автоматизации.",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.status(201).send({ workflow: serializeWorkflow(created) });
	});

	/**
	 * POST /api/clinic/workflows/:id/toggle
	 * Toggle active boolean field for workflow matching :id and organization
	 * (settings.write permission required).
	 */
	app.post("/api/clinic/workflows/:id/toggle", workflowMutationOptions, async (request: FastifyRequest, reply: FastifyReply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

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
		if (!body.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры переключения сценария.",
				details: body.error.format(),
			});
		}
		const requestedActive = body.data?.active;

		const toggleResult = await withTenantCtx(organizationId, async (tx) => {
			const [existing] = await tx
				.select()
				.from(clinicWorkflows)
				.where(
					and(
						eq(clinicWorkflows.id, params.data.id),
						eq(clinicWorkflows.organizationId, organizationId),
					),
				)
				.for("update")
				.limit(1);

			if (!existing) {
				return { kind: "not_found" as const };
			}

			const nextActive = typeof requestedActive === "boolean" ? requestedActive : !existing.active;

			const [updated] = await tx
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
				return { kind: "not_found" as const };
			}

			return { kind: "ok" as const, workflow: updated };
		});

		if (toggleResult.kind === "not_found") {
			return reply.status(404).send({
				error: "WorkflowNotFound",
				message: "Сценарий автоматизации не найден.",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.status(200).send({ workflow: serializeWorkflow(toggleResult.workflow) });
	});

	/**
	 * DELETE /api/clinic/workflows/:id
	 * Delete workflow matching :id and organization
	 * (settings.write permission required).
	 */
	app.delete("/api/clinic/workflows/:id", workflowMutationOptions, async (request: FastifyRequest, reply: FastifyReply) => {
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

		const [deleted] = await withTenantCtx(organizationId, async (tx) =>
			tx
				.delete(clinicWorkflows)
				.where(
					and(
						eq(clinicWorkflows.id, params.data.id),
						eq(clinicWorkflows.organizationId, organizationId),
					),
				)
				.returning({ id: clinicWorkflows.id }),
		);

		if (!deleted) {
			return reply.status(404).send({
				error: "WorkflowNotFound",
				message: "Сценарий автоматизации не найден.",
			});
		}

		return reply.status(200).send({ ok: true, deleted: true, id: deleted.id });
	});
}
