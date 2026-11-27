import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	getRequestIdentity,
	requireOrganizationId,
	requireStaffIdentity,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { recentPatientViewBodySchema } from "./types.js";

const catalog804nQuerySchema = z
	.object({
		q: z.string().optional(),
		category: z.string().optional(),
	})
	.strict();

const icd10QuerySchema = z
	.object({
		q: z.string().optional(),
		group: z.string().optional(),
	})
	.strict();

/**
 * Diagnostic, statutory classification, and patient history route handlers.
 * (Order 804n, ICD-10 nomenclature, recent patient cards, and lost patient analytics).
 */
export async function registerClinicalDiagnosisRoutes(app: FastifyInstance) {
	// STATUTORY CLINICAL CATALOGS (Order 804n, ICD-10, 1-Click EMR Protocols)
	const handleGet804nCatalog = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsedQuery = catalog804nQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса справочника 804н.",
			});
		}
		const query = parsedQuery.data;
		const { getStatutory804nCatalog } = await import(
			"../../services/clinical/statutoryCatalogs.js"
		);
		const items = getStatutory804nCatalog({
			...(query.q ? { q: query.q } : {}),
			...(query.category ? { category: query.category } : {}),
		});
		return reply.status(200).send(items);
	};

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/804n",
		permission: "public",
		handler: async ({ request, reply }) => handleGet804nCatalog(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/nomenclature",
		permission: "public",
		handler: async ({ request, reply }) => handleGet804nCatalog(request, reply),
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/icd10",
		permission: "public",
		handler: async ({ request, reply }) => {
			const parsedQuery = icd10QuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса справочника МКБ-10.",
				});
			}
			const query = parsedQuery.data;
			const { getStatutoryIcd10Catalog } = await import(
				"../../services/clinical/statutoryCatalogs.js"
			);
			const items = getStatutoryIcd10Catalog({
				...(query.q ? { q: query.q } : {}),
				...(query.group ? { group: query.group } : {}),
			});
			return reply.status(200).send(items);
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/hr/recent-patients",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const identity = await requireStaffIdentity(request, reply);
				if (!identity) return reply;
				if (!identity.organizationId || !identity.userId) {
					return reply.status(401).send({
						error: "Unauthorized",
						message: "Не удалось определить организацию или идентификатор сотрудника.",
					});
				}
				const orgId = identity.organizationId;
				const userId = identity.userId;
				const { getRecentPatientHistoryFromDb } = await import(
					"../../db/recentPatientHistoryQuery.js"
				);
				const rows = await withTenantReadCtx(orgId, () =>
					getRecentPatientHistoryFromDb(orgId, userId),
				);
				return reply.status(200).send(rows);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при получении недавних пациентов.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/hr/recent-patients",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const identity = await requireStaffIdentity(request, reply);
				if (!identity) return reply;
				if (!identity.organizationId || !identity.userId) {
					return reply.status(401).send({
						error: "Unauthorized",
						message: "Не удалось определить организацию или идентификатор сотрудника.",
					});
				}
				const parsedBody = recentPatientViewBodySchema.safeParse(
					request.body ?? {},
				);
				if (!parsedBody.success) {
					return reply.status(400).send({
						error: "PatientIdRequired",
						message: "Не указан пациент, карточку которого открыли.",
					});
				}
				const patientId =
					typeof parsedBody.data.patientId === "string"
						? parsedBody.data.patientId
						: "";
				if (!patientId) {
					return reply.status(400).send({
						error: "PatientIdRequired",
						message: "Не указан пациент, карточку которого открыли.",
					});
				}
				const orgId = identity.organizationId;
				const userId = identity.userId;
				const { recordPatientViewInDb } = await import(
					"../../db/recentPatientHistoryQuery.js"
				);
				const result = await withTenantWriteCtx(orgId, () =>
					recordPatientViewInDb(orgId, userId, patientId),
				);
				if (!result.recorded) {
					return reply.status(404).send({
						error: "PatientNotFound",
						message: "Пациент не найден в этой клинике.",
					});
				}
				return reply.status(200).send({ recorded: true });
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при записи открытия карточки пациента.",
				});
			}
		},
	});

	// COMPETITOR FEATURE #6: маркетинг::фильтр_потерянных_пациентов_в_отчете
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/lost-patients-filters",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"lost patients filters",
					))
				) {
					return reply;
				}
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;

				const identity = getRequestIdentity(request);
				const staffRole = identity.role ?? request.user?.role ?? null;
				if (staffRole) {
					const evalAccess = evaluateClinicalAccess(staffRole, {
						clinicalRole: identity.clinicalRole ?? null,
						canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
						specialties: identity.specialties ?? null,
					});
					if (!evalAccess.hasClinicalAccess) {
						return reply.code(403).send({
							error: "PermissionDenied",
							permission: "clinical.analytics.read",
							role: staffRole,
							message:
								"Доступ к фильтрам потерянных пациентов ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
						});
					}
				}

				const { getLostPatientsFiltersFromDb } = await import(
					"../../db/lostPatientsFiltersQuery.js"
				);
				const filters = await withTenantReadCtx(orgId, (tx) =>
					getLostPatientsFiltersFromDb(orgId, tx),
				);
				return reply.status(200).send(filters);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при фильтрации потерянных пациентов.",
				});
			}
		},
	});
}
