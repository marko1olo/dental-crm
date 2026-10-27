import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	findRecallCandidates,
	type RecallOptions,
} from "../../services/patients/recallCandidates.js";
import { badRequest, listQuerySchema, type RecallReport } from "./types.js";

export function registerCandidateRoutes(app: FastifyInstance) {
	const handler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"recall candidates",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "patients.read"))
			return;

		const parsed = listQuerySchema.safeParse(request.query);
		if (!parsed.success)
			return badRequest(
				reply,
				"Проверьте параметры: срок в месяцах, полосу (band) и предел списка.",
			);

		const options: RecallOptions = {
			...(parsed.data.minMonths !== undefined ? { minMonths: parsed.data.minMonths } : {}),
			...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
			...(parsed.data.includeNeverArrived !== undefined ? { includeNeverArrived: parsed.data.includeNeverArrived } : {}),
			...(parsed.data.band !== undefined ? { band: parsed.data.band } : {}),
			...(parsed.data.filterBand !== undefined ? { filterBand: parsed.data.filterBand } : {}),
		};

		const report: RecallReport = await findRecallCandidates(
			context.organizationId,
			options,
		);
		return reply.code(200).send(report);
	};

	app.get("/api/patients/recall-candidates", handler);
	app.get("/api/recalls/candidates", handler);
}
