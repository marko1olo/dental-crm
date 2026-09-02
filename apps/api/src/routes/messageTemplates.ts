import {
	createMessageTemplateSchema,
	renderMessageTemplateInputSchema,
	updateMessageTemplateSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import {
	createMessageTemplate,
	deleteMessageTemplate,
	ensureDefaultMessageTemplatesSeeded,
	getMessageTemplateById,
	getMessageTemplates,
	renderMessageTemplate,
	updateMessageTemplate,
} from "../services/communications/messageTemplateService.js";

const templateQuerySchema = z.object({
	channel: z.string().optional(),
	scenario: z.string().optional(),
	intent: z.string().optional(),
	isActive: z
		.enum(["true", "false"])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),
});

export async function registerMessageTemplateRoutes(app: FastifyInstance) {
	/**
	 * GET /api/v1/message-templates
	 * Retrieves list of message templates filtered by channel and scenario.
	 */
	app.get("/api/v1/message-templates", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"read message templates",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const query = templateQuerySchema.safeParse(request.query);
		const filter = query.success ? query.data : {};

		const templates = await getMessageTemplates(orgId, filter);
		return reply.send({
			success: true,
			data: templates,
			total: templates.length,
		});
	});

	/**
	 * Backward compatibility GET /api/settings/message-templates
	 */
	app.get("/api/settings/message-templates", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const query = templateQuerySchema.safeParse(request.query);
		const filter = query.success ? query.data : {};

		const templates = await getMessageTemplates(orgId, filter);
		return reply.send(templates);
	});

	/**
	 * GET /api/v1/message-templates/:id
	 * Retrieves a single template by ID.
	 */
	app.get("/api/v1/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"read message template by id",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const template = await getMessageTemplateById(orgId, id);

		if (!template) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Шаблон сообщения не найден в вашей клинике",
			});
		}

		return reply.send({ success: true, data: template });
	});

	/**
	 * POST /api/v1/message-templates
	 * Creates a new message template with dynamic tags.
	 */
	app.post("/api/v1/message-templates", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"create message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsedInput = createMessageTemplateSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры шаблона",
				details: parsedInput.error.errors,
			});
		}

		const template = await createMessageTemplate(orgId, parsedInput.data);
		return reply.code(201).send({ success: true, data: template });
	});

	/**
	 * Backward compatibility POST /api/settings/message-templates
	 */
	app.post("/api/settings/message-templates", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"create message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsedInput = createMessageTemplateSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				details: parsedInput.error.errors,
			});
		}

		const template = await createMessageTemplate(orgId, parsedInput.data);
		return reply.send(template);
	});

	/**
	 * PUT /api/v1/message-templates/:id
	 * Updates an existing template.
	 */
	app.put("/api/v1/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"update message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const parsedInput = updateMessageTemplateSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры обновления шаблона",
				details: parsedInput.error.errors,
			});
		}

		try {
			const template = await updateMessageTemplate(
				orgId,
				id,
				parsedInput.data,
			);
			return reply.send({ success: true, data: template });
		} catch (error) {
			return reply.code(404).send({
				error: "NotFound",
				message:
					error instanceof Error
						? error.message
						: "Шаблон сообщения не найден",
			});
		}
	});

	/**
	 * Backward compatibility PUT /api/settings/message-templates/:id
	 */
	app.put("/api/settings/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"update message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const parsedInput = updateMessageTemplateSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				details: parsedInput.error.errors,
			});
		}

		try {
			const template = await updateMessageTemplate(
				orgId,
				id,
				parsedInput.data,
			);
			return reply.send(template);
		} catch (_error) {
			return reply.code(404).send({ error: "NotFound" });
		}
	});

	/**
	 * DELETE /api/v1/message-templates/:id
	 * Deletes a message template.
	 */
	app.delete("/api/v1/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"delete message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		try {
			await deleteMessageTemplate(orgId, id);
			return reply.send({ success: true });
		} catch (error) {
			return reply.code(404).send({
				error: "NotFound",
				message:
					error instanceof Error
						? error.message
						: "Шаблон сообщения не найден",
			});
		}
	});

	/**
	 * Backward compatibility DELETE /api/settings/message-templates/:id
	 */
	app.delete("/api/settings/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"delete message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		try {
			await deleteMessageTemplate(orgId, id);
			return reply.send({ success: true });
		} catch (_error) {
			return reply.code(404).send({ error: "NotFound" });
		}
	});

	/**
	 * POST /api/v1/message-templates/render
	 * Renders template with dynamic macros for a patient or appointment.
	 */
	app.post("/api/v1/message-templates/render", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"render message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsedInput = renderMessageTemplateInputSchema.safeParse(
			request.body,
		);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для рендеринга шаблона",
				details: parsedInput.error.errors,
			});
		}

		const result = await renderMessageTemplate(orgId, parsedInput.data);
		return reply.send({ success: true, data: result });
	});

	/**
	 * POST /api/v1/message-templates/seed
	 * Seeds standard clinical templates if none exist.
	 */
	app.post("/api/v1/message-templates/seed", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"seed message templates",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const count = await ensureDefaultMessageTemplatesSeeded(orgId);
		const templates = await getMessageTemplates(orgId);
		return reply.send({ success: true, seededCount: count, total: templates.length });
	});
}

export default registerMessageTemplateRoutes;
