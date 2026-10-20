/**
 * @file apps/api/src/ai/contextCompactor.ts
 * @description Fastify AI Context Compactor & Sliding Window Adapter for DENTE Clinic.
 *
 * Re-exports Level 1 Tool Pruning, Level 2 Sliding Window & Summarization, and Level 3 Memory Snapshots.
 */

export {
	DEFAULT_RETAINED_RECENT_TURNS,
	DEFAULT_MAX_TOOL_OUTPUT_CHARS,
	DEFAULT_MAX_SUMMARY_CHARS,
	type TokenCompactorOptions,
	type CompactedHistoryResult,
	type ClinicalEntitiesExtracted,
	type CompactMemorySnapshot,
	shouldCompactContext,
	extractEntitiesFromDialogue,
	pruneOldToolOutputs,
	buildExecutiveSummaryBlock,
	findCleanTurnCutIndex,
	compactConversationHistory,
	createMemorySnapshot,
} from "@dental/shared";
