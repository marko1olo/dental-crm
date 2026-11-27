import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantQuery } from "../../../core/routeFactories.js";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "../../payrollModules/payrollTypesAndQueries.js";
import { guaranteeLetterQuerySchema } from "../types.js";
import { formatGuaranteeLetterResponse, isValidUuid } from "./guaranteeLetterFormatters.js";

export function registerGuaranteeLetterQueryRoutes(app: FastifyInstance) {
	defineTenantQuery(app, {
		path: "/api/insurance/guarantee-letters",
		permission: "finance.read",
		authOptions: {
			allowClinicTokenWithoutStaff: false,
			allowAdminSecretBypass: true,
			allowUnverifiedHeaderRead: true,
		},
		query: async ({ tx, principal, request, reply }) => {
			const orgId = principal.organizationId;
			const parsedQuery = guaranteeLetterQuerySchema.safeParse(request.query);
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр patientId должен быть валидным UUID.",
					details: parsedQuery.error.issues,
				});
			}
			const { patientId, status, search } = parsedQuery.data;
			const conditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId)];

			if (patientId) {
				conditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
			}
			if (status) {
				conditions.push(eq(dmsGuaranteeLetters.status, status));
			}
			if (search && search.trim()) {
				const term = `%${search.trim().toLowerCase()}%`;
				const searchCondition = or(
					ilike(dmsGuaranteeLetters.letterNumber, term),
					ilike(dmsGuaranteeLetters.patientFullName, term),
					ilike(dmsGuaranteeLetters.insurerName, term),
					ilike(dmsGuaranteeLetters.policyNumber, term),
				);
				if (searchCondition) {
					conditions.push(searchCondition);
				}
			}

			const clinicTz = await resolveClinicTimeZone(tx, orgId);
			const letters = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(and(...conditions))
				.orderBy(dmsGuaranteeLetters.createdAt);

			const todayIso = formatDateIsoInTimeZone(new Date(), clinicTz);
			return letters.map((l) => formatGuaranteeLetterResponse(l, todayIso));
		},
	});

	defineTenantQuery(app, {
		path: "/api/insurance/guarantee-letters/:letterId",
		permission: "finance.read",
		authOptions: {
			allowClinicTokenWithoutStaff: false,
			allowAdminSecretBypass: true,
			allowUnverifiedHeaderRead: true,
		},
		query: async ({ tx, principal, request, reply }) => {
			const orgId = principal.organizationId;
			const { letterId } = request.params as { letterId: string };
			if (!isValidUuid(letterId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр letterId должен быть валидным UUID.",
				});
			}

			const [clinicTz, [letter]] = await Promise.all([
				resolveClinicTimeZone(tx, orgId),
				tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.limit(1),
			]);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const todayIso = formatDateIsoInTimeZone(new Date(), clinicTz);
			return formatGuaranteeLetterResponse(letter, todayIso);
		},
	});
}
