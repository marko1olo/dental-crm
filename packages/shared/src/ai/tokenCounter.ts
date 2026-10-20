/**
 * @file packages/shared/src/ai/tokenCounter.ts
 * @description Master Token Counter, BPE Heuristics & Model Context Registry for DENTE AI.
 *
 * Implements:
 * 1. Dual-language BPE heuristic estimator (Cyrillic ~2.4 chars/token, Latin/Code ~4 chars/token).
 * 2. OpenAI / DeepSeek Tool Calling envelope overhead accounting.
 * 3. Actual token calibration against provider metadata (usage: prompt_tokens, completion_tokens).
 * 4. Model context window limits registry with configurable compaction thresholds (default 75-80%).
 */

export interface ModelContextSpec {
	readonly model: string;
	readonly contextLimit: number;
	readonly defaultCompactThreshold: number; // e.g. 75% of contextLimit
}

export const MODEL_CONTEXT_REGISTRY: Record<string, ModelContextSpec> = {
	"deepseek-v4-flash": {
		model: "deepseek-v4-flash",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
	"deepseek-chat": {
		model: "deepseek-chat",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
	"deepseek-v3": {
		model: "deepseek-v3",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
	"deepseek-reasoner": {
		model: "deepseek-reasoner",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
	"deepseek-r1": {
		model: "deepseek-r1",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
	"gpt-4o": {
		model: "gpt-4o",
		contextLimit: 128_000,
		defaultCompactThreshold: 96_000,
	},
	"gpt-4o-mini": {
		model: "gpt-4o-mini",
		contextLimit: 128_000,
		defaultCompactThreshold: 96_000,
	},
	"claude-3-5-sonnet": {
		model: "claude-3-5-sonnet",
		contextLimit: 200_000,
		defaultCompactThreshold: 150_000,
	},
	default: {
		model: "default",
		contextLimit: 64_000,
		defaultCompactThreshold: 48_000,
	},
};

export const DEFAULT_MODEL_CONTEXT_SPEC: ModelContextSpec = {
	model: "default",
	contextLimit: 64_000,
	defaultCompactThreshold: 48_000,
};

/**
 * Resolves context limit and compaction threshold for a given model identifier.
 */
export function getModelContextSpec(modelName?: string): ModelContextSpec {
	if (!modelName) {
		return DEFAULT_MODEL_CONTEXT_SPEC;
	}
	const normalized = modelName.trim().toLowerCase();
	const exact = MODEL_CONTEXT_REGISTRY[normalized];
	if (exact) {
		return exact;
	}
	for (const [key, spec] of Object.entries(MODEL_CONTEXT_REGISTRY)) {
		if (normalized.includes(key)) {
			return spec;
		}
	}
	return DEFAULT_MODEL_CONTEXT_SPEC;
}

/**
 * Estimates token count of a text string using byte-pair / alphabet heuristics:
 * - Cyrillic characters (Russian / Ukrainian): ~2.4 characters per token (approx 0.42 tokens/char)
 * - Latin / ASCII digits / common symbols: ~4 characters per token (approx 0.25 tokens/char)
 * - Whitespace sequences & newlines: accounted with minimal token boundaries
 * - Other Unicode (CJK, emojis): ~1-1.5 tokens per char
 */
export function estimateTextTokens(text: string | null | undefined): number {
	if (!text) {
		return 0;
	}
	const str = String(text);
	if (str.length === 0) {
		return 0;
	}

	let cyrillicCount = 0;
	let latinAndDigitsCount = 0;
	let whitespaceCount = 0;
	let otherUnicodeCount = 0;
	let punctuationCount = 0;

	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);

		// Cyrillic range: U+0400 to U+04FF (and Extended U+0500 to U+052F)
		if ((code >= 0x0400 && code <= 0x04ff) || (code >= 0x0500 && code <= 0x052f)) {
			cyrillicCount++;
		}
		// ASCII Latin: a-z, A-Z, 0-9
		else if (
			(code >= 0x41 && code <= 0x5a) ||
			(code >= 0x61 && code <= 0x7a) ||
			(code >= 0x30 && code <= 0x39)
		) {
			latinAndDigitsCount++;
		}
		// Whitespace: space, tab, newline
		else if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
			whitespaceCount++;
		}
		// Common punctuation & symbols in ASCII
		else if (code >= 0x21 && code <= 0x2f || (code >= 0x3a && code <= 0x40) || (code >= 0x5b && code <= 0x60) || (code >= 0x7b && code <= 0x7e)) {
			punctuationCount++;
		}
		// Other Unicode (emojis, CJK, special symbols)
		else {
			otherUnicodeCount++;
		}
	}

	// Token approximations:
	// - Russian Cyrillic: ~2.4 chars per token -> 0.417 tokens / char
	// - Latin & digits: ~4.0 chars per token -> 0.25 tokens / char
	// - Whitespace: words separated by space, average 1 token per 3 spaces/newlines
	// - Punctuation: ~0.5 tokens per char
	// - Other Unicode: ~1.2 tokens per char
	const cyrillicTokens = cyrillicCount * 0.42;
	const latinTokens = latinAndDigitsCount * 0.25;
	const whitespaceTokens = whitespaceCount * 0.33;
	const punctuationTokens = punctuationCount * 0.5;
	const otherTokens = otherUnicodeCount * 1.2;

	const rawTotal = cyrillicTokens + latinTokens + whitespaceTokens + punctuationTokens + otherTokens;
	return Math.max(1, Math.ceil(rawTotal));
}

/**
 * Estimates tokens for an individual tool call object:
 * - Function name
 * - Arguments (JSON string or object)
 * - OpenAI protocol envelope overhead (~12 tokens)
 */
export function estimateToolCallTokens(toolCall: unknown): number {
	if (!toolCall || typeof toolCall !== "object") {
		return 0;
	}

	const tc = toolCall as {
		id?: string;
		type?: string;
		function?: { name?: string; arguments?: unknown };
		name?: string;
		arguments?: unknown;
	};

	const funcName = tc.function?.name || tc.name || "";
	const rawArgs = tc.function?.arguments !== undefined ? tc.function.arguments : tc.arguments;
	const argsStr = typeof rawArgs === "string" ? rawArgs : rawArgs ? JSON.stringify(rawArgs) : "";

	// Envelope overhead (id, type: 'function', wrapper tags) ~ 12 tokens
	const envelopeTokens = 12;
	const nameTokens = estimateTextTokens(funcName);
	const argsTokens = estimateTextTokens(argsStr);

	return envelopeTokens + nameTokens + argsTokens;
}

export interface ChatMessageLike {
	role?: string;
	content?: string | null;
	reasoning_content?: string | null;
	tool_call_id?: string;
	tool_calls?: unknown[];
	name?: string;
}

/**
 * Estimates tokens for a single chat message (role, content, CoT, tool calls, tool responses).
 */
export function estimateMessageTokens(message: ChatMessageLike): number {
	if (!message || typeof message !== "object") {
		return 0;
	}

	// Standard ChatML / OpenAI message envelope: <|im_start|>role\n...<|im_end|>\n = 4 tokens
	let tokens = 4;

	if (message.name) {
		tokens += estimateTextTokens(message.name);
	}

	if (message.content) {
		tokens += estimateTextTokens(message.content);
	}

	if (message.reasoning_content) {
		tokens += estimateTextTokens(message.reasoning_content);
	}

	if (message.tool_call_id) {
		tokens += 2 + estimateTextTokens(message.tool_call_id);
	}

	if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
		for (const tc of message.tool_calls) {
			tokens += estimateToolCallTokens(tc);
		}
	}

	return tokens;
}

/**
 * Estimates total conversation tokens across an array of messages and an optional system prompt.
 */
export function estimateConversationTokens(
	messages: ChatMessageLike[],
	systemPrompt?: string | null,
): number {
	let total = 3; // Priming tokens for assistant generation turn (<|im_start|>assistant\n)

	if (systemPrompt && (!messages[0] || messages[0].role !== "system")) {
		total += estimateMessageTokens({ role: "system", content: systemPrompt });
	}

	for (const msg of messages) {
		total += estimateMessageTokens(msg);
	}

	return total;
}

export interface ProviderUsageMetadata {
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

export interface TokenUsageReport {
	estimatedPromptTokens: number;
	actualPromptTokens?: number | undefined;
	completionTokens?: number | undefined;
	totalTokens: number;
	cachedTokens?: number | undefined;
	reasoningTokens?: number | undefined;
	calibrationRatio?: number | undefined; // actual / estimated
}

/**
 * Creates a calibrated token usage report combining heuristic estimation and provider metadata.
 */
export function buildTokenUsageReport(
	messages: ChatMessageLike[],
	providerUsage?: ProviderUsageMetadata | null,
	systemPrompt?: string | null,
): TokenUsageReport {
	const estimatedPrompt = estimateConversationTokens(messages, systemPrompt);

	if (!providerUsage) {
		return {
			estimatedPromptTokens: estimatedPrompt,
			totalTokens: estimatedPrompt,
		};
	}

	const actualPrompt = providerUsage.prompt_tokens;
	const completion = providerUsage.completion_tokens;
	const total = providerUsage.total_tokens || actualPrompt + completion;
	const calibrationRatio =
		estimatedPrompt > 0 ? Number((actualPrompt / estimatedPrompt).toFixed(2)) : 1.0;

	return {
		estimatedPromptTokens: estimatedPrompt,
		actualPromptTokens: actualPrompt,
		completionTokens: completion,
		totalTokens: total,
		cachedTokens: providerUsage.prompt_tokens_details?.cached_tokens,
		reasoningTokens: providerUsage.completion_tokens_details?.reasoning_tokens,
		calibrationRatio,
	};
}export const estimateTokenCount = estimateTextTokens;
export const calculateTokenUsageReport = buildTokenUsageReport;
