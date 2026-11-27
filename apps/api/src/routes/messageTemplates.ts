import {
	createMessageTemplateSchema,
	renderMessageTemplateInputSchema,
	updateMessageTemplateSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import {
	MessageTemplateSecrecyError,
	createMessageTemplate,
	deleteMessageTemplate,
	getMessageTemplateById,
	getMessageTemplates,
	renderMessageTemplate,
	updateMessageTemplate,
} from "../services/communications/messageTemplateService.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";

const templateQuerySchema = z
	.object({
		channel: z.string().optional(),
		scenario: z.string().optional(),
		intent: z.string().optional(),
		isActive: z
			.enum(["true", "false"])
			.optional()
			.transform((v) => (v === undefined ? undefined : v === "true")),
	})
	.strict();

const templateIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export async function registerMessageTemplateRoutes(app: FastifyInstance) {
	const selfManagedRouteOpts = { config: { tenantTxSelfManaged: true } } as const;

	app.get("/api/v1/message-templates", selfManagedRouteOpts, async (request, reply) => {
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

		const query = templateQuerySchema.safeParse(request.query ?? {});
		if (!query.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтра шаблонов.",
			});
		}

		const templates = await getMessageTemplates(orgId, query.data);
		return reply.send({
			success: true,
			data: templates,
			total: templates.length,
		});
	});

	app.get("/api/settings/message-templates", selfManagedRouteOpts, async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const query = templateQuerySchema.safeParse(request.query ?? {});
		if (!query.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтра шаблонов.",
			});
		}

		const templates = await getMessageTemplates(orgId, query.data);
		return reply.send(templates);
	});

	app.get("/api/v1/message-templates/:id", selfManagedRouteOpts, async (request, reply) => {
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

		const paramsParsed = templateIdParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор шаблона сообщения должен быть валидным UUID.",
			});
		}
		const template = await getMessageTemplateById(orgId, paramsParsed.data.id);

		if (!template) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Шаблон сообщения не найден в вашей клинике",
			});
		}

		return reply.send({ success: true, data: template });
	});

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
				message:
					"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
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

		try {
			const template = await createMessageTemplate(
				organizationId,
				parsedInput.data,
			);
			if (request.url.startsWith("/api/settings/")) {
				return reply.code(201).send(template);
			}
			return reply.code(201).send({ success: true, data: template });
		} catch (error) {
			if (error instanceof MessageTemplateSecrecyError) {
				return reply.code(422).send({
					error: "MedicalSecrecyViolation",
					message: error.message,
					detectedTerms: error.detectedTerms,
				});
			}
			throw error;
		}
	};

	app.post("/api/v1/message-templates", selfManagedRouteOpts, handleCreateTemplate);
	app.post("/api/settings/message-templates", selfManagedRouteOpts, handleCreateTemplate);

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
				message:
					"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const paramsParsed = templateIdParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор шаблона сообщения должен быть валидным UUID.",
			});
		}
		const { id } = paramsParsed.data;

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
			if (error instanceof MessageTemplateSecrecyError) {
				return reply.code(422).send({
					error: "MedicalSecrecyViolation",
					message: error.message,
					detectedTerms: error.detectedTerms,
				});
			}
			return reply.code(404).send({
				error: "NotFound",
				message:
					error instanceof Error
						? error.message
						: "Шаблон сообщения не найден",
			});
		}
	};

	app.put("/api/v1/message-templates/:id", selfManagedRouteOpts, handleUpdateTemplate);
	app.put("/api/settings/message-templates/:id", selfManagedRouteOpts, handleUpdateTemplate);

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
				message:
					"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const paramsParsed = templateIdParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор шаблона сообщения должен быть валидным UUID.",
			});
		}

		try {
			await deleteMessageTemplate(organizationId, paramsParsed.data.id);
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

	app.delete("/api/v1/message-templates/:id", selfManagedRouteOpts, handleDeleteTemplate);
	app.delete("/api/settings/message-templates/:id", selfManagedRouteOpts, handleDeleteTemplate);

	app.post("/api/v1/message-templates/render", selfManagedRouteOpts, async (request, reply) => {
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
}

export default registerMessageTemplateRoutes;
