import { and, eq, ilike, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";

export function registerInboxOverviewHandlers(app: FastifyInstance): void {
	app.get("/api/communications/patients/search", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications patients search",
		);
		if (!orgId) return;
		const { q } = request.query as { q?: string };
		if (!q || q.length < 2) return reply.send([]);

		const result = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					ilike(patients.fullName, `%${q}%`),
				),
			)
			.limit(20);

		return reply.send(result);
	});

	app.get("/api/communications/inbox", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications inbox",
		);
		if (!orgId) return reply;

		const identity = getRequestIdentity(request);
		if (identity.role === "marketer" || identity.role === "marketing") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "communications.inbox.read",
				role: identity.role,
				message:
					"Доступ к личным сообщениям пациентов для маркетологов ограничен 152-ФЗ и 323-ФЗ ст. 13.",
			});
		}

		const latestEvents = await db.execute(sql`
			SELECT DISTINCT ON (e.patient_id)
				e.id,
				e.patient_id AS "patientId",
				e.message,
				e.channel,
				e.direction,
				e.status,
				e.created_at AS "createdAt",
				p.full_name AS "patientName",
				p.phone AS "patientPhone"
			FROM communication_events e
			JOIN patients p ON e.patient_id = p.id
			WHERE p.organization_id = ${orgId}
			ORDER BY e.patient_id, e.created_at DESC
		`);

		const summaries = latestEvents.rows.map((row: any) => ({
			id: row.id,
			patientId: row.patientId,
			message: row.message,
			channel: row.channel,
			direction: row.direction,
			status: row.status ?? "delivered",
			createdAt: row.createdAt,
			readAt: row.createdAt,
			patientName: row.patientName,
			patientPhone: row.patientPhone,
			unreadCount: 0,
		}));
		summaries.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		return reply.send(summaries);
	});
}
