import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
import {
	createTemplateRouteSchema,
	templateListQuerySchema,
} from "../types.js";

export function registerTemplateCatalogHandlers(app: FastifyInstance): void {
	app.get("/api/communications/catalogs/templates", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"list communication templates",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"list communication templates",
		);
		if (!organizationId) return;

		const queryParsed = templateListQuerySchema.safeParse(request.query ?? {});
		const query = queryParsed.success ? queryParsed.data : {};
		const isActive =
			query.isActive === "true"
				? true
				: query.isActive === "false"
					? false
					: undefined;

		const templates = await MessageTemplateEngine.listTemplates(
			organizationId,
			{
				channel: query.channel ?? undefined,
				intent: query.intent ?? undefined,
				isActive,
			},
		);

		return reply.send({
			success: true,
			templates,
		});
	});

	app.post("/api/communications/catalogs/templates", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"create communication template",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"create communication template",
		);
		if (!organizationId) return;

		const parsed = createTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры шаблона сообщения.",
				details: parsed.error.format(),
			});
		}

		try {
			const template = await MessageTemplateEngine.createTemplate(
				organizationId,
				{
					title: parsed.data.title,
					channel: parsed.data.channel,
					intent: parsed.data.intent,
					templateText: parsed.data.templateText,
					variables: parsed.data.variables ?? undefined,
					isActive: parsed.data.isActive,
				},
			);
			return reply.code(201).send({
				success: true,
				template,
			});
		} catch (err: any) {
			return reply.code(422).send({
				error: "MedicalSecrecyInTemplateError",
				message: err.message || "Ошибка создания шаблона сообщения",
			});
		}
	});
}
