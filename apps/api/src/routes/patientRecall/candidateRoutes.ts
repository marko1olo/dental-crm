import type { FastifyInstance } from "fastify";
import { defineTenantQuery } from "../../core/routeFactories.js";
import {
	findRecallCandidates,
	type RecallOptions,
} from "../../services/patients/recallCandidates.js";
import { badRequest, listQuerySchema, type RecallReport } from "./types.js";

export function registerCandidateRoutes(app: FastifyInstance) {
	const routeSpec = {
		method: "GET" as const,
		permission: "patients.read" as const,
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		handler: async ({
			organizationId,
			request,
			reply,
		}: {
			organizationId: string;
			request: import("fastify").FastifyRequest;
			reply: import("fastify").FastifyReply;
		}) => {
			const parsed = listQuerySchema.safeParse(request.query);
			if (!parsed.success) {
				return badRequest(
					reply,
					"Проверьте параметры: срок в месяцах, полосу (band) и предел списка.",
				);
			}

			const options: RecallOptions = {
				...(parsed.data.minMonths !== undefined
					? { minMonths: parsed.data.minMonths }
					: {}),
				...(parsed.data.minDays !== undefined
					? { minDays: parsed.data.minDays }
					: {}),
				...(parsed.data.limit !== undefined
					? { limit: parsed.data.limit }
					: {}),
				...(parsed.data.includeNeverArrived !== undefined
					? { includeNeverArrived: parsed.data.includeNeverArrived }
					: {}),
				...(parsed.data.band !== undefined ? { band: parsed.data.band } : {}),
				...(parsed.data.filterBand !== undefined
					? { filterBand: parsed.data.filterBand }
					: {}),
			};

			const report: RecallReport = await findRecallCandidates(
				organizationId,
				options,
			);
			return reply.code(200).send(report);
		},
	};

	defineTenantQuery(app, {
		...routeSpec,
		path: "/api/patients/recall-candidates",
	});
	defineTenantQuery(app, {
		...routeSpec,
		path: "/api/recalls/candidates",
	});
}
