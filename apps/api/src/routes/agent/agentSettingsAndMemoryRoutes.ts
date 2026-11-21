/**
 * agentSettingsAndMemoryRoutes.ts — Clinical Copilot Settings, Memory & BYOK Validation
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 250 lines).
 * Memory Contract SSOT: Fixes HTTP 400 by supporting both string and AiMemoryFact objects.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { validateUniversalApiKeyLive } from "../../ai/agentRouterClient.js";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../../db/doctorPreferencesQuery.js";

const memoryFactItemSchema = z.union([
	z.string(),
	z.object({
		id: z.string().optional(),
		category: z.string().optional(),
		fact: z.string(),
		createdAt: z.string().optional(),
	}).passthrough(),
]);

export async function registerAgentSettingsAndMemoryRoutes(
	server: FastifyInstance,
): Promise<void> {
	// ─── POST /api/agent/validate-key ──────────────────────────────────────────
	server.post(
		"/api/agent/validate-key",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"validate byok key",
			);
			if (!resolvedOrgId) return;

			const bodySchema = z.object({
				provider: z.enum(["gemini", "openai", "anthropic", "deepseek", "custom", "groq"]),
				apiKey: z.string().min(1, "API-ключ обязателен"),
				model: z.string().optional(),
				baseUrl: z.string().optional(),
			});

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					valid: false,
					message: "Некорректные параметры валидации API-ключа",
					details: parseResult.error.format(),
				});
			}

			const { provider, apiKey, model, baseUrl } = parseResult.data;
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
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent get memory",
			);
			if (!resolvedOrgId) return;

			try {
				const identity = getRequestIdentity(request);
				const record = await getDoctorPreferencesFromDb(
					resolvedOrgId,
					identity.userId || null,
				);
				const prefs = (record?.preferences || {}) as Record<string, unknown>;
				const memoryFacts = Array.isArray(prefs.copilotMemoryFacts)
					? prefs.copilotMemoryFacts
					: [];

				return reply.code(200).send({ memoryFacts });
			} catch (err) {
				request.log.warn({ err }, "[agentSettingsAndMemoryRoutes] Failed to read memory facts from DB");
				return reply.code(200).send({ memoryFacts: [] });
			}
		},
	);

	// ─── PUT /api/agent/memory ──────────────────────────────────────────────────
	server.put(
		"/api/agent/memory",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent save memory",
			);
			if (!resolvedOrgId) return;

			const bodySchema = z.object({
				memoryFacts: z.array(memoryFactItemSchema),
			});

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
				const current = await getDoctorPreferencesFromDb(
					resolvedOrgId,
					identity.userId || null,
				);
				const existingPrefs = (current?.preferences || {}) as Record<string, unknown>;
				const nextPrefs = {
					...existingPrefs,
					copilotMemoryFacts: parseResult.data.memoryFacts,
				};

				await saveDoctorPreferencesInDb(
					resolvedOrgId,
					identity.userId || null,
					nextPrefs,
					current?.specialty || "therapist",
				);
			} catch (err) {
				request.log.warn({ err }, "[agentSettingsAndMemoryRoutes] Failed to persist memory facts to DB");
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
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent get settings",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const record = await getDoctorPreferencesFromDb(
				resolvedOrgId,
				identity.userId || null,
			);
			const prefs = (record?.preferences || {}) as Record<string, unknown>;
			const settings = (prefs.copilotSettings && typeof prefs.copilotSettings === "object")
				? prefs.copilotSettings
				: null;

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
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent save settings",
			);
			if (!resolvedOrgId) return;

			const bodySchema = z.object({
				settings: z.record(z.unknown()),
				specialty: z.string().optional(),
			});

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат настроек копайлота",
					details: parseResult.error.format(),
				});
			}

			const identity = getRequestIdentity(request);
			const current = await getDoctorPreferencesFromDb(
				resolvedOrgId,
				identity.userId || null,
			);
			const existingPrefs = (current?.preferences || {}) as Record<string, unknown>;
			const currentSettings = (existingPrefs.copilotSettings && typeof existingPrefs.copilotSettings === "object")
				? (existingPrefs.copilotSettings as Record<string, unknown>)
				: {};
			const nextPrefs = {
				...existingPrefs,
				copilotSettings: {
					...currentSettings,
					...parseResult.data.settings,
				},
			};

			const saved = await saveDoctorPreferencesInDb(
				resolvedOrgId,
				identity.userId || null,
				nextPrefs,
				parseResult.data.specialty || current?.specialty || "therapist",
			);

			return reply.code(200).send({
				ok: true,
				settings: (saved.preferences as Record<string, unknown>).copilotSettings,
			});
		},
	);
};
