import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { communicationEvents, patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";

export function registerInboxThreadHandlers(app: FastifyInstance): void {
	app.get("/api/communications/inbox/:patientId", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications inbox thread",
		);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

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

		const [patient] = await db
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		if (patient.status === "archived") {
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.communications",
					role: staffRole,
					message:
						"Отказ в доступе к сообщениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): переписка списанного в архив пациента защищена.",
				});
			}
		}

		const events = await db
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
					eq(patients.organizationId, orgId),
					eq(communicationEvents.patientId, patientId),
				),
			)
			.orderBy(asc(communicationEvents.createdAt));

		return reply.send(
			events.map((e) => ({
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
	});
}
