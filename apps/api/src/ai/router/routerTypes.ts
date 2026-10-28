/**
 * routerTypes.ts — Type definitions, constants, and custom errors for AgentRouter Client
 */

export const DEFAULT_AGENTROUTER_BASE_URL = "https://agentrouter.org/v1";
export const DEFAULT_AGENTROUTER_MODEL = "deepseek-v4-flash";
export const DEFAULT_AGENTROUTER_KEYS: readonly string[] = Object.freeze([
	"sk-6osQfoRXkSyFDuySQOAotuSU74uh75f4gGj69e2zqaVytT3u",
	"sk-LhzyJtJxTfDf7enG1bbfrCmK1Aq73Sh9B188hwJNCXm2cENL",
]);

export const DEFAULT_TIMEOUT_MS = 120_000; // 120 seconds for deep reasoning models
export const MIN_REASONING_MAX_TOKENS = 4096;
export const DEFAULT_CLINICAL_TEMPERATURE = 0.2;

// Cooldown intervals
export const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60s for 429
export const SERVER_ERROR_COOLDOWN_MS = 60_000; // 60s for 5xx / timeout
export const AUTH_ERROR_COOLDOWN_MS = 3_600_000; // 1 hour for 401/403 invalid key
export const MODEL_OVERLOAD_COOLDOWN_MS = 1_800_000; // 30 minutes (1800s) for 402 budget pool

export type AgentRouterRole = "system" | "user" | "assistant" | "tool";

export interface AgentRouterToolCallFunction {
	name: string;
	arguments: string; // JSON string payload per OpenAI spec
}

export interface AgentRouterToolCall {
	id: string;
	type: "function";
	function: AgentRouterToolCallFunction;
}

export interface AgentRouterChatMessage {
	role: AgentRouterRole;
	content?: string | null;
	name?: string;
	tool_call_id?: string;
	tool_calls?: AgentRouterToolCall[];
	reasoning_content?: string | null;
}

export interface AgentRouterToolDefinition {
	type: "function";
	function: {
		name: string;
		description?: string;
		parameters?: Record<string, unknown>;
		strict?: boolean;
	};
}

export type AgentRouterToolChoice =
	| "auto"
	| "none"
	| "required"
	| { type: "function"; function: { name: string } };

export interface AgentRouterChatParams {
	messages: AgentRouterChatMessage[];
	model?: string | undefined;
	tools?: AgentRouterToolDefinition[] | undefined;
	tool_choice?: AgentRouterToolChoice | undefined;
	temperature?: number | undefined; // default 0.2
	max_tokens?: number | undefined; // default >= 4096
	top_p?: number | undefined;
	frequency_penalty?: number | undefined;
	presence_penalty?: number | undefined;
	stop?: string | string[] | undefined;
	response_format?: { type: "text" | "json_object" } | undefined;
	timeoutMs?: number | undefined; // default 120s
	signal?: AbortSignal | undefined;
}

export interface AgentRouterChoice {
	index: number;
	message: {
		role: "assistant";
		content: string | null;
		tool_calls?: AgentRouterToolCall[] | undefined;
		reasoning_content?: string | null | undefined;
	};
	finish_reason: string | null;
}

export interface AgentRouterUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	prompt_tokens_details?: {
		cached_tokens?: number;
	};
	completion_tokens_details?: {
		reasoning_tokens?: number;
	};
}

export interface AgentRouterChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: AgentRouterChoice[];
	usage?: AgentRouterUsage;
	system_fingerprint?: string | null;
}

export interface AgentRouterToolCallDelta {
	index: number;
	id?: string;
	type?: "function";
	function?: {
		name?: string;
		arguments?: string;
	};
}

export interface AgentRouterStreamCallbacks {
	onChunk?: (contentChunk: string) => void;
	onReasoningChunk?: (reasoningChunk: string) => void;
	onToolCallDelta?: (delta: AgentRouterToolCallDelta) => void;
	onComplete?: (fullResponse: AgentRouterChatResponse) => void;
	onError?: (error: Error) => void;
}

export interface AgentRouterClientConfig {
	baseUrl?: string;
	defaultModel?: string;
	apiKeys?: string[];
	fetchFn?: typeof fetch;
}

export interface KeyHealthInfo {
	keyMask: string;
	cooldownUntil: number;
	isAvailable: boolean;
	failures: number;
}

export interface ModelHealthInfo {
	model: string;
	bannedUntil: number;
	isBanned: boolean;
}

/**
 * Error raised when a model's budget pool quota is exhausted (HTTP 402).
 * Note: the API key itself is NOT banned; only the specific model enters cooldown.
 */
export class AgentRouterModelOverloadedError extends Error {
	readonly status = 402;
	readonly model: string;
	readonly cooldownSeconds: number;

	constructor(model: string, cooldownSeconds: number, rawMessage?: string) {
		super(
			`AgentRouter model '${model}' budget pool quota exhausted (HTTP 402). Model banned for ${cooldownSeconds}s. Raw: ${rawMessage ?? "Budget pool quota has been exhausted"}`,
		);
		this.name = "AgentRouterModelOverloadedError";
		this.model = model;
		this.cooldownSeconds = cooldownSeconds;
	}
}

/**
 * Error raised when all API keys in the pool are on cooldown or exhausted.
 */
export class AgentRouterAllKeysExhaustedError extends Error {
	readonly status = 429;
	readonly availableInMs: number;

	constructor(availableInMs: number) {
		super(
			`All AgentRouter API keys are currently cooling down. Next available in ${Math.ceil(availableInMs / 1000)}s.`,
		);
		this.name = "AgentRouterAllKeysExhaustedError";
		this.availableInMs = availableInMs;
	}
}
