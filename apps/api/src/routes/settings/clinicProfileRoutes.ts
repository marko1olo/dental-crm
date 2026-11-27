import {
	applyClinicScalePresetSchema,
	clinicSettingsSchema,
	updateClinicModeSchema,
	updateClinicProfileSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	applyClinicScalePresetInDb,
	getClinicFiscalSettingsFromDb,
	getClinicSettingsFromDb,
	updateClinicFiscalSettingsInDb,
	updateClinicModeInDb,
	updateClinicProfileInDb,
} from "../../db/settingsQuery.js";
import {
	clinicProfileMutationRejection,
	parseSettingsPayload,
	requireSettingsAccess,
	requireSettingsMutationAccess,
} from "./helpers.js";
import {
	clinicModeValidationMessage,
	clinicProfileValidationMessage,
	clinicScalePresetValidationMessage,
} from "./types.js";

const updateClinicFiscalSettingsSchema = z.object({
	taxationSystem: z
		.enum(["usn_income", "usn_income_expense", "psn", "osn", "patent", "osno"])
		.optional(),
	ofdProvider: z
		.enum(["platforma_ofd", "taxcom", "sbis", "first_ofd", "kontur_ofd"])
		.optional(),
	ffdVersion: z.enum(["1.2", "1.05"]).optional(),
	autoSendReceipt: z.boolean().optional(),
	allowAutonomousBuffer: z.boolean().optional(),
	cashBoxId: z.string().uuid().nullable().optional(),
	cashBoxName: z.string().trim().min(1).max(120).optional(),
	kkmModel: z.string().trim().max(120).nullable().optional(),
	kkmSerialNumber: z.string().trim().max(64).nullable().optional(),
	branchId: z.string().trim().max(120).nullable().optional(),
	kkmActive: z.boolean().optional(),
}).strict();

export function registerClinicProfileRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/clinic",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const settings = await withTenantReadCtx(orgId, async () => getClinicSettingsFromDb(orgId));
			return clinicSettingsSchema.parse(settings);
		},
	});

	const handleGetClinicProfile = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const settings = await withTenantReadCtx(orgId, async () => getClinicSettingsFromDb(orgId));
		return clinicSettingsSchema.parse(settings).profile;
	};

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/clinic/profile",
		permission: "public",
		handler: async ({ request, reply }) => handleGetClinicProfile(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/clinic-profile",
		permission: "public",
		handler: async ({ request, reply }) => handleGetClinicProfile(request, reply),
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/clinic/fiscal",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			return withTenantReadCtx(orgId, async () => getClinicFiscalSettingsFromDb(orgId));
		},
	});

	const handleUpdateFiscalSettings = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(
			updateClinicFiscalSettingsSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "ClinicFiscalValidationFailed",
				message: "Некорректные параметры налогообложения СНО или кассы 54-ФЗ.",
			};
		}
		return withTenantWriteCtx(orgId, async () => updateClinicFiscalSettingsInDb(orgId, input));
	};

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/clinic/fiscal",
		permission: "public",
		handler: async ({ request, reply }) => handleUpdateFiscalSettings(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/settings/clinic/fiscal",
		permission: "public",
		handler: async ({ request, reply }) => handleUpdateFiscalSettings(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/clinic/mode",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsMutationAccess(request, reply);
			if (!orgId) return;
			const input = parseSettingsPayload(updateClinicModeSchema, request.body);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: clinicModeValidationMessage,
				};
			}
			const settings = await withTenantWriteCtx(orgId, async () => {
				await updateClinicModeInDb(orgId, input.mode);
				return getClinicSettingsFromDb(orgId);
			});
			return clinicSettingsSchema.parse(settings);
		},
	});

	const handleApplyScalePreset = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(
			applyClinicScalePresetSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: clinicScalePresetValidationMessage,
			};
		}
		const settings = await withTenantWriteCtx(orgId, async () =>
			applyClinicScalePresetInDb(
				orgId,
				input.preset,
				input.confirmResetExtraChairs,
			),
		);
		return clinicSettingsSchema.parse(settings);
	};

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/settings/clinic/scale-preset",
		permission: "public",
		handler: async ({ request, reply }) => handleApplyScalePreset(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/clinic/scale-preset",
		permission: "public",
		handler: async ({ request, reply }) => handleApplyScalePreset(request, reply),
	});

	const handleUpdateClinicProfile = async (request: FastifyRequest, reply: FastifyReply) => {
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

		const input = parseSettingsPayload(updateClinicProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "ClinicProfileValidationFailed",
				message: clinicProfileValidationMessage,
			};
		}
		try {
			const settings = await withTenantWriteCtx(orgId, async () => {
				await updateClinicProfileInDb(orgId, input);
				return getClinicSettingsFromDb(orgId);
			});
			return clinicSettingsSchema.parse(settings);
		} catch (error) {
			return clinicProfileMutationRejection(reply, error);
		}
	};

	const clinicProfileMutationOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description: "Clinic profile mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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
	app.put("/api/settings/clinic/profile", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.patch("/api/settings/clinic/profile", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.post("/api/settings/clinic/profile", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.put("/api/settings/clinic-profile", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.patch("/api/settings/clinic-profile", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.put("/api/settings/clinic", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.patch("/api/settings/clinic", clinicProfileMutationOptions, handleUpdateClinicProfile);
	app.post("/api/settings/clinic", clinicProfileMutationOptions, handleUpdateClinicProfile);

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/reset-demo",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsMutationAccess(request, reply);
			if (!orgId) return;
			reply.code(410);
			return {
				success: false,
				error: "EndpointDeprecated",
				message:
					"Демонстрационный сброс через этот маршрут отключён.",
			};
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/reset-zero",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsMutationAccess(request, reply);
			if (!orgId) return;
			reply.code(410);
			return {
				success: false,
				error: "EndpointDeprecated",
				message: "Очистка базы через этот маршрут отключена.",
			};
		},
	});
}
