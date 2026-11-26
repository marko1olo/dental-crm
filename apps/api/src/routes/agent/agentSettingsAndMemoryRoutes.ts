/**
 * agentSettingsAndMemoryRoutes.ts — Clinical Copilot Settings, Memory & BYOK Validation
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 250 lines).
 * Memory Contract SSOT: Fixes HTTP 400 by supporting both string and AiMemoryFact objects.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getRequestIdentity } from "../../security/identity.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../security/tenantContext.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	maskApiKey,
	validateSsrfSafeAiBaseUrl,
	validateUniversalApiKeyLive,
} from "../../ai/agentRouterClient.js";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../../db/doctorPreferencesQuery.js";

function sanitizeCopilotSettingsForClient(
	rawSettings: unknown,
): Record<string, unknown> | null {
	if (!rawSettings || typeof rawSettings !== "object") return null;
	const source = rawSettings as Record<string, unknown>;
	const { byokApiKey, ...rest } = source;
	const result: Record<string, unknown> = { ...rest };
	if (typeof byokApiKey === "string" && byokApiKey.trim().length > 0) {
		result.apiKeyMasked = maskApiKey(byokApiKey.trim());
	}
	return result;
}

const memoryFactItemSchema = z.union([
	z.string(),
	z
		.object({
			id: z.string().optional(),
			category: z.string().optional(),
			fact: z.string(),
			createdAt: z.string().optional(),
		})
		.strict(),
]);

const granularPermissionsPatchSchema = z
	.object({
		autoApproveFileReads: z.boolean().optional(),
		autoApproveFileWrites: z.boolean().optional(),
		autoApproveClinicalMutations: z.boolean().optional(),
		autoApproveFinancialDrafts: z.boolean().optional(),
		autoApproveExternalSoftware: z.boolean().optional(),
	})
	.strict();

const copilotSettingsPatchSchema = z
	.object({
		trustLevel: z.enum(["confirm_all", "balanced", "autonomous"]).optional(),
		provider: z.enum(["gemini", "openai", "anthropic", "deepseek", "custom", "groq"]).optional(),
		model: z.string().max(200).optional(),
		modelRoutingMode: z.enum(["server_managed", "custom_byok"]).optional(),
		byokProvider: z.enum(["gemini", "openai", "anthropic", "deepseek", "custom", "groq"]).optional(),
		byokApiKey: z.string().max(500).optional(),
		byokModel: z.string().max(200).optional(),
		byokBaseUrl: z.string().max(500).optional(),
		speedMode: z.enum(["turbo", "deep_reasoning"]).optional(),
		showThinkingProcess: z.boolean().optional(),
		showTypingAnimation: z.boolean().optional(),
		clinicalSpecialization: z.enum(["therapy", "orthopedics", "surgery", "orthodontics", "perio", "pediatric"]).optional(),
		diaryTemplate: z.enum(["soap", "treatment_diary", "clinical_protocol", "express"]).optional(),
		customDoctorInstructions: z.string().max(8000).optional(),
		granularPermissions: granularPermissionsPatchSchema.optional(),
		temperature: z.number().min(0).max(2).optional(),
		contextLimitTokens: z.number().int().positive().optional(),
		runtimeMode: z.enum(["web_browser", "desktop_native", "chairside_tablet", "mobile_tablet"]).optional(),
		speechEngine: z.enum(["gemini_live", "whisper", "web_speech"]).optional(),
		autoSaveDrafts: z.boolean().optional(),
		webSpeechSensitivity: z.enum(["high", "normal", "low"]).optional(),
		maskPhiData: z.boolean().optional(),
		apiKeyMasked: z.string().max(200).optional(),
		globalDictationHotkey: z.string().max(100).optional(),
		autoMicOnAppointmentOpen: z.boolean().optional(),
		localDropzonePath: z.string().max(500).optional(),
		gloveModeTouchTarget: z.boolean().optional(),
		screenWakeLock: z.boolean().optional(),
		hapticFeedbackEnabled: z.boolean().optional(),
		pinnedThreadIds: z.array(z.string().max(128)).max(200).optional(),
	})
	.strict();

export async function registerAgentSettingsAndMemoryRoutes(
	server: FastifyInstance,
): Promise<void> {
	// ─── POST /api/agent/validate-key ──────────────────────────────────────────
	server.post(
		"/api/agent/validate-key",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"validate byok key",
			);
			if (!context) return;

			const bodySchema = z
				.object({
					provider: z.enum(["gemini", "openai", "anthropic", "deepseek", "custom", "groq"]),
					apiKey: z.string().min(1, "API-ключ обязателен"),
					model: z.string().optional(),
					baseUrl: z.string().optional(),
				})
				.strict();

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					valid: false,
					message: "Некорректные параметры валидации API-ключа",
					details: parseResult.error.format(),
				});
			}

			const { provider, apiKey, model, baseUrl } = parseResult.data;
			if (baseUrl) {
				const ssrfCheck = await validateSsrfSafeAiBaseUrl(baseUrl);
				if (!ssrfCheck.valid) {
					return reply.code(400).send({
						valid: false,
						error: "ValidationError",
						message: ssrfCheck.error ?? "Недопустимый URL провайдера ИИ",
					});
				}
			}

			const validation = await validateUniversalApiKeyLive(
				provider,
				apiKey,
				model,
				baseUrl,
			);

			return reply.code(200).send(validation);
		},
	);

	// ─── GET /api/agent/memory ──────────────────────────────────────────────────
	server.get(
		"/api/agent/memory",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"agent get memory",
			);
			if (!context) return;

			try {
				const identity = getRequestIdentity(request);
				const record = await withTenantCtx(context.organizationId, async (tx) =>
					getDoctorPreferencesFromDb(
						context.organizationId,
						identity.userId || null,
						tx,
					),
				);
				const prefs = (record?.preferences || {}) as Record<string, unknown>;
				const memoryFacts = Array.isArray(prefs.copilotMemoryFacts)
					? prefs.copilotMemoryFacts
					: [];

				return reply.code(200).send({ memoryFacts });
			} catch (err) {
				request.log.error({ err }, "[agentSettingsAndMemoryRoutes] Failed to read memory facts from DB");
				return reply.code(500).send({
					error: "InternalServerError",
					message: "Не удалось загрузить память ИИ-ассистента.",
				});
			}
		},
	);

	// ─── PUT /api/agent/memory ──────────────────────────────────────────────────
	server.put(
		"/api/agent/memory",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"agent save memory",
			);
			if (!context) return;

			const bodySchema = z
				.object({
					memoryFacts: z.array(memoryFactItemSchema),
				})
				.strict();

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат фактов клинической памяти",
					details: parseResult.error.format(),
				});
			}

			try {
				const identity = getRequestIdentity(request);
				await withTenantCtx(context.organizationId, async (tx) => {
					const current = await getDoctorPreferencesFromDb(
						context.organizationId,
						identity.userId || null,
						tx,
					);
					const existingPrefs = (current?.preferences || {}) as Record<string, unknown>;
					const nextPrefs = {
						...existingPrefs,
						copilotMemoryFacts: parseResult.data.memoryFacts,
					};

					await saveDoctorPreferencesInDb(
						context.organizationId,
						identity.userId || null,
						nextPrefs,
						current?.specialty || "therapist",
						tx,
					);
				});
			} catch (err) {
				request.log.error({ err }, "[agentSettingsAndMemoryRoutes] Failed to persist memory facts to DB");
				return reply.code(500).send({
					error: "InternalServerError",
					message: "Не удалось сохранить память ИИ-ассистента.",
				});
			}

			return reply.code(200).send({
				success: true,
				memoryFacts: parseResult.data.memoryFacts,
			});
		},
	);

	// ─── GET /api/agent/settings ────────────────────────────────────────────────
	server.get(
		"/api/agent/settings",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"agent get settings",
			);
			if (!context) return;

			const identity = getRequestIdentity(request);
			const record = await withTenantCtx(context.organizationId, async (tx) =>
				getDoctorPreferencesFromDb(
					context.organizationId,
					identity.userId || null,
					tx,
				),
			);
			const prefs = (record?.preferences || {}) as Record<string, unknown>;
			const settings = sanitizeCopilotSettingsForClient(prefs.copilotSettings);

			return reply.code(200).send({
				ok: true,
				settings,
				specialty: record?.specialty || "therapist",
			});
		},
	);

	// ─── PUT /api/agent/settings ────────────────────────────────────────────────
	server.put(
		"/api/agent/settings",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"agent save settings",
			);
			if (!context) return;

			const bodySchema = z
				.object({
					settings: copilotSettingsPatchSchema,
					specialty: z.string().optional(),
				})
				.strict();

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат настроек копайлота",
					details: parseResult.error.format(),
				});
			}

			const { byokApiKey: incomingByokApiKey, apiKeyMasked: _ignoredMasked, ...incomingRest } =
				parseResult.data.settings;
			if (typeof incomingRest.byokBaseUrl === "string" && incomingRest.byokBaseUrl.trim().length > 0) {
				const ssrfCheck = await validateSsrfSafeAiBaseUrl(incomingRest.byokBaseUrl.trim());
				if (!ssrfCheck.valid) {
					return reply.code(400).send({
						error: "ValidationError",
						message: ssrfCheck.error ?? "Недопустимый URL провайдера ИИ",
					});
				}
			}

			const identity = getRequestIdentity(request);
			const saved = await withTenantCtx(context.organizationId, async (tx) => {
				const current = await getDoctorPreferencesFromDb(
					context.organizationId,
					identity.userId || null,
					tx,
				);
				const existingPrefs = (current?.preferences || {}) as Record<string, unknown>;
				const currentSettings = (existingPrefs.copilotSettings && typeof existingPrefs.copilotSettings === "object")
					? (existingPrefs.copilotSettings as Record<string, unknown>)
					: {};
				const nextCopilotSettings: Record<string, unknown> = {
					...currentSettings,
					...incomingRest,
				};
				if (typeof incomingByokApiKey === "string") {
					const trimmedKey = incomingByokApiKey.trim();
					if (trimmedKey.length > 0) {
						nextCopilotSettings.byokApiKey = trimmedKey;
						nextCopilotSettings.apiKeyMasked = maskApiKey(trimmedKey);
					} else {
						delete nextCopilotSettings.byokApiKey;
						delete nextCopilotSettings.apiKeyMasked;
					}
				}
				const nextPrefs = {
					...existingPrefs,
					copilotSettings: nextCopilotSettings,
				};

				return saveDoctorPreferencesInDb(
					context.organizationId,
					identity.userId || null,
					nextPrefs,
					parseResult.data.specialty || current?.specialty || "therapist",
					tx,
				);
			});

			const savedPrefs = (saved.preferences || {}) as Record<string, unknown>;
			return reply.code(200).send({
				ok: true,
				settings: sanitizeCopilotSettingsForClient(savedPrefs.copilotSettings),
			});
		},
	);
};
