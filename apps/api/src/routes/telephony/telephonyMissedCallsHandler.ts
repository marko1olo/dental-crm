import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";

export async function handleListMissedCalls(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Querystring: { page?: number; limit?: number; onlyOpen?: boolean };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "list missed calls"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "list missed calls");
	if (!orgId) return;

	const limit = Math.min(100, Math.max(1, Math.floor(Number(request.query.limit) || 20)));
	const page = Math.max(1, Math.floor(Number(request.query.page) || 1));
	const offset = (page - 1) * limit;
	const onlyOpen = request.query.onlyOpen !== false;

	const missedCalls = await withTenantCtx(orgId, async () => {
		const conditions = [
			eq(communicationEvents.organizationId, orgId),
			eq(communicationEvents.channel, "phone"),
		];
		if (onlyOpen) conditions.push(eq(communicationEvents.status, "needs_call"));
		return db
			.select()
			.from(communicationEvents)
			.where(and(...conditions))
			.orderBy(desc(communicationEvents.createdAt))
			.limit(limit)
			.offset(offset);
	});

	return reply.status(200).send({ success: true, count: missedCalls.length, missedCalls });
}

export const telephonyMissedCallsHandler = handleListMissedCalls;

