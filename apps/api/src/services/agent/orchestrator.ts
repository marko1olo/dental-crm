/**
 * orchestrator.ts — Provider-agnostic tool-use loop and turn coordinator.
 *
 * Implements the reusable agentic engine:
 * 1. Stream completions from LLM provider through PHI redaction boundary.
 * 2. Buffer deltas and emit rehydrated tokens at safe boundary separators.
 * 3. Execute READ tools through the registry chokepoint automatically.
 * 4. Suspend turn on WRITE/DESTRUCTIVE tools for inline user confirmation.
 * 5. Track token usage and enforce per-session budgets.
 */

import type { AgentContext } from "./context.js";
import { Redactor } from "./redaction.js";
import type {
	BudgetGuard,
	ContentBlock,
	LLMProvider,
	ProviderMessage,
	TextBlock,
	ToolResultBlock,
	ToolUse,
	ToolUseBlock,
	TurnEvent,
	Usage,
} from "./types.js";

export interface RunTurnOptions {
	readonly ctx: AgentContext;
	readonly provider: LLMProvider;
	readonly system: string;
	readonly history: ProviderMessage[];
	readonly toolNames: string[];
	readonly redactor?: Redactor;
	readonly model?: string;
	readonly maxTokens?: number;
	readonly budget?: BudgetGuard;
	readonly dialect?: "openai" | "anthropic";
}

interface TurnAccumulator {
	textParts: string[];
	toolUses: ToolUse[];
	usage?: Usage;
	stopReason: string;
}

function filterEffectiveTools(
	ctx: AgentContext,
	toolNames: string[],
	redactor: Redactor,
): string[] {
	if (!redactor.enabled) return toolNames;
	const out: string[] = [];
	for (const name of toolNames) {
		const tool = ctx.tools.get(name);
		if (tool?.exposesFreeText) continue;
		out.push(name);
	}
	return out;
}

export async function* runTurn(
	options: RunTurnOptions,
): AsyncGenerator<TurnEvent, void, unknown> {
	const {
		ctx,
		provider,
		system,
		history,
		toolNames,
		redactor = new Redactor(),
		model,
		maxTokens = 4096,
		budget,
		dialect = "openai",
	} = options;

	while (true) {
		if (budget && !budget.check()) {
			yield { type: "budget_exceeded" };
			return;
		}

		const effective = filterEffectiveTools(ctx, toolNames, redactor);
		const schemas =
			effective.length > 0 ? ctx.tools.schemasFor(effective, dialect) : [];
		const outgoing = redactor.redactOutgoing(history);

		const acc: TurnAccumulator = {
			textParts: [],
			toolUses: [],
			stopReason: "stop",
		};

		const completeParams: Parameters<LLMProvider["complete"]>[0] = {
			system,
			messages: outgoing,
			tools: schemas,
			maxTokens,
		};
		if (model !== undefined) {
			completeParams.model = model;
		}

		const stream = provider.complete(completeParams);

		for await (const ev of stream) {
			if (ev.type === "text_delta") {
				acc.textParts.push(ev.text);
				const rehydrated = redactor.rehydrateDelta(ev.text);
				if (rehydrated) {
					yield { type: "token", text: rehydrated };
				}
			} else if (ev.type === "tool_use") {
				acc.toolUses.push(ev);
			} else if (ev.type === "usage") {
				acc.usage = ev;
			} else if (ev.type === "done") {
				acc.stopReason = ev.stopReason;
			}
		}

		const flushed = redactor.flushDeltaBuffer();
		if (flushed) {
			yield { type: "token", text: flushed };
		}

		if (acc.usage) {
			budget?.record(acc.usage.inputTokens, acc.usage.outputTokens);
			yield {
				type: "usage",
				inputTokens: acc.usage.inputTokens,
				outputTokens: acc.usage.outputTokens,
			};
		}

		// Persist assistant message into history in REAL cleartext space
		const assistantBlocks: ContentBlock[] = [];
		if (acc.textParts.length > 0) {
			const fullText = acc.textParts.join("");
			assistantBlocks.push({
				type: "text",
				text: redactor.rehydrate(fullText),
			} as TextBlock);
		}

		for (const tu of acc.toolUses) {
			assistantBlocks.push({
				type: "tool_use",
				id: tu.id,
				name: tu.name,
				input: redactor.resolveArgs(tu.input),
			} as ToolUseBlock);
		}

		history.push({
			role: "assistant",
			content: assistantBlocks,
		});

		// If no tools were invoked, turn is complete
		if (acc.toolUses.length === 0) {
			yield { type: "final", stopReason: acc.stopReason };
			return;
		}

		let writeToolToConfirm: { tu: ToolUse; realArgs: Record<string, unknown> } | null = null;

		for (const tu of acc.toolUses) {
			const realArgs = redactor.resolveArgs(tu.input);
			const tool = ctx.tools.get(tu.name);

			if (!tool) {
				history.push({
					role: "tool",
					content: [
						{
							type: "tool_result",
							toolCallId: tu.id,
							content: { error: `unknown tool: ${tu.name}` },
							isError: true,
						} as ToolResultBlock,
					],
				});
				continue;
			}

			// READ tools execute immediately and continue loop
			if (tool.category === "read") {
				yield {
					type: "tool_call_started",
					callId: tu.id,
					name: tu.name,
					arguments: realArgs,
				};

				const res = await ctx.tools.call(ctx, tu.name, realArgs);
				const payload = res.ok ? res.data : { error: res.error };

				history.push({
					role: "tool",
					content: [
						{
							type: "tool_result",
							toolCallId: tu.id,
							content: payload,
							isError: !res.ok,
						} as ToolResultBlock,
					],
				});

				yield {
					type: "tool_call_finished",
					callId: tu.id,
					name: tu.name,
					ok: res.ok,
					result: payload,
				};
				continue;
			}

			// WRITE / DESTRUCTIVE tools: record for suspension
			if (!writeToolToConfirm) {
				writeToolToConfirm = { tu, realArgs };
			}
		}

		if (writeToolToConfirm) {
			yield {
				type: "confirmation_required",
				callId: writeToolToConfirm.tu.id,
				name: writeToolToConfirm.tu.name,
				arguments: writeToolToConfirm.realArgs,
			};
			return;
		}
	}
}

/**
 * Simple in-memory token budget guard for rate/cost capping.
 */
export class TokenBudgetGuard implements BudgetGuard {
	private usedInputTokens = 0;
	private usedOutputTokens = 0;

	constructor(public readonly maxTotalTokens: number = 100_000) {}

	public check(): boolean {
		return this.usedInputTokens + this.usedOutputTokens < this.maxTotalTokens;
	}

	public record(inputTokens: number, outputTokens: number): void {
		this.usedInputTokens += inputTokens;
		this.usedOutputTokens += outputTokens;
	}

	public getUsage(): {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	} {
		return {
			inputTokens: this.usedInputTokens,
			outputTokens: this.usedOutputTokens,
			totalTokens: this.usedInputTokens + this.usedOutputTokens,
		};
	}
}

/**
 * AgentOrchestrator — facade coordinating agent execution turns.
 */
export class AgentOrchestrator {
	public static runTurnStream(
		options: RunTurnOptions,
	): AsyncGenerator<TurnEvent, void, unknown> {
		return runTurn(options);
	}
}

