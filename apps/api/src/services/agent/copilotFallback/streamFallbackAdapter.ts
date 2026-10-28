/**
 * streamFallbackAdapter.ts — Layer 3: Stream Fallback Adapter Facade for Local/Offline Copilot Execution.
 *
 * Decomposed under Mandate 8b into modular units:
 * - tokenStreamEmitter.ts (stream events, character/chunk streaming)
 * - sseFrameFormatter.ts (SSE framing, keepalive pings, error frames)
 * - clinicalFallbackRouter.ts (clinical domain commands: odontogram, Rx, DDI, SOAP, lab)
 * - operationalFallbackRouter.ts (scheduling, appointments, family deposits, revenue, 54-FZ)
 * - streamFallbackRecovery.ts (orchestrator with compound routing and knowledge fallback)
 */

export {
	emitDone,
	emitTextDelta,
	emitToolUse,
	streamCharacters,
	streamChunks,
} from "./adapter/tokenStreamEmitter.js";

export {
	formatSseData,
	formatSseError,
	formatSseEvent,
	formatSsePing,
	formatStreamEventAsSse,
} from "./adapter/sseFrameFormatter.js";

export {
	tryRouteClinicalFallback,
} from "./adapter/clinicalFallbackRouter.js";

export {
	tryRouteOperationalFallback,
} from "./adapter/operationalFallbackRouter.js";

export {
	routeCopilotFallback,
} from "./adapter/streamFallbackRecovery.js";
