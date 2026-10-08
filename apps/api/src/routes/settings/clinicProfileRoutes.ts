import {
	applyClinicScalePresetSchema,
	clinicSettingsSchema,
	updateClinicModeSchema,
	updateClinicProfileSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	applyClinicScalePresetInDb,
	getClinicSettingsFromDb,
	updateClinicModeInDb,
	updateClinicProfileInDb,
} from "../../db/settingsQuery.js";
import {
	clinicProfileMutationRejection,
	parseSettingsPayload,
	requireSettingsAccess,
} from "./helpers.js";
import {
	clinicModeValidationMessage,
	clinicProfileValidationMessage,
	clinicScalePresetValidationMessage,
} from "./types.js";

export function registerClinicProfileRoutes(app: FastifyInstance): void {
	app.get("/api/settings/clinic", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const settings = await getClinicSettingsFromDb(orgId);
		return clinicSettingsSchema.parse(settings);
	});

	app.post("/api/settings/clinic/mode", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(updateClinicModeSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: clinicModeValidationMessage,
			};
		}
		await updateClinicModeInDb(orgId, input.mode);
		const settings = await getClinicSettingsFromDb(orgId);
		return clinicSettingsSchema.parse(settings);
	});

	const handleApplyScalePreset = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireSettingsAccess(request, reply);
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
		const settings = await applyClinicScalePresetInDb(
			orgId,
			input.preset,
			input.confirmResetExtraChairs,
		);
		return clinicSettingsSchema.parse(settings);
	};

	app.patch("/api/settings/clinic/scale-preset", handleApplyScalePreset);
	app.post("/api/settings/clinic/scale-preset", handleApplyScalePreset);

	app.put("/api/settings/clinic/profile", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(updateClinicProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "ClinicProfileValidationFailed",
				message: clinicProfileValidationMessage,
			};
		}
		try {
			await updateClinicProfileInDb(orgId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			return clinicSettingsSchema.parse(settings);
		} catch (error) {
			return clinicProfileMutationRejection(reply, error);
		}
	});

	app.post("/api/settings/reset-demo", async (_request, _reply) => {
		return {
			success: true,
			message:
				"Демонстрационный режим больше не поддерживается (используется Postgres).",
		};
	});

	app.post("/api/settings/reset-zero", async (_request, _reply) => {
		return {
			success: true,
			message: "Очистка базы больше не поддерживается (используется Postgres).",
		};
	});
}
