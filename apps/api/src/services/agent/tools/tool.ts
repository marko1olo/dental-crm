/**
 * tool.ts — Tool definitions, categories, and result interfaces.
 */

import type { z } from "zod";
import type { AgentContext } from "../context.js";

export type ToolCategory = "read" | "write" | "destructive";

export interface ToolResult {
	readonly ok: boolean;
	readonly data?: unknown;
	readonly error?: string;
	readonly executionTimeMs: number;
}

// biome-ignore lint/suspicious/noExplicitAny: Handler takes typed or generic arguments
export type ToolHandler<TArgs = any, TResult = any> = (
	ctx: AgentContext,
	args: TArgs,
) => Promise<TResult>;

export interface ToolDefinition<
	// biome-ignore lint/suspicious/noExplicitAny: Zod schema for parameter validation
	TSchema extends z.ZodTypeAny = z.ZodTypeAny,
	TResult = unknown,
> {
	readonly name: string;
	readonly description: string;
	readonly parameters: TSchema;
	readonly handler: ToolHandler<z.infer<TSchema>, TResult>;
	readonly permissions: string[];
	readonly category: ToolCategory;
	/**
	 * When true, the tool returns free-form clinical prose (e.g. raw notes)
	 * that may contain un-tokenized PHI. The orchestrator excludes such tools
	 * from cloud LLM paths when strict redaction is active.
	 */
	readonly exposesFreeText?: boolean;
}
