import { and, eq, ilike, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";

const patientSearchQuerySchema = z.object({
	q: z.string().optional(),
});

interface RawInboxEventRow extends Record<string, unknown> {
	id: string;
	patientId: string | null;
	callerPhone: string | null;
	message: string;
	channel: string;
	direction: string;
	status: string | null;
	createdAt: string | Date;
	patientName: string;
	patientPhone: string | null;
}

export function registerInboxOverviewHandlers(app: FastifyInstance): void {
	app.get("/api/communications/patients/search", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications patients search",
		);
		if (!orgId) return;
		const queryParsed = patientSearchQuerySchema.safeParse(request.query ?? {});
		const q = queryParsed.success ? queryParsed.data.q : undefined;
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

		const latestEvents = await db.execute<RawInboxEventRow>(sql`
			SELECT DISTINCT ON (COALESCE(e.patient_id::text, e.caller_phone, e.id::text))
				e.id,
				e.patient_id AS "patientId",
				e.caller_phone AS "callerPhone",
				e.message,
				e.channel,
				e.direction,
				e.status,
				e.created_at AS "createdAt",
				COALESCE(p.full_name, l.patient_name, l.name, e.caller_phone, 'Новый контакт') AS "patientName",
				COALESCE(p.phone, l.phone, e.caller_phone) AS "patientPhone"
			FROM communication_events e
			LEFT JOIN patients p ON e.patient_id = p.id AND p.organization_id = ${orgId}
			LEFT JOIN crm_leads l ON (e.caller_phone = l.phone OR (e.caller_phone IS NOT NULL AND l.phone IS NOT NULL AND RIGHT(regexp_replace(l.phone, '[^0-9]', '', 'g'), 10) = RIGHT(regexp_replace(e.caller_phone, '[^0-9]', '', 'g'), 10))) AND l.organization_id = ${orgId}
			WHERE e.organization_id = ${orgId}
			ORDER BY COALESCE(e.patient_id::text, e.caller_phone, e.id::text), e.created_at DESC
		`);

		const rawRows = latestEvents.rows;
		const summaries = rawRows.map((row) => {
			const isUnread =
				row.direction === "inbound" &&
				(row.status === "needs_call" || row.status === "failed" || row.status === "queued");
			return {
				id: row.id,
				patientId: row.patientId ?? null,
				callerPhone: row.callerPhone ?? null,
				message: row.message,
				channel: row.channel,
				direction: row.direction,
				status: row.status ?? "delivered",
				createdAt: row.createdAt,
				readAt: isUnread ? null : row.createdAt,
				patientName: row.patientName,
				patientPhone: row.patientPhone,
				unreadCount: isUnread ? 1 : 0,
			};
		});
		summaries.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		return reply.send(summaries);
	});
}
