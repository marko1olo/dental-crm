/**
 * agentHarness.ts — Autonomous Clinical Dental Agent ReAct Harness (Facade)
 *
 * Decomposed into modular architecture under apps/api/src/ai/harness/ per Mandate 8b:
 * - harnessTypes.ts: Event interfaces, options, and result contracts
 * - swarmRoles.ts: In-app multi-agent swarm role directives (Triage, Inquisitor, Sentinel, Vision)
 * - systemPromptBuilder.ts: EBM clinical prompt synthesis with runtimeMode & swarm awareness
 * - toolDispatcher.ts: Two-phase confirmation guard, tool invocation & stuck detection sentinel
 * - sessionLifecycle.ts: Autonomous ReAct loop runner with auto-compaction and streaming
 */

export {
	MAX_REACT_ITERATIONS,
	type AgentHarnessEventToken,
	type AgentHarnessEventReasoning,
	type AgentHarnessEventToolStart,
	type AgentHarnessEventToolEnd,
	type AgentHarnessEventConfirmationRequired,
	type AgentHarnessEventCompactTriggered,
	type AgentHarnessEventPlanUpdated,
	type AgentHarnessEventDone,
	type AgentHarnessEventError,
	type AgentHarnessEvent,
	type AgentHarnessParams,
	type AgentHarnessResult,
} from "./harness/harnessTypes.js";

export {
	type ClinicalSwarmRole,
	type SwarmRoleDefinition,
	CLINICAL_SWARM_ROLES,
	getSwarmRoleDirective,
} from "./harness/swarmRoles.js";

export {
	buildAgentSystemPrompt,
} from "./harness/systemPromptBuilder.js";

export {
	ToolDispatcher,
	type ToolDispatchResult,
} from "./harness/toolDispatcher.js";

export {
	runAgentHarness,
} from "./harness/sessionLifecycle.js";
