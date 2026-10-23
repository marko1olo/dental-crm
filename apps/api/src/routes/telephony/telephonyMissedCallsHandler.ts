import { and, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";

export async function handleListMissedCalls(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Querystring: { limit?: string; offset?: string };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "list missed calls"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "list missed calls");
	if (!orgId) return;

	const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit || "20", 10)));
	const offset = Math.max(0, Number.parseInt(request.query.offset || "0", 10));

	const missedCalls = await withTenantCtx(orgId, async () => {
		return db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.channel, "phone"),
					eq(communicationEvents.status, "needs_call"),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(limit)
			.offset(offset);
	});

	return reply.status(200).send({ success: true, count: missedCalls.length, missedCalls });
}

export const telephonyMissedCallsHandler = handleListMissedCalls;

export const telephonyMissedCallsRoutes: FastifyPluginAsync = async (server) => {
	server.get<{ Params: { organizationId: string }; Querystring: { limit?: string; offset?: string } }>(
		"/:organizationId/missed-calls",
		handleListMissedCalls,
	);
	server.get<{ Params: { organizationId?: string }; Querystring: { limit?: string; offset?: string } }>(
		"/missed-calls",
		handleListMissedCalls,
	);
};

