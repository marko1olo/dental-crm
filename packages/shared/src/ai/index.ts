/**
 * @file packages/shared/src/ai/index.ts
 * @description Master clinical knowledge facade for @dental/shared/ai.
 * Cognitive architecture, dental clinical protocols, deterministic anesthesia engine,
 * emergency resuscitation protocols, token counter, auto-compaction sliding window engine,
 * and unified agent SSE events.
 */

export * from "./clinicalCognitiveCore.js";
export * from "./dentalProtocols.js";
export * from "./anesthesiaEngine.js";
export * from "./emergencyProtocols.js";
export * from "./toothGrammarSsot.js";
export * from "./tokenCompactor.js";
export {
	type ModelContextSpec,
	MODEL_CONTEXT_REGISTRY,
	DEFAULT_MODEL_CONTEXT_SPEC,
	getModelContextSpec,
	estimateTextTokens,
	estimateToolCallTokens,
	type ChatMessageLike,
	type ProviderUsageMetadata,
	type TokenUsageReport,
	buildTokenUsageReport,
} from "./tokenCounter.js";
export {
	type TokenCompactorOptions,
	type CompactedHistoryResult,
	type ClinicalEntitiesExtracted,
	type CompactMemorySnapshot,
	DEFAULT_RETAINED_RECENT_TURNS,
	DEFAULT_MAX_TOOL_OUTPUT_CHARS,
	DEFAULT_MAX_SUMMARY_CHARS,
	shouldCompactContext,
	extractEntitiesFromDialogue,
	pruneOldToolOutputs,
	buildExecutiveSummaryBlock,
	findCleanTurnCutIndex,
	compactConversationHistory,
	createMemorySnapshot,
} from "./contextCompactor.js";
export * from "./taskPlanTracker.js";
export * from "./agentEvents.js";

