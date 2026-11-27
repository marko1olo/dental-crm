import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
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
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/:patientId/tooth-states/:toothNumber/history",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth history read",
			);
			if (!organizationId) return reply;

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

			const rawParams = request.params;
			const patientId =
				typeof rawParams === "object" && rawParams !== null && "patientId" in rawParams && typeof rawParams.patientId === "string"
					? rawParams.patientId
					: "";
			const toothParam =
				typeof rawParams === "object" && rawParams !== null && "toothNumber" in rawParams && typeof rawParams.toothNumber === "string"
					? rawParams.toothNumber
					: "";
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}

			const rows = await withTenantReadCtx(organizationId, async (tx) => {
				if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
					return null;
				}
				return tx
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
					.orderBy(desc(toothStateHistory.changedAt));
			});
			if (!rows) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			return reply.send({
				success: true,
				toothNumber,
				history: rows.map((r) => ({
					...r,
					changedAt: r.changedAt ? new Date(r.changedAt).toISOString() : null,
				})),
			});
		},
	});

	/**
	 * Получение полного таймлайна эволюции зубной формулы пациента
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/:patientId/tooth-states/history",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"patient odontogram history read",
			);
			if (!organizationId) return reply;

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

			const rawParams = request.params;
			const patientId =
				typeof rawParams === "object" && rawParams !== null && "patientId" in rawParams && typeof rawParams.patientId === "string"
					? rawParams.patientId
					: "";
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}

			const rows = await withTenantReadCtx(organizationId, async (tx) => {
				if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
					return null;
				}
				return tx
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
					.limit(500);
			});
			if (!rows) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			return reply.send({
				success: true,
				patientId,
				history: rows.map((r) => ({
					...r,
					changedAt: r.changedAt ? new Date(r.changedAt).toISOString() : null,
				})),
			});
		},
	});

	/**
	 * Получение полной хронологии зуба (дневники, снимки, планы, периодонтограмма, статусы)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/odontogram/tooth-history/:patientId/:toothId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"read tooth history",
			);
			if (!organizationId) return reply;

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

			const rawParams = request.params;
			const patientId =
				typeof rawParams === "object" && rawParams !== null && "patientId" in rawParams && typeof rawParams.patientId === "string"
					? rawParams.patientId
					: "";
			const toothId =
				typeof rawParams === "object" && rawParams !== null && "toothId" in rawParams && typeof rawParams.toothId === "string"
					? rawParams.toothId
					: "";
			const toothNum = parseInt(toothId, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNum)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}

			const events = await withTenantReadCtx(organizationId, async (tx) => {
				if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
					return null;
				}
				return fetchToothHistoryTimeline(
					organizationId,
					patientId,
					toothNum,
					request.log,
					tx,
				);
			});
			if (!events) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}
			return reply.send({ success: true, events });
		},
	});
}

export { registerHistoryRoutes as registerToothHistoryRoutes };
