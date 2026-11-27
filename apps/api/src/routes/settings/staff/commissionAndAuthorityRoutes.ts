import {
	staffAuthorityStateSchema,
	staffRoleSchema,
	updateStaffAuthorityGrantsSchema,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { recordAuditEventInDb } from "../../../db/auditQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import {
	listDoctorCommissionRatesInDb,
	setDoctorCommissionRateInDb,
} from "../../../db/settingsQuery.js";
import { grantStaffAuthorityInDb } from "../../../db/staffAuthorityQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	invalidateRoleMatrixCache,
	requirePermission,
} from "../../../security/permissions.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import {
	parseSettingsPayload,
	requireSettingsAccess,
	requireSettingsMutationAccess,
	settingsDomainMessage,
	staffAuthorityMutationRejection,
	staffMutationRejection,
} from "../helpers.js";
import {
	doctorCommissionNotFoundMessage,
	doctorCommissionRejectedMessage,
	doctorCommissionRouteValidationMessage,
	doctorCommissionValidationMessage,
	staffAuthorityEmptyUpdateMessage,
	staffAuthorityRouteValidationMessage,
	staffAuthoritySelfMessage,
	staffAuthorityUnverifiedMessage,
	staffAuthorityValidationMessage,
	updateDoctorCommissionSchema,
} from "../types.js";

const roleMatrixBodySchema = z
	.object({
		matrix: z.record(
			staffRoleSchema,
			z.record(
				z.string().regex(/^[a-z0-9_.]+$/i, "Некорректный ключ права"),
				z.union([z.enum(["none", "read", "own", "full"]), z.boolean()]),
			),
		),
	})
	.strict();

export function registerStaffCommissionAndAuthorityRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/staff/commissions",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const commissions = await withTenantReadCtx(orgId, () => listDoctorCommissionRatesInDb(orgId));
			return { commissions };
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/staff/:staffId/commission",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const params = request.params as { staffId?: string };
		if (!params.staffId || !isValidUuid(params.staffId)) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: doctorCommissionRouteValidationMessage,
			};
		}
		const staffId = params.staffId;
		const input = parseSettingsPayload(updateDoctorCommissionSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: doctorCommissionValidationMessage,
			};
		}
		try {
			const saved = await withTenantWriteCtx(orgId, async (tx) => {
				const rate = await setDoctorCommissionRateInDb(
					orgId,
					staffId,
					input.commissionPct,
					{
						materialCostDeductionPct: input.materialCostDeductionPct,
						labCostDeductionPct: input.labCostDeductionPct,
					},
					tx,
				);
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "doctor_commission",
							entityId: staffId,
							action: "STAFF_COMMISSION_UPDATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит комиссии врача",
					);
				}
				return rate;
			});
			return saved;
		} catch (error) {
			const message = settingsDomainMessage(error);
			if (message.includes("DENTAL_STATE_PERSISTENCE")) {
				reply.code(503);
				return {
					error: "DoctorCommissionStorageUnavailable",
					reason: "state_persistence_off",
					message,
				};
			}
			request.log.error({ err: error }, "[настройки] ставка врача не сохранена");
			return staffMutationRejection(
				reply,
				error,
				doctorCommissionNotFoundMessage,
				doctorCommissionRejectedMessage,
				"DoctorCommission",
			);
		}
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/staff/:staffId/authority",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		if (!getRequestIdentity(request).verified) {
			reply.code(401);
			return {
				error: "VerifiedOrganizationRequired",
				message: staffAuthorityUnverifiedMessage,
			};
		}

		const granter = await withTenantReadCtx(orgId, (tx) =>
			requirePermission(tx, request, reply, "settings.write"),
		);
		if (!granter) return;

		const params = request.params as { staffId?: string };
		if (!params.staffId || !isValidUuid(params.staffId)) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffAuthorityRouteValidationMessage,
			};
		}
		if (params.staffId === granter.userId) {
			reply.code(403);
			return {
				error: "StaffAuthoritySelfGrantRejected",
				reason: "self_grant",
				message: staffAuthoritySelfMessage,
			};
		}
		const input = parseSettingsPayload(updateStaffAuthorityGrantsSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityValidationMessage,
			};
		}
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityEmptyUpdateMessage,
			};
		}
		try {
			const state = await grantStaffAuthorityInDb(
				granter.organizationId,
				params.staffId,
				input,
			);
			return staffAuthorityStateSchema.parse(state);
		} catch (error) {
			return staffAuthorityMutationRejection(reply, error);
		}
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/role-matrix",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const [org] = await withTenantReadCtx(orgId, async (tx) =>
				tx
					.select()
					.from(schema.organizations)
					.where(eq(schema.organizations.id, orgId))
					.limit(1),
			);
			const flags = (org?.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
			const roleMatrix =
				(flags.roleMatrixOverrides as Record<string, Record<string, string | boolean>> | null) ??
				{};
			return { ok: true, matrix: roleMatrix };
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/role-matrix",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsedMatrix = roleMatrixBodySchema.safeParse(request.body);
		if (!parsedMatrix.success) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message:
					parsedMatrix.error.issues[0]?.message ||
					"Некорректная структура матрицы прав ролей.",
			};
		}

		const updatedOverrides = parsedMatrix.data.matrix;

		const updated = await withTenantWriteCtx(orgId, async (tx) => {
			const [org] = await tx
				.select()
				.from(schema.organizations)
				.where(eq(schema.organizations.id, orgId))
				.for("update")
				.limit(1);
			if (!org) {
				return false;
			}
			const existingFlags =
				(org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
			await tx
				.update(schema.organizations)
				.set({
					workspaceFeatureFlags: {
						...existingFlags,
						roleMatrixOverrides: updatedOverrides,
					},
					updatedAt: new Date(),
				})
				.where(eq(schema.organizations.id, orgId));
			return true;
		});

		if (!updated) {
			reply.code(404);
			return { error: "OrganizationNotFound", message: "Организация не найдена" };
		}

		invalidateRoleMatrixCache(orgId);

		return { ok: true, matrix: updatedOverrides };
		},
	});
}
