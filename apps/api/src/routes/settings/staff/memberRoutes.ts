import {
	createStaffMemberSchema,
	evaluatePasswordEntropy,
	staffMemberSchema,
	updateStaffWorkingHoursSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { recordAuditEventInDb } from "../../../db/auditQuery.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import {
	createStaffMemberInDb,
	deactivateStaffMemberInDb,
	getClinicSettingsFromDb,
	updateStaffCredentialsInDb,
	updateStaffMemberProfileInDb,
	updateStaffWorkingHoursInDb,
} from "../../../db/settingsQuery.js";
import { safeLogError } from "../../../observability/logger.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { hashCredential } from "../../../utils/cryptoHelper.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import {
	parseSettingsPayload,
	requireSettingsMutationAccess,
	staffMutationRejection,
	staffWorkingHoursRejection,
} from "../helpers.js";
import {
	staffCreateValidationMessage,
	staffCredentialsEmptyUpdateMessage,
	staffCredentialsValidationMessage,
	staffDeactivateNotFoundMessage,
	staffDeactivateRejectedMessage,
	staffDeactivateRouteValidationMessage,
	staffProfileEmptyUpdateMessage,
	staffProfileNotFoundMessage,
	staffProfileRejectedMessage,
	staffProfileRouteValidationMessage,
	staffProfileValidationMessage,
	staffWorkingHoursRouteValidationMessage,
	staffWorkingHoursValidationMessage,
	updateStaffCredentialsSchema,
	updateStaffMemberProfileSchema,
} from "../types.js";

const staffSettingsMutationOptions = {
	config: { tenantTxSelfManaged: true },
	schema: {
		description:
			"Staff settings mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				organizationid: { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
} as const;

export function registerStaffMemberRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/staff",
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

		const input = parseSettingsPayload(createStaffMemberSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffCreateValidationMessage,
			};
		}
		const created = await withTenantWriteCtx(orgId, async (tx) => {
			const member = await createStaffMemberInDb(orgId, input, tx);
			try {
				await recordAuditEventInDb(
					orgId,
					{
						entityType: "user",
						entityId: member.id,
						action: "STAFF_CREATED",
						actorUserId: getRequestIdentity(request).userId,
					},
					tx,
				);
			} catch (auditErr) {
				request.log.warn(
					{ error: auditErr },
					"Не удалось записать аудит создания сотрудника",
				);
			}
			return member;
		});
		reply.code(201);
		return staffMemberSchema.parse(created);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/staff/:staffId/credentials",
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
				message: "Некорректный ID сотрудника.",
			};
		}
		const staffId = params.staffId;

		const input = parseSettingsPayload(updateStaffCredentialsSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffCredentialsValidationMessage,
			};
		}
		const { email, password, pinCode } = input;
		if (!email && !password && !pinCode) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffCredentialsEmptyUpdateMessage,
			};
		}

		const updates: {
			email?: string;
			passwordHash?: string;
			pinCodeHash?: string;
			passwordEntropyBits?: number;
		} = {};
		if (email) updates.email = email.toLowerCase().trim();
		if (password) {
			const entropy = evaluatePasswordEntropy(password);
			updates.passwordHash = await hashCredential(password);
			updates.passwordEntropyBits = entropy.effectiveEntropyBits;
		}
		if (pinCode) updates.pinCodeHash = await hashCredential(pinCode);

		try {
			await withTenantWriteCtx(orgId, async (tx) => {
				await updateStaffCredentialsInDb(orgId, staffId, updates, tx);
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "user",
							entityId: staffId,
							action: "STAFF_CREDENTIALS_UPDATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит доступов сотрудника",
					);
				}
			});
			reply.code(200);
			return { ok: true };
		} catch (err: unknown) {
			if (err instanceof Error && err.message === "Сотрудник не найден.") {
				reply.code(404);
				return {
					error: "StaffNotFound",
					message: err.message,
				};
			}
			request.log.error(
				{ err: safeLogError(err), organizationId: orgId, staffId: params.staffId },
				"Не удалось обновить доступы сотрудника",
			);
			reply.code(500);
			return {
				error: "InternalError",
				message: "Не удалось обновить доступы.",
			};
		}
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/staff/:staffId/working-hours",
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
				message: staffWorkingHoursRouteValidationMessage,
			};
		}
		const staffId = params.staffId;
		const input = parseSettingsPayload(updateStaffWorkingHoursSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffWorkingHoursValidationMessage,
			};
		}
		try {
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				await updateStaffWorkingHoursInDb(orgId, staffId, input, tx);
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "user",
							entityId: staffId,
							action: "STAFF_WORKING_HOURS_UPDATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит графика сотрудника",
					);
				}
				const settings = await getClinicSettingsFromDb(orgId, tx);
				const found = settings.staff.find((s) => s.id === staffId);
				if (!found) throw new Error("Сотрудник не найден.");
				return found;
			});
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffWorkingHoursRejection(reply, error);
		}
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/staff/:staffId",
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
				message: staffProfileRouteValidationMessage,
			};
		}
		const staffId = params.staffId;
		const input = parseSettingsPayload(updateStaffMemberProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileValidationMessage,
			};
		}
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileEmptyUpdateMessage,
			};
		}
		try {
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				await updateStaffMemberProfileInDb(orgId, staffId, input, tx);
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "user",
							entityId: staffId,
							action: "STAFF_PROFILE_UPDATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит профиля сотрудника",
					);
				}
				const settings = await getClinicSettingsFromDb(orgId, tx);
				const found = settings.staff.find((s) => s.id === staffId);
				if (!found) throw new Error("Сотрудник не найден.");
				return found;
			});
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffProfileNotFoundMessage,
				staffProfileRejectedMessage,
				"StaffProfile",
			);
		}
		},
	});

	app.delete("/api/settings/staff/:staffId", staffSettingsMutationOptions, async (request, reply) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId || !isValidUuid(params.staffId)) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffDeactivateRouteValidationMessage,
			};
		}
		const staffId = params.staffId;
		try {
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				await deactivateStaffMemberInDb(orgId, staffId, tx);
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "user",
							entityId: staffId,
							action: "STAFF_DEACTIVATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит деактивации сотрудника",
					);
				}
				const settings = await getClinicSettingsFromDb(orgId, tx);
				const found = settings.staff.find((s) => s.id === staffId);
				if (!found) throw new Error("Сотрудник не найден.");
				return found;
			});
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffDeactivateNotFoundMessage,
				staffDeactivateRejectedMessage,
				"StaffDeactivate",
			);
		}
	});
}
