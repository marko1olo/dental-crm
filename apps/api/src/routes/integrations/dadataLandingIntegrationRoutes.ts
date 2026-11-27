import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissionsModules/permissionGuards.js";

async function authorizeDadataAddressRead(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	if (!(await requireClinicalReadAccess(request, reply, "dadata patient addresses"))) {
		return null;
	}
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return null;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	if (staffRole) {
		const evalAccess = evaluateClinicalAccess(staffRole, {
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
			specialties: identity.specialties ?? null,
		});
		if (!evalAccess.hasClinicalAccess) {
			reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.read",
				role: staffRole,
				message:
					"Доступ к адресным данным пациентов ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
			return null;
		}
	}
	return orgId;
}

/**
 * Маршруты интеграций DaData и маппинга полей лид-форм / лендингов.
 */
export async function registerDadataLandingIntegrationRoutes(app: FastifyInstance): Promise<void> {
	// COMPETITOR FEATURE #60: интеграции::геокодирование_адресов_через_dadata
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/integrations/dadata-addresses",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const orgId = await authorizeDadataAddressRead(request, reply);
				if (!orgId) return;
				const { getDadataGeocodedAddressesFromDb } = await import(
					"../../db/dadataGeocodedAddressesQuery.js"
				);
				const rows = await withTenantReadCtx(orgId, (tx) =>
					getDadataGeocodedAddressesFromDb(orgId, tx),
				);
				return reply.status(200).send(rows);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при геокодировании адресов через DaData.",
				});
			}
		},
	});

	// COMPETITOR FEATURE #54: маркетинг::маппинг_полей_лендингов_и_лид_форм
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/integrations/landing-field-mappings",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const orgId = await requireResolvedStaffOrAdminOrganizationId(
					request,
					reply,
					"landing field mappings",
				);
				if (!orgId) return;
				if (!enforcePermissionWhenStaffKnown(request, reply, "settings.read")) {
					return;
				}
				const { getLandingFieldMappingsFromDb } = await import(
					"../../db/landingFieldMappingsQuery.js"
				);
				const rows = await withTenantReadCtx(orgId, (tx) =>
					getLandingFieldMappingsFromDb(orgId, tx),
				);
				return reply.status(200).send(rows);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при получении маппинга полей лендингов.",
				});
			}
		},
	});

	// COMPETITOR FEATURE #58: пациенты::геокодинг_адресов_через_dadata
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/integrations/dadata-geocoded-addresses",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const orgId = await authorizeDadataAddressRead(request, reply);
				if (!orgId) return;
				const { getDadataGeocodedAddressesFromDb } = await import(
					"../../db/dadataGeocodedAddressesQuery.js"
				);
				const rows = await withTenantReadCtx(orgId, (tx) =>
					getDadataGeocodedAddressesFromDb(orgId, tx),
				);
				return reply.status(200).send(rows);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при геокодировании адресов пациентов.",
				});
			}
		},
	});
}
