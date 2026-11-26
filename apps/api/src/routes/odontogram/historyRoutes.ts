import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { toothStateHistory } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { fetchToothHistoryTimeline } from "./toothHistoryTimeline.js";
import { UUID_SHAPE } from "./types.js";

interface ToothHistoryParams {
	patientId: string;
	toothNumber: string;
}

interface PatientHistoryParams {
	patientId: string;
}

export type { ToothHistoryTimelineEvent } from "./toothHistoryTimeline.js";
export {
	formatToothStateLabel,
	formatToothStateTransition,
	isToothReferenced,
} from "./toothHistoryTimeline.js";

export function registerHistoryRoutes(app: FastifyInstance) {
	/**
	 * Получение хронологии изменений конкретного зуба (аудит медицинской карты приёма)
	 */
	app.get<{ Params: ToothHistoryParams }>(
		"/api/patients/:patientId/tooth-states/:toothNumber/history",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth history read",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.history.read",
					role: staffRole,
					message: `Отказ в доступе к истории зуба (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothNumber: toothParam } = request.params;
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const rows = await withTenantCtx(organizationId, async (tx) =>
				tx
					.select({
						id: toothStateHistory.id,
						visitId: toothStateHistory.visitId,
						toothNumber: toothStateHistory.toothNumber,
						previousState: toothStateHistory.previousState,
						newState: toothStateHistory.newState,
						previousSurfaces: toothStateHistory.previousSurfaces,
						newSurfaces: toothStateHistory.newSurfaces,
						changedByUserId: toothStateHistory.changedByUserId,
						reason: toothStateHistory.reason,
						changedAt: toothStateHistory.changedAt,
					})
					.from(toothStateHistory)
					.where(
						and(
							eq(toothStateHistory.organizationId, organizationId),
							eq(toothStateHistory.patientId, patientId),
							eq(toothStateHistory.toothNumber, toothNumber),
						),
					)
					.orderBy(desc(toothStateHistory.changedAt)),
			);

			return reply.send({
				success: true,
				toothNumber,
				history: rows.map((r) => ({
					...r,
					changedAt: r.changedAt ? new Date(r.changedAt).toISOString() : null,
				})),
			});
		},
	);

	/**
	 * Получение полного таймлайна эволюции зубной формулы пациента
	 */
	app.get<{ Params: PatientHistoryParams }>(
		"/api/patients/:patientId/tooth-states/history",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"patient odontogram history read",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.history.read",
					role: staffRole,
					message: `Отказ в доступе к истории одонтограммы (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params;
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const rows = await withTenantCtx(organizationId, async (tx) =>
				tx
					.select({
						id: toothStateHistory.id,
						visitId: toothStateHistory.visitId,
						toothNumber: toothStateHistory.toothNumber,
						previousState: toothStateHistory.previousState,
						newState: toothStateHistory.newState,
						previousSurfaces: toothStateHistory.previousSurfaces,
						newSurfaces: toothStateHistory.newSurfaces,
						changedByUserId: toothStateHistory.changedByUserId,
						reason: toothStateHistory.reason,
						changedAt: toothStateHistory.changedAt,
					})
					.from(toothStateHistory)
					.where(
						and(
							eq(toothStateHistory.organizationId, organizationId),
							eq(toothStateHistory.patientId, patientId),
						),
					)
					.orderBy(desc(toothStateHistory.changedAt))
					.limit(500),
			);

			return reply.send({
				success: true,
				patientId,
				history: rows.map((r) => ({
					...r,
					changedAt: r.changedAt ? new Date(r.changedAt).toISOString() : null,
				})),
			});
		},
	);

	/**
	 * Получение полной хронологии зуба (дневники, снимки, планы, периодонтограмма, статусы)
	 */
	app.get<{ Params: { patientId: string; toothId: string } }>(
		"/api/odontogram/tooth-history/:patientId/:toothId",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"read tooth history",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.history.read",
					role: staffRole,
					message: `Отказ в доступе к истории зуба (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothId } = request.params;
			const toothNum = parseInt(toothId, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNum)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const events = await fetchToothHistoryTimeline(
				organizationId,
				patientId,
				toothNum,
				request.log,
			);
			return reply.send({ success: true, events });
		},
	);
}

export { registerHistoryRoutes as registerToothHistoryRoutes };
