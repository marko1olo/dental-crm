import {
	createMessageTemplateSchema,
	renderMessageTemplateInputSchema,
	updateMessageTemplateSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";
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
	 * POST /api/v1/message-templates & /api/settings/message-templates
	 * Creates a new message template with dynamic tags.
	 */
	const handleCreateTemplate = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"create message template",
		);
		if (!context) return;
		const { organizationId } = context;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsedInput = createMessageTemplateSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры шаблона",
				details: parsedInput.error.errors,
			});
		}

		const template = await createMessageTemplate(organizationId, parsedInput.data);
		if (request.url.startsWith("/api/settings/")) {
			return reply.code(201).send(template);
		}
		return reply.code(201).send({ success: true, data: template });
	};

	app.post("/api/v1/message-templates", handleCreateTemplate);
	app.post("/api/settings/message-templates", handleCreateTemplate);

	/**
	 * PUT /api/v1/message-templates/:id & /api/settings/message-templates/:id
	 * Updates an existing template.
	 */
	const handleUpdateTemplate = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"update message template",
		);
		if (!context) return;
		const { organizationId } = context;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

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
				organizationId,
				id,
				parsedInput.data,
			);
			if (request.url.startsWith("/api/settings/")) {
				return reply.send(template);
			}
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
	};

	app.put("/api/v1/message-templates/:id", handleUpdateTemplate);
	app.put("/api/settings/message-templates/:id", handleUpdateTemplate);

	/**
	 * DELETE /api/v1/message-templates/:id & /api/settings/message-templates/:id
	 * Deletes a message template.
	 */
	const handleDeleteTemplate = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"delete message template",
		);
		if (!context) return;
		const { organizationId } = context;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const { id } = request.params as { id: string };
		try {
			await deleteMessageTemplate(organizationId, id);
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
	};

	app.delete("/api/v1/message-templates/:id", handleDeleteTemplate);
	app.delete("/api/settings/message-templates/:id", handleDeleteTemplate);

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
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"seed message templates",
		);
		if (!context) return;
		const { organizationId } = context;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const count = await ensureDefaultMessageTemplatesSeeded(organizationId);
		const templates = await getMessageTemplates(organizationId);
		return reply.send({ success: true, seededCount: count, total: templates.length });
	});
}

export default registerMessageTemplateRoutes;
