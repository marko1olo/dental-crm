/**
 * @file packages/shared/src/ai/reasoningStripper.ts
 * @description SOTA reasoning/CoT stripper and streaming filter for DENTE AI Copilot.
 * Ported and adapted from battle-tested stomchat (strip_reasoning) & dvachbot (strip_cot_and_drafts).
 *
 * Ensures chain-of-thought internal deliberations (<think>...</think>, <thought>...</thought>,
 * <reasoning>...</reasoning>) are cleanly extracted into thinking events and NEVER leaked
 * into clinical dialogue seen by the doctor or patient.
 */

const REASONING_TAG_REGEX = /<(?:think|thought|reasoning)>[\s\S]*?<\/(?:think|thought|reasoning)>/gi;
const UNCLOSED_TAG_REGEX = /<(?:think|thought|reasoning)>(?![\s\S]*?<\/(?:think|thought|reasoning)>)[\s\S]*$/i;

const OPENING_TAGS = ["<think>", "<thought>", "<reasoning>"] as const;
const CLOSING_TAGS = ["</think>", "</thought>", "</reasoning>"] as const;

function isOpeningTagPrefix(s: string): boolean {
	const lower = s.toLowerCase();
	return OPENING_TAGS.some((tag) => tag.startsWith(lower));
}

function isClosingTagPrefix(s: string): boolean {
	const lower = s.toLowerCase();
	return CLOSING_TAGS.some((tag) => tag.startsWith(lower));
}

/**
 * Strips all closed and unclosed chain-of-thought reasoning blocks from text.
 * Deterministic and safe against streaming truncation.
 */
export function stripReasoning(text: string): string {
	if (!text || typeof text !== "string") {
		return "";
	}

	// 1. Remove all complete reasoning blocks
	let cleaned = text.replace(REASONING_TAG_REGEX, "");

	// 2. Remove unclosed trailing reasoning blocks (e.g. stream aborted or cut off by max_tokens)
	cleaned = cleaned.replace(UNCLOSED_TAG_REGEX, "");

	// 3. Fallback check for any lone opening tag
	const loneThinkIdx = cleaned.search(/<(?:think|thought|reasoning)>/i);
	if (loneThinkIdx !== -1) {
		cleaned = cleaned.slice(0, loneThinkIdx);
	}

	return cleaned.trim();
}

/**
 * Extracts reasoning and clean text content from model outputs.
 */
export function extractReasoningAndContent(text: string): {
	content: string;
	reasoning: string | null;
} {
	if (!text || typeof text !== "string") {
		return { content: "", reasoning: null };
	}

	const reasoningParts: string[] = [];

	// Match complete blocks
	const completeMatches = text.matchAll(
		/<(?:think|thought|reasoning)>([\s\S]*?)<\/(?:think|thought|reasoning)>/gi,
	);
	for (const match of completeMatches) {
		const part = match[1]?.trim();
		if (part) reasoningParts.push(part);
	}

	// Check unclosed trailing block
	const unclosedMatch = text.match(
		/<(?:think|thought|reasoning)>((?![\s\S]*?<\/(?:think|thought|reasoning)>)[\s\S]*)$/i,
	);
	if (unclosedMatch && unclosedMatch[1]) {
		const part = unclosedMatch[1].trim();
		if (part && !reasoningParts.includes(part)) {
			reasoningParts.push(part);
		}
	}

	const content = stripReasoning(text);
	const reasoning = reasoningParts.length > 0 ? reasoningParts.join("\n\n") : null;

	return { content, reasoning };
}

export interface StreamingReasoningCallbacks {
	onTextDelta?: (text: string) => void;
	onThinkingDelta?: (text: string) => void;
}

/**
 * Real-time streaming filter that separates text_delta from thinking_delta across SSE chunks.
 * Handles split tags across chunk boundaries (e.g., "<th" + "ink>").
 */
export class StreamingReasoningFilter {
	private inReasoning = false;
	private tagBuffer = "";
	private readonly callbacks: StreamingReasoningCallbacks;

	constructor(callbacks: StreamingReasoningCallbacks = {}) {
		this.callbacks = callbacks;
	}

	/**
	 * Feed an incoming raw text chunk from the LLM stream.
	 */
	public feed(chunk: string): void {
		if (!chunk) return;

		let i = 0;
		while (i < chunk.length) {
			if (!this.inReasoning) {
				// We are looking for opening tag: <think>, <thought>, <reasoning>
				if (this.tagBuffer.length > 0 || chunk[i] === "<") {
					this.tagBuffer += chunk[i];
					i++;

					const lowerBuf = this.tagBuffer.toLowerCase();
					if (OPENING_TAGS.includes(lowerBuf as any)) {
						this.inReasoning = true;
						this.tagBuffer = "";
					} else if (!isOpeningTagPrefix(this.tagBuffer)) {
						// Tag buffer does not match prefix of any opening tag, flush as text
						this.callbacks.onTextDelta?.(this.tagBuffer);
						this.tagBuffer = "";
					}
				} else {
					// Normal text outside reasoning
					const nextTagIdx = chunk.indexOf("<", i);
					if (nextTagIdx === -1) {
						this.callbacks.onTextDelta?.(chunk.slice(i));
						break;
					} else {
						if (nextTagIdx > i) {
							this.callbacks.onTextDelta?.(chunk.slice(i, nextTagIdx));
						}
						i = nextTagIdx;
						this.tagBuffer += chunk[i];
						i++;
					}
				}
			} else {
				// We are in reasoning mode, looking for closing tag: </think>, </thought>, </reasoning>
				if (this.tagBuffer.length > 0 || chunk[i] === "<") {
					this.tagBuffer += chunk[i];
					i++;

					const lowerBuf = this.tagBuffer.toLowerCase();
					if (CLOSING_TAGS.includes(lowerBuf as any)) {
						this.inReasoning = false;
						this.tagBuffer = "";
					} else if (!isClosingTagPrefix(this.tagBuffer)) {
						// Not a valid closing tag prefix, flush buffer to thinking
						this.callbacks.onThinkingDelta?.(this.tagBuffer);
						this.tagBuffer = "";
					}
				} else {
					// Normal thinking text inside reasoning
					const nextTagIdx = chunk.indexOf("<", i);
					if (nextTagIdx === -1) {
						this.callbacks.onThinkingDelta?.(chunk.slice(i));
						break;
					} else {
						if (nextTagIdx > i) {
							this.callbacks.onThinkingDelta?.(chunk.slice(i, nextTagIdx));
						}
						i = nextTagIdx;
						this.tagBuffer += chunk[i];
						i++;
					}
				}
			}
		}
	}

	/**
	 * Flush any pending buffered tokens at end of stream.
	 */
	public flush(): void {
		if (this.tagBuffer.length > 0) {
			if (this.inReasoning) {
				this.callbacks.onThinkingDelta?.(this.tagBuffer);
			} else {
				this.callbacks.onTextDelta?.(this.tagBuffer);
			}
			this.tagBuffer = "";
		}
	}
}
