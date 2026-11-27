import { and, eq, ilike, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { patientSearchQuerySchema } from "../types.js";

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
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/communications/patients/search",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications patients search",
			);
			if (!orgId) return;
			const queryParsed = patientSearchQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры поиска пациентов.",
				});
			}
			const q = queryParsed.data.q;
			if (!q || q.length < 2) return reply.send([]);

			const result = await withTenantReadCtx(orgId, (tx) =>
				tx
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
					.limit(20),
			);

			return reply.send(result);
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/communications/inbox",
		permission: "public",
		handler: async ({ request, reply }) => {
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

			const latestEvents = await withTenantReadCtx(orgId, (tx) =>
				tx.execute<RawInboxEventRow>(sql`
				WITH recent_threads AS (
					SELECT DISTINCT ON (COALESCE(e.patient_id::text, e.caller_phone, e.id::text))
						e.id,
						e.patient_id,
						e.caller_phone,
						e.message,
						e.channel,
						e.direction,
						e.status,
						e.created_at
					FROM communication_events e
					WHERE e.organization_id = ${orgId}
					ORDER BY COALESCE(e.patient_id::text, e.caller_phone, e.id::text), e.created_at DESC
					LIMIT 250
				)
				SELECT
					rt.id,
					rt.patient_id AS "patientId",
					rt.caller_phone AS "callerPhone",
					rt.message,
					rt.channel,
					rt.direction,
					rt.status,
					rt.created_at AS "createdAt",
					COALESCE(p.full_name, l.patient_name, l.name, rt.caller_phone, 'Новый контакт') AS "patientName",
					COALESCE(p.phone, l.phone, rt.caller_phone) AS "patientPhone"
				FROM recent_threads rt
				LEFT JOIN patients p ON rt.patient_id = p.id AND p.organization_id = ${orgId}
				LEFT JOIN LATERAL (
					SELECT l_inner.patient_name, l_inner.name, l_inner.phone
					FROM crm_leads l_inner
					WHERE l_inner.organization_id = ${orgId}
					  AND rt.caller_phone IS NOT NULL
					  AND l_inner.phone = rt.caller_phone
					ORDER BY l_inner.created_at DESC
					LIMIT 1
				) l ON TRUE
				ORDER BY rt.created_at DESC
				LIMIT 250
			`),
			);

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
		},
	});
}
