import {
	applyClinicScalePresetSchema,
	clinicSettingsSchema,
	updateClinicModeSchema,
	updateClinicProfileSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
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
});

export function registerClinicProfileRoutes(app: FastifyInstance): void {
	app.get("/api/settings/clinic", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const settings = await getClinicSettingsFromDb(orgId);
		return clinicSettingsSchema.parse(settings);
	});

	app.get("/api/settings/clinic/fiscal", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		return getClinicFiscalSettingsFromDb(orgId);
	});

	const handleUpdateFiscalSettings = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireSettingsAccess(request, reply);
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
		return updateClinicFiscalSettingsInDb(orgId, input);
	};

	app.put("/api/settings/clinic/fiscal", handleUpdateFiscalSettings);
	app.patch("/api/settings/clinic/fiscal", handleUpdateFiscalSettings);

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

	const handleUpdateClinicProfile = async (request: FastifyRequest, reply: FastifyReply) => {
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
	};

	app.put("/api/settings/clinic/profile", handleUpdateClinicProfile);
	app.post("/api/settings/clinic/profile", handleUpdateClinicProfile);
	app.put("/api/settings/clinic", handleUpdateClinicProfile);
	app.patch("/api/settings/clinic", handleUpdateClinicProfile);
	app.post("/api/settings/clinic", handleUpdateClinicProfile);

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
