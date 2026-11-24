import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import { guaranteeLetterQuerySchema } from "../types.js";
import { formatGuaranteeLetterResponse, isValidUuid } from "./guaranteeLetterFormatters.js";

export async function handleListGuaranteeLetters(
	request: FastifyRequest<{
		Querystring: {
			patientId?: string;
			status?: string;
			search?: string;
		};
	}>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"insurance guarantee letters read",
	);
	if (!orgId) return;

	const parsedQuery = guaranteeLetterQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр patientId должен быть валидным UUID.",
			details: parsedQuery.error.issues,
		});
	}
	const { patientId, status, search } = parsedQuery.data;
	const conditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId as string)];

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

	const letters = await withTenantCtx(orgId as string, (tx) =>
		tx
			.select()
			.from(dmsGuaranteeLetters)
			.where(and(...conditions))
			.orderBy(dmsGuaranteeLetters.createdAt),
	);

	const todayIso = new Date().toISOString().slice(0, 10);
	const formatted = letters.map((l) => formatGuaranteeLetterResponse(l, todayIso));

	return reply.code(200).send(formatted);
}

export async function handleGetGuaranteeLetterById(
	request: FastifyRequest<{ Params: { letterId: string } }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"insurance guarantee letter read",
	);
	if (!orgId) return;

	const { letterId } = request.params;
	if (!isValidUuid(letterId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр letterId должен быть валидным UUID.",
		});
	}

	const [letter] = await withTenantCtx(orgId, (tx) =>
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
	);

	if (!letter) {
		return reply.code(404).send({
			error: "LetterNotFound",
			message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
		});
	}

	const todayIso = new Date().toISOString().slice(0, 10);
	return reply.code(200).send(formatGuaranteeLetterResponse(letter, todayIso));
}

export function registerGuaranteeLetterQueryRoutes(app: FastifyInstance) {
	app.get<{
		Querystring: {
			patientId?: string;
			status?: string;
			search?: string;
		};
	}>("/api/insurance/guarantee-letters", handleListGuaranteeLetters);

	app.get<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		handleGetGuaranteeLetterById,
	);
}
