import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
import { renderTemplateRouteSchema } from "../types.js";

export function registerTemplateRenderHandlers(app: FastifyInstance): void {
	app.post("/api/communications/templates/render", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"render communication template",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"render communication template",
		);
		if (!organizationId) return;

		const parsed = renderTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для рендеринга шаблона.",
				details: parsed.error.format(),
			});
		}

		const result = await MessageTemplateEngine.render(organizationId, {
			templateId: parsed.data.templateId ?? undefined,
			templateText: parsed.data.templateText ?? undefined,
			channel: parsed.data.channel,
			patientId: parsed.data.patientId ?? undefined,
			appointmentId: parsed.data.appointmentId ?? undefined,
			visitId: parsed.data.visitId ?? undefined,
			variables: parsed.data.variables ?? undefined,
			allowPreviewFallback: parsed.data.allowPreviewFallback,
			violationHandling: parsed.data.violationHandling,
		});

		if (
			result.hasMedicalSecrecyViolation &&
			parsed.data.violationHandling === "block"
		) {
			return reply.code(422).send({
				error: "MedicalSecrecyViolation",
				message: result.error,
				result,
			});
		}

		return reply.send({
			success: true,
			result,
		});
	});
}
