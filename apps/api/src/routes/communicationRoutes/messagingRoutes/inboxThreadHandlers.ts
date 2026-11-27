import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { communicationEvents, patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { patientIdParamSchema } from "../types.js";

export function registerInboxThreadHandlers(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/communications/inbox/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications inbox thread",
			);
			if (!orgId) return;
			const paramsParsed = patientIdParamSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента.",
				});
			}
			const { patientId } = paramsParsed.data;

			const identity = getRequestIdentity(request);
			if (identity.role === "marketer" || identity.role === "marketing") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "communications.inbox.read",
					role: identity.role,
					message:
						"Доступ к диалогу пациента для маркетологов ограничен 152-ФЗ и 323-ФЗ ст. 13.",
				});
			}

			const outcome = await withTenantReadCtx(orgId, async (tx) => {
				const [patient] = await tx
					.select({ id: patients.id, status: patients.status })
					.from(patients)
					.where(
						and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
					)
					.limit(1);

				if (!patient) {
					return {
						ok: false as const,
						status: 404 as const,
						body: {
							error: "PatientNotFound",
							message: "Пациент не найден в этой клинике.",
						},
					};
				}

				if (patient.status === "archived") {
					const staffRole = identity.role ?? request.user?.role ?? null;
					const evalAccess = evaluateClinicalAccess(staffRole);
					if (!evalAccess.hasClinicalAccess) {
						return {
							ok: false as const,
							status: 403 as const,
							body: {
								error: "PermissionDenied",
								permission: "patients.archived.communications",
								role: staffRole,
								message:
									"Отказ в доступе к сообщениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): переписка списанного в архив пациента защищена.",
							},
						};
					}
				}

				const eventsDesc = await tx
					.select({
						id: communicationEvents.id,
						patientId: communicationEvents.patientId,
						message: communicationEvents.message,
						channel: communicationEvents.channel,
						direction: communicationEvents.direction,
						status: communicationEvents.status,
						createdAt: communicationEvents.createdAt,
						patientName: patients.fullName,
					})
					.from(communicationEvents)
					.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
					.where(
						and(
							eq(communicationEvents.organizationId, orgId),
							eq(patients.organizationId, orgId),
							eq(communicationEvents.patientId, patientId),
						),
					)
					.orderBy(desc(communicationEvents.createdAt))
					.limit(200);

				return { ok: true as const, events: eventsDesc.reverse() };
			});

			if (!outcome.ok) {
				return reply.code(outcome.status).send(outcome.body);
			}

			return reply.send(
				outcome.events.map((e) => ({
					id: e.id,
					patientId: e.patientId,
					message: e.message,
					channel: e.channel,
					direction: e.direction,
					status: e.status ?? "delivered",
					createdAt: e.createdAt,
					patientName: e.patientName,
					readAt: e.createdAt,
				})),
			);
		},
	});
}
