/**
 * deepseekFormatter.ts — Message and tool serializer for DeepSeek LLM Provider.
 */

import type { ProviderMessage, TextBlock, ToolResultBlock, ToolUseBlock } from "../../types.js";
import type { AgentTool, ChatOptions } from "../../omniGatewayTypes.js";
import { zodToJsonSchema } from "../../tools/schemaSerializer.js";

export interface FormattedDeepSeekMessage {
	role: string;
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	tool_call_id?: string;
}

export interface FormattedDeepSeekTool {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export function formatDeepSeekMessages(
	messages: ProviderMessage[],
	options: ChatOptions,
	isReasoner: boolean,
): FormattedDeepSeekMessage[] {
	const formattedMessages: FormattedDeepSeekMessage[] = [];

	if (options.system) {
		formattedMessages.push({
			role: "system",
			content: options.system,
		});
	}

	for (const msg of messages) {
		if (typeof msg.content === "string") {
			formattedMessages.push({
				role: msg.role,
				content: msg.content,
			});
			continue;
		}

		if (Array.isArray(msg.content)) {
			const textBlocks = msg.content.filter(
				(b): b is TextBlock => b.type === "text",
			);
			const toolUseBlocks = msg.content.filter(
				(b): b is ToolUseBlock => b.type === "tool_use",
			);
			const toolResultBlocks = msg.content.filter(
				(b): b is ToolResultBlock => b.type === "tool_result",
			);

			if (toolResultBlocks.length > 0) {
				for (const tr of toolResultBlocks) {
					formattedMessages.push({
						role: "tool",
						tool_call_id: tr.toolCallId,
						content:
							typeof tr.content === "string"
								? tr.content
								: JSON.stringify(tr.content),
					});
				}
			} else {
				const textContent = textBlocks.map((b) => b.text).join("\n");
				const toolCalls =
					toolUseBlocks.length > 0
						? toolUseBlocks.map((tu) => ({
								id: tu.id,
								type: "function" as const,
								function: {
									name: tu.name,
									arguments: JSON.stringify(tu.input),
								},
							}))
						: undefined;

				formattedMessages.push({
					role: msg.role,
					content: textContent || null,
					...(!isReasoner && toolCalls ? { tool_calls: toolCalls } : {}),
				});
			}
		}
	}

	return formattedMessages;
}

export function formatDeepSeekTools(
	tools: (AgentTool | Record<string, unknown>)[],
	isReasoner: boolean,
): FormattedDeepSeekTool[] | undefined {
	if (isReasoner || tools.length === 0) {
		return undefined;
	}

	return tools.map((t) => {
		if ("type" in t && t.type === "function") {
			return t as FormattedDeepSeekTool;
		}
		const agentTool = t as AgentTool;
		let parameters = agentTool.parameters;
		if (parameters && typeof (parameters as any).safeParse === "function") {
			parameters = zodToJsonSchema(parameters as any);
		}
		return {
			type: "function",
			function: {
				name: agentTool.name,
				description: agentTool.description ?? "",
				parameters: (parameters as Record<string, unknown>) ?? {
					type: "object",
					properties: {},
				},
			},
		};
	});
}
