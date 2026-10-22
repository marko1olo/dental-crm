import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { broadcastCampaignSchema } from "../types.js";
import { processBroadcastCampaign } from "./campaignBroadcastProcessor.js";

export function registerCampaignBroadcastHandlers(app: FastifyInstance): void {
	app.post("/api/communications/campaigns/broadcast", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communications broadcast campaign",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications broadcast campaign",
		);
		if (!organizationId) return;

		const parsed = broadcastCampaignSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сервисной рассылки.",
				details: parsed.error.issues,
			});
		}

		const result = await processBroadcastCampaign(organizationId, parsed.data);
		if ("error" in result) {
			return reply.code(result.error === "TemplateNotFound" ? 400 : 422).send(result);
		}

		return reply.send(result);
	});
}
