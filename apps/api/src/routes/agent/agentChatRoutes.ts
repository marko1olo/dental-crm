/**
 * agentChatRoutes.ts — Autonomous Clinical Dental AI Agent: Chat & SSE ReAct Stream
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 300 lines).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { runAgentHarness, type AgentHarnessEvent } from "../../ai/agentHarness.js";
import type { GranularAgentPermissions } from "../../ai/harness/harnessTypes.js";
import type { AgentRuntimeMode } from "../../ai/dentalTools.js";
import type { AgentRouterChatMessage } from "../../ai/agentRouterClient.js";
import { defaultCopilotActionManager } from "../../ai/copilotActionManager.js";
import { getDoctorPreferencesFromDb } from "../../db/doctorPreferencesQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { copilotMessages, copilotSessions } from "../../db/schema/copilot.js";
import { addMessageToDb } from "../../ai/session/copilotMessageDb.js";
import { getOrCreateSessionInDb } from "../../ai/session/copilotSessionDb.js";
import { ensureValidUuid, UUID_REGEX } from "../../ai/session/copilotSessionTypes.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tolerantUuid = z.string().optional().transform((val) => {
	if (!val) return undefined;
	const trimmed = val.trim();
	return uuidRegex.test(trimmed) ? trimmed : undefined;
});

const agentToolCallSchema = z
	.object({
		id: z.string().optional(),
		type: z.string().optional(),
		function: z
			.object({
				name: z.string().optional(),
				arguments: z.string().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

const chatMessageSchema = z
	.object({
		role: z.enum(["system", "user", "assistant", "tool"]),
		content: z.string().nullable().optional(),
		name: z.string().optional(),
		tool_call_id: z.string().optional(),
		tool_calls: z.array(agentToolCallSchema).optional(),
	})
	.strict();

const granularPermissionsSchema = z
	.object({
		autoApproveFileReads: z.boolean().optional(),
		autoApproveFileWrites: z.boolean().optional(),
		autoApproveClinicalMutations: z.boolean().optional(),
		autoApproveFinancialDrafts: z.boolean().optional(),
		autoApproveExternalSoftware: z.boolean().optional(),
	})
	.strict();

export const agentChatBodySchema = z
	.object({
		messages: z.array(chatMessageSchema).min(1, "Массив сообщений не может быть пустым"),
		patientId: tolerantUuid,
		activeVisitId: tolerantUuid,
		sessionId: z.string().optional(),
		conversationId: z.string().optional(),
		stream: z.boolean().optional().default(false),
		runtimeMode: z.enum(["web_browser", "desktop_native", "chairside_tablet", "mobile_tablet"]).optional(),
		maskPhiData: z.boolean().optional(),
		enableAutoCompaction: z.boolean().optional(),
		compactThresholdTokens: z.number().int().positive().optional(),
		slidingWindowRetainedTurns: z.number().int().positive().optional(),
		initialSummary: z.string().optional(),
		trustLevel: z.enum(["confirm_all", "balanced", "autonomous"]).optional(),
		granularPermissions: granularPermissionsSchema.optional(),
		customInstructions: z.string().optional(),
		memoryFacts: z.array(z.string()).optional(),
		doctorSpecialization: z.string().optional(),
		speedMode: z.enum(["turbo", "deep_reasoning"]).optional(),
		activeTooth: z.number().int().min(11).max(85).nullable().optional(),
		patientAllergies: z.array(z.string()).optional(),
		allergies: z.array(z.string()).optional(),
		somaticHistory: z.union([z.string(), z.array(z.string())]).optional(),
		swarmRole: z.enum(["orchestrator", "triage", "odontogram_inquisitor", "billing_sentinel", "vision_specialist"]).optional(),
		fallbackToDeterministicAgent: z.boolean().optional(),
		modelRoutingMode: z.enum(["server_managed", "custom_byok"]).optional(),
		byokProvider: z.string().optional(),
		byokApiKey: z.string().optional(),
		byokModel: z.string().optional(),
		byokBaseUrl: z.string().max(500).optional(),
		temperature: z.number().min(0).max(2).optional(),
		contextLimitTokens: z.number().int().positive().optional(),
		showTypingAnimation: z.boolean().optional(),
	})
	.strict();

export function formatSseMessage(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function resolveRuntimeMode(
	request: FastifyRequest,
	bodyRuntimeMode?: string,
): AgentRuntimeMode {
	const headerRuntime = request.headers["x-agent-runtime"];
	if (
		headerRuntime === "desktop_native" ||
		bodyRuntimeMode === "desktop_native" ||
		process.env.IS_DESKTOP_EXE === "true"
	) {
		return "desktop_native";
	}
	return "web_browser";
}

export function normalizeIncomingBody(
	rawBody: unknown,
	params?: { sessionId?: string },
	headers?: Record<string, string | string[] | undefined>,
): Record<string, unknown> {
	const b = (rawBody && typeof rawBody === "object") ? { ...(rawBody as Record<string, unknown>) } : {};
	if (!Array.isArray(b.messages)) {
		const text = (
			(b.content as string) ??
			(b.message as string) ??
			(b.text as string) ??
			""
		).trim();
		if (text) {
			b.messages = [{ role: "user", content: text }];
		}
	}
	delete b.content;
	delete b.message;
	delete b.text;

	if (params?.sessionId && !b.sessionId && !b.conversationId) {
		b.sessionId = params.sessionId;
	}
	const accept = headers?.accept;
	if (
		b.stream === undefined &&
		((typeof accept === "string" && accept.includes("text/event-stream")) || Boolean(params?.sessionId))
	) {
		b.stream = true;
	}
	return b;
}

function extractMemoryFactStrings(rawFacts: unknown): string[] | undefined {
	if (!Array.isArray(rawFacts) || rawFacts.length === 0) return undefined;
	const facts: string[] = [];
	for (const item of rawFacts) {
		if (typeof item === "string" && item.trim()) {
			facts.push(item.trim());
		} else if (item && typeof item === "object" && "fact" in item && typeof (item as { fact?: unknown }).fact === "string") {
			const factText = (item as { fact: string }).fact.trim();
			if (factText) facts.push(factText);
		}
	}
	return facts.length > 0 ? facts : undefined;
}

async function loadAgentChatContextFromDb(params: {
	organizationId: string;
	doctorId: string | undefined;
	sessionId: string | undefined;
	incomingMessages: AgentRouterChatMessage[];
	logger: FastifyRequest["log"];
}): Promise<{
	mergedMessages: AgentRouterChatMessage[];
	initialSummary: string | undefined;
	defaultTrustLevel: "confirm_all" | "balanced" | "autonomous" | undefined;
	defaultGranularPermissions: GranularAgentPermissions | undefined;
	defaultCustomInstructions: string | undefined;
	defaultMemoryFacts: string[] | undefined;
	defaultDoctorSpecialization: string | undefined;
	defaultSpeedMode: "turbo" | "deep_reasoning" | undefined;
	defaultMaskPhiData: boolean | undefined;
	defaultModelRoutingMode: "server_managed" | "custom_byok" | undefined;
	defaultByokProvider: string | undefined;
	defaultByokApiKey: string | undefined;
	defaultByokModel: string | undefined;
	defaultByokBaseUrl: string | undefined;
	defaultTemperature: number | undefined;
	defaultContextLimitTokens: number | undefined;
	defaultShowTypingAnimation: boolean | undefined;
	defaultRuntimeMode: AgentRuntimeMode | undefined;
}> {
	const result: {
		mergedMessages: AgentRouterChatMessage[];
		initialSummary: string | undefined;
		defaultTrustLevel: "confirm_all" | "balanced" | "autonomous" | undefined;
		defaultGranularPermissions: GranularAgentPermissions | undefined;
		defaultCustomInstructions: string | undefined;
		defaultMemoryFacts: string[] | undefined;
		defaultDoctorSpecialization: string | undefined;
		defaultSpeedMode: "turbo" | "deep_reasoning" | undefined;
		defaultMaskPhiData: boolean | undefined;
		defaultModelRoutingMode: "server_managed" | "custom_byok" | undefined;
		defaultByokProvider: string | undefined;
		defaultByokApiKey: string | undefined;
		defaultByokModel: string | undefined;
		defaultByokBaseUrl: string | undefined;
		defaultTemperature: number | undefined;
		defaultContextLimitTokens: number | undefined;
		defaultShowTypingAnimation: boolean | undefined;
		defaultRuntimeMode: AgentRuntimeMode | undefined;
	} = {
		mergedMessages: params.incomingMessages,
		initialSummary: undefined,
		defaultTrustLevel: undefined,
		defaultGranularPermissions: undefined,
		defaultCustomInstructions: undefined,
		defaultMemoryFacts: undefined,
		defaultDoctorSpecialization: undefined,
		defaultSpeedMode: undefined,
		defaultMaskPhiData: undefined,
		defaultModelRoutingMode: undefined,
		defaultByokProvider: undefined,
		defaultByokApiKey: undefined,
		defaultByokModel: undefined,
		defaultByokBaseUrl: undefined,
		defaultTemperature: undefined,
		defaultContextLimitTokens: undefined,
		defaultShowTypingAnimation: undefined,
		defaultRuntimeMode: undefined,
	};

	try {
		await withTenantCtx(params.organizationId, async (tx) => {
			const prefRecord = await getDoctorPreferencesFromDb(
				params.organizationId,
				params.doctorId ?? null,
				tx,
			);
			const prefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
			const copilotSettings =
				prefs.copilotSettings && typeof prefs.copilotSettings === "object"
					? (prefs.copilotSettings as Record<string, unknown>)
					: undefined;

			if (copilotSettings) {
				if (
					copilotSettings.trustLevel === "confirm_all" ||
					copilotSettings.trustLevel === "balanced" ||
					copilotSettings.trustLevel === "autonomous"
				) {
					result.defaultTrustLevel = copilotSettings.trustLevel;
				}
				if (copilotSettings.granularPermissions && typeof copilotSettings.granularPermissions === "object") {
					const parsedPerms = granularPermissionsSchema.safeParse(copilotSettings.granularPermissions);
					if (parsedPerms.success) {
						result.defaultGranularPermissions = parsedPerms.data;
					}
				}
				if (typeof copilotSettings.customDoctorInstructions === "string" && copilotSettings.customDoctorInstructions.trim()) {
					result.defaultCustomInstructions = copilotSettings.customDoctorInstructions.trim();
				}
				if (typeof copilotSettings.clinicalSpecialization === "string" && copilotSettings.clinicalSpecialization.trim()) {
					result.defaultDoctorSpecialization = copilotSettings.clinicalSpecialization.trim();
				}
				if (copilotSettings.speedMode === "turbo" || copilotSettings.speedMode === "deep_reasoning") {
					result.defaultSpeedMode = copilotSettings.speedMode;
				}
				if (typeof copilotSettings.maskPhiData === "boolean") {
					result.defaultMaskPhiData = copilotSettings.maskPhiData;
				}
				if (copilotSettings.modelRoutingMode === "server_managed" || copilotSettings.modelRoutingMode === "custom_byok") {
					result.defaultModelRoutingMode = copilotSettings.modelRoutingMode;
				}
				if (typeof copilotSettings.byokProvider === "string" && copilotSettings.byokProvider.trim()) {
					result.defaultByokProvider = copilotSettings.byokProvider.trim();
				}
				if (typeof copilotSettings.byokApiKey === "string" && copilotSettings.byokApiKey.trim()) {
					result.defaultByokApiKey = copilotSettings.byokApiKey.trim();
				}
				if (typeof copilotSettings.byokModel === "string" && copilotSettings.byokModel.trim()) {
					result.defaultByokModel = copilotSettings.byokModel.trim();
				}
				if (typeof copilotSettings.byokBaseUrl === "string" && copilotSettings.byokBaseUrl.trim()) {
					result.defaultByokBaseUrl = copilotSettings.byokBaseUrl.trim();
				}
				if (
					typeof copilotSettings.temperature === "number" &&
					Number.isFinite(copilotSettings.temperature) &&
					copilotSettings.temperature >= 0 &&
					copilotSettings.temperature <= 2
				) {
					result.defaultTemperature = copilotSettings.temperature;
				}
				if (
					typeof copilotSettings.contextLimitTokens === "number" &&
					Number.isInteger(copilotSettings.contextLimitTokens) &&
					copilotSettings.contextLimitTokens > 0
				) {
					result.defaultContextLimitTokens = copilotSettings.contextLimitTokens;
				}
				if (typeof copilotSettings.showTypingAnimation === "boolean") {
					result.defaultShowTypingAnimation = copilotSettings.showTypingAnimation;
				}
				if (
					copilotSettings.runtimeMode === "web_browser" ||
					copilotSettings.runtimeMode === "desktop_native"
				) {
					result.defaultRuntimeMode = copilotSettings.runtimeMode;
				}
			}

			result.defaultMemoryFacts = extractMemoryFactStrings(prefs.copilotMemoryFacts);

			if (params.sessionId && UUID_REGEX.test(params.sessionId)) {
				const [existingSession] = await tx
					.select({
						id: copilotSessions.id,
						summary: copilotSessions.summary,
					})
					.from(copilotSessions)
					.where(
						and(
							eq(copilotSessions.id, params.sessionId),
							eq(copilotSessions.organizationId, params.organizationId),
						),
					)
					.limit(1);

				if (existingSession) {
					if (existingSession.summary) {
						result.initialSummary = existingSession.summary;
					}
					if (params.incomingMessages.length <= 1) {
						const dbRows = await tx
							.select({
								role: copilotMessages.role,
								content: copilotMessages.content,
							})
							.from(copilotMessages)
							.where(eq(copilotMessages.sessionId, params.sessionId))
							.orderBy(desc(copilotMessages.createdAt))
							.limit(30);

						if (dbRows.length > 0) {
							const orderedHistory: AgentRouterChatMessage[] = dbRows
								.reverse()
								.filter(
									(r): r is { role: "system" | "user" | "assistant" | "tool"; content: string } =>
										(r.role === "system" || r.role === "user" || r.role === "assistant" || r.role === "tool") &&
										typeof r.content === "string",
								)
								.map((r) => ({ role: r.role, content: r.content }));

							const firstIncoming = params.incomingMessages[0];
							const lastStored = orderedHistory[orderedHistory.length - 1];
							const isDuplicateLast =
								Boolean(firstIncoming) &&
								Boolean(lastStored) &&
								lastStored?.role === firstIncoming?.role &&
								(lastStored?.content ?? "") === (firstIncoming?.content ?? "");

							result.mergedMessages = isDuplicateLast
								? orderedHistory
								: [...orderedHistory, ...params.incomingMessages];
						}
					}
				}
			}
		});
	} catch (err) {
		params.logger.warn(
			{ err, organizationId: params.organizationId, sessionId: params.sessionId },
			"[agentChatRoutes] Failed to hydrate copilot context from PostgreSQL, continuing with request defaults",
		);
	}

	return result;
}

export async function handleAgentChat(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(
		request,
		reply,
		"agent chat",
	);
	if (!resolvedOrgId) return;

	const normalizedBody = normalizeIncomingBody(
		request.body,
		request.params as { sessionId?: string } | undefined,
		request.headers as Record<string, string | string[] | undefined>,
	);

	const parseResult = agentChatBodySchema.safeParse(normalizedBody);
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректное тело запроса для агента",
			details: parseResult.error.format(),
		});
	}

	const body = parseResult.data;
	const identity = getRequestIdentity(request);
	const doctorId = identity.userId || undefined;
	const rawSessionId = body.sessionId || body.conversationId;
	const effectiveSessionId = ensureValidUuid(rawSessionId);

	const hydratedContext = await loadAgentChatContextFromDb({
		organizationId: resolvedOrgId,
		doctorId,
		sessionId: effectiveSessionId,
		incomingMessages: body.messages as AgentRouterChatMessage[],
		logger: request.log,
	});
	const runtimeMode = resolveRuntimeMode(request, body.runtimeMode ?? hydratedContext.defaultRuntimeMode);

	const firstUserContent = body.messages.find((m) => m.role === "user")?.content;
	const initialSessionSummary =
		typeof firstUserContent === "string" && firstUserContent.trim().length > 0
			? firstUserContent.trim().slice(0, 140)
			: null;

	try {
		await getOrCreateSessionInDb(effectiveSessionId, resolvedOrgId, {
			userId: doctorId ?? null,
			patientId: body.patientId ?? null,
			summary: initialSessionSummary,
		});
	} catch (persistErr: unknown) {
		request.log.warn(
			{ err: persistErr, sessionId: effectiveSessionId },
			"[agentChatRoutes] Failed to ensure copilot session in PostgreSQL",
		);
	}

	const normalizedTrust = body.trustLevel ?? hydratedContext.defaultTrustLevel;
	const effectiveGranularPermissions = body.granularPermissions ?? hydratedContext.defaultGranularPermissions;
	const effectiveCustomInstructions = body.customInstructions ?? hydratedContext.defaultCustomInstructions;
	const effectiveMemoryFacts = body.memoryFacts ?? hydratedContext.defaultMemoryFacts;
	const effectiveDoctorSpecialization = body.doctorSpecialization ?? hydratedContext.defaultDoctorSpecialization;
	const effectiveSpeedMode = body.speedMode ?? hydratedContext.defaultSpeedMode;
	const effectiveMaskPhiData = body.maskPhiData ?? hydratedContext.defaultMaskPhiData;
	const effectiveInitialSummary = body.initialSummary ?? hydratedContext.initialSummary;
	const effectiveModelRoutingMode = body.modelRoutingMode ?? hydratedContext.defaultModelRoutingMode;
	const effectiveByokProvider = body.byokProvider ?? hydratedContext.defaultByokProvider;
	const effectiveByokApiKey =
		(body.byokApiKey && body.byokApiKey.trim().length > 0 ? body.byokApiKey.trim() : undefined) ??
		hydratedContext.defaultByokApiKey;
	const effectiveByokModel = body.byokModel ?? hydratedContext.defaultByokModel;
	const effectiveByokBaseUrl = body.byokBaseUrl ?? hydratedContext.defaultByokBaseUrl;
	const effectiveTemperature = body.temperature ?? hydratedContext.defaultTemperature;
	const effectiveContextLimitTokens = body.contextLimitTokens ?? hydratedContext.defaultContextLimitTokens;
	const effectiveShowTypingAnimation = body.showTypingAnimation ?? hydratedContext.defaultShowTypingAnimation;

	const isSseRequested =
		body.stream === true ||
		(request.headers.accept?.includes("text/event-stream") ?? false);

	const abortController = new AbortController();
	request.raw.on("close", () => {
		abortController.abort();
	});

	const ensureSessionPersistedForConfirmation = (): string => effectiveSessionId;

	// STREAMING SSE MODE
	if (isSseRequested) {
		reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
		reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
		reply.raw.setHeader("Connection", "keep-alive");
		reply.raw.setHeader("X-Accel-Buffering", "no");
		reply.raw.flushHeaders?.();

		try {
			const harnessResult = await runAgentHarness({
				messages: hydratedContext.mergedMessages,
				context: {
					organizationId: resolvedOrgId,
					doctorId,
					patientId: body.patientId,
					activeVisitId: body.activeVisitId,
					patientAllergies: body.patientAllergies || body.allergies,
					somaticHistory: body.somaticHistory,
					runtimeMode,
				},
				runtimeMode,
				maskPhiData: effectiveMaskPhiData,
				enableAutoCompaction: body.enableAutoCompaction,
				compactThresholdTokens: body.compactThresholdTokens,
				slidingWindowRetainedTurns: body.slidingWindowRetainedTurns,
				initialSummary: effectiveInitialSummary,
				trustLevel: normalizedTrust,
				granularPermissions: effectiveGranularPermissions,
				customInstructions: effectiveCustomInstructions,
				memoryFacts: effectiveMemoryFacts,
				doctorSpecialization: effectiveDoctorSpecialization,
				speedMode: effectiveSpeedMode,
				activeTooth: body.activeTooth,
				swarmRole: body.swarmRole,
				fallbackToDeterministicAgent: body.fallbackToDeterministicAgent,
				modelRoutingMode: effectiveModelRoutingMode,
				byokProvider: effectiveByokProvider,
				byokApiKey: effectiveByokApiKey,
				byokModel: effectiveByokModel,
				byokBaseUrl: effectiveByokBaseUrl,
				sessionId: effectiveSessionId,
				temperature: effectiveTemperature,
				contextLimitTokens: effectiveContextLimitTokens,
				showTypingAnimation: effectiveShowTypingAnimation,
				signal: abortController.signal,
				onEvent: (event: AgentHarnessEvent) => {
					if (!reply.raw.writableEnded) {
						if (event.type === "tool_start") {
							reply.raw.write(formatSseMessage("tool_call_started", { name: event.tool, arguments: event.args }));
							reply.raw.write(formatSseMessage("tool_start", event));
						} else if (event.type === "tool_end") {
							reply.raw.write(formatSseMessage("tool_call_finished", { name: event.tool, result: event.result }));
							reply.raw.write(formatSseMessage("tool_end", event));
						} else if (event.type === "confirmation_required") {
							const sessId = ensureSessionPersistedForConfirmation();
							defaultCopilotActionManager.registerPending(
								sessId,
								event.callId,
								event.tool,
								event.args,
								{ organizationId: resolvedOrgId, userId: doctorId },
							);
							reply.raw.write(formatSseMessage("confirmation_required", { ...event, sessionId: sessId }));
						} else if (event.type === "done") {
							const donePayload = effectiveSessionId ? { ...event, sessionId: effectiveSessionId } : event;
							reply.raw.write(formatSseMessage("final", donePayload));
							reply.raw.write(formatSseMessage("done", donePayload));
						} else {
							reply.raw.write(formatSseMessage(event.type, event));
						}
					}
				},
			});

			const targetSessionId = effectiveSessionId;
			if (targetSessionId) {
				try {
					const lastUserPrompt = [...body.messages].reverse().find((m) => m.role === "user")?.content;
					if (lastUserPrompt && typeof lastUserPrompt === "string" && lastUserPrompt.trim().length > 0) {
						await addMessageToDb({
							sessionId: targetSessionId,
							organizationId: resolvedOrgId,
							role: "user",
							content: lastUserPrompt.trim(),
							autoCompact: false,
						});
					}
					if (harnessResult?.text && typeof harnessResult.text === "string" && harnessResult.text.trim().length > 0) {
						await addMessageToDb({
							sessionId: targetSessionId,
							organizationId: resolvedOrgId,
							role: "assistant",
							content: harnessResult.text.trim(),
							toolCalls: harnessResult.toolCalls?.length
								? harnessResult.toolCalls.map((tc): Record<string, unknown> => ({
										tool: tc.tool,
										args: tc.args,
										result: tc.result,
								  }))
								: null,
							autoCompact: body.enableAutoCompaction ?? true,
						});
					}
				} catch (persistErr) {
					request.log.warn({ err: persistErr, targetSessionId }, "[agentChatRoutes] Failed to persist SSE copilot messages to PostgreSQL");
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (!reply.raw.writableEnded) {
				reply.raw.write(formatSseMessage("error", { error: msg }));
			}
		} finally {
			if (!reply.raw.writableEnded) {
				reply.raw.end();
			}
		}
		return;
	}

	// STANDARD JSON MODE
	try {
		const result = await runAgentHarness({
			messages: hydratedContext.mergedMessages,
			context: {
				organizationId: resolvedOrgId,
				doctorId,
				patientId: body.patientId,
				activeVisitId: body.activeVisitId,
				patientAllergies: body.patientAllergies || body.allergies,
				somaticHistory: body.somaticHistory,
				runtimeMode,
			},
			runtimeMode,
			maskPhiData: effectiveMaskPhiData,
			enableAutoCompaction: body.enableAutoCompaction,
			compactThresholdTokens: body.compactThresholdTokens,
			slidingWindowRetainedTurns: body.slidingWindowRetainedTurns,
			initialSummary: effectiveInitialSummary,
			trustLevel: normalizedTrust,
			granularPermissions: effectiveGranularPermissions,
			customInstructions: effectiveCustomInstructions,
			memoryFacts: effectiveMemoryFacts,
			doctorSpecialization: effectiveDoctorSpecialization,
			speedMode: effectiveSpeedMode,
			activeTooth: body.activeTooth,
			swarmRole: body.swarmRole,
			fallbackToDeterministicAgent: body.fallbackToDeterministicAgent,
			modelRoutingMode: effectiveModelRoutingMode,
			byokProvider: effectiveByokProvider,
			byokApiKey: effectiveByokApiKey,
			byokModel: effectiveByokModel,
			byokBaseUrl: effectiveByokBaseUrl,
			sessionId: effectiveSessionId,
			temperature: effectiveTemperature,
			contextLimitTokens: effectiveContextLimitTokens,
			showTypingAnimation: effectiveShowTypingAnimation,
			signal: abortController.signal,
			onEvent: (event: AgentHarnessEvent) => {
				if (event.type === "confirmation_required") {
					const sessId = ensureSessionPersistedForConfirmation();
					defaultCopilotActionManager.registerPending(
						sessId,
						event.callId,
						event.tool,
						event.args,
						{ organizationId: resolvedOrgId, userId: doctorId },
					);
				}
			},
		});

		const targetSessionId = effectiveSessionId;
		if (targetSessionId) {
			try {
				const lastUserPrompt = [...body.messages].reverse().find((m) => m.role === "user")?.content;
				if (lastUserPrompt && typeof lastUserPrompt === "string" && lastUserPrompt.trim().length > 0) {
					await addMessageToDb({
						sessionId: targetSessionId,
						organizationId: resolvedOrgId,
						role: "user",
						content: lastUserPrompt.trim(),
						autoCompact: false,
					});
				}
				if (result?.text && typeof result.text === "string" && result.text.trim().length > 0) {
					await addMessageToDb({
						sessionId: targetSessionId,
						organizationId: resolvedOrgId,
						role: "assistant",
						content: result.text.trim(),
						toolCalls: result.toolCalls?.length
							? result.toolCalls.map((tc): Record<string, unknown> => ({
									tool: tc.tool,
									args: tc.args,
									result: tc.result,
							  }))
							: null,
						autoCompact: body.enableAutoCompaction ?? true,
					});
				}
			} catch (persistErr) {
				request.log.warn({ err: persistErr, targetSessionId }, "[agentChatRoutes] Failed to persist JSON copilot messages to PostgreSQL");
			}
		}

		return reply.code(200).send({
			...(targetSessionId ? { sessionId: targetSessionId } : {}),
			text: result.text,
			toolCalls: result.toolCalls,
			iterations: result.iterations,
			runtimeMode,
			compacted: result.compacted,
			summary: result.summary,
			tokenUsage: result.tokenUsage,
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return reply.code(500).send({
			error: "AgentExecutionError",
			message: msg,
		});
	}
}

export async function registerAgentChatRoutes(
	server: FastifyInstance,
): Promise<void> {
	server.post(
		"/api/agent/chat",
		{ config: { tenantTxSelfManaged: true } },
		handleAgentChat,
	);
}
