/**
 * @file apps/api/src/ai/copilotContextCompactor.ts
 * @description Transparent facade for DENTE AI Copilot Context Compactor.
 *
 * All canonical algorithms live in @dental/shared (Mandate 8bf — Single SSOT).
 */

export {
	type CompactorOptions,
	type CompactedResult,
	type CopilotMessageLike,
	type DoctorScreenContext,
	DEFAULT_COMPACTION_THRESHOLD,
	DEFAULT_COMPACTOR_RETAINED_RECENT_MESSAGES,
	DEFAULT_MAX_SUMMARY_LENGTH,
	shouldCompact,
	extractClinicalHighlights,
	formatMessageForSummary,
	generateContextSummary,
	compactMessageHistory,
	formatDoctorScreenContextPrompt,
	buildCompactedSystemPrompt,
} from "@dental/shared";
