/**
 * geminiFormatter.ts — Content and Tool serializer for Google Gemini REST API.
 */

import type { ProviderMessage } from "../../types.js";
import type { AgentTool } from "../../omniGatewayTypes.js";
import { zodToJsonSchema } from "../../tools/schemaSerializer.js";

export function cleanGeminiSchema(obj: unknown): unknown {
	if (!obj || typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map(cleanGeminiSchema);
	const cleaned: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		if (k === "additionalProperties" || k === "$schema") continue;
		cleaned[k] = cleanGeminiSchema(v);
	}
	return cleaned;
}

export const DEFAULT_GEMINI_MODEL_CASCADE: readonly string[] = [
	"gemini-3.5-flash-lite",
	"gemini-3.1-flash-lite",
	"gemini-3.8-flash",
	"gemini-3.7-flash",
	"gemini-3.6-flash",
	"gemini-3.5-flash",
	"gemini-3.1-pro",
	"gemini-3.1-pro-preview",
	"gemini-2.5-flash",
	"gemini-2.5-pro",
	"gemini-2.0-flash",
	"gemini-1.5-flash",
] as const;

export interface GeminiContentPart {
	text?: string;
	functionCall?: { name: string; args: Record<string, unknown> };
	functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
	role: "user" | "model";
	parts: GeminiContentPart[];
}

export function formatGeminiContents(messages: ProviderMessage[]): GeminiContent[] {
	const contents: GeminiContent[] = [];

	// Build toolCallId -> toolName mapping so Gemini functionResponse carries the valid declared function name
	const toolNameMap = new Map<string, string>();
	for (const msg of messages) {
		if (Array.isArray(msg.content)) {
			for (const block of msg.content) {
				if (block.type === "tool_use" && block.id && block.name) {
					toolNameMap.set(block.id, block.name);
				}
			}
		}
	}

	for (const msg of messages) {
		if (msg.role === "system") {
			continue;
		}

		if (typeof msg.content === "string") {
			contents.push({
				role: msg.role === "assistant" ? "model" : "user",
				parts: [{ text: msg.content }],
			});
			continue;
		}

		if (Array.isArray(msg.content)) {
			const parts: GeminiContentPart[] = [];

			for (const block of msg.content) {
				if (block.type === "text") {
					parts.push({ text: block.text });
				} else if (block.type === "tool_use") {
					parts.push({
						functionCall: {
							name: block.name,
							args: block.input,
						},
					});
				} else if (block.type === "tool_result") {
					const fnName =
						(block as any).toolName ||
						toolNameMap.get(block.toolCallId) ||
						block.toolCallId;
					parts.push({
						functionResponse: {
							name: fnName,
							response:
								typeof block.content === "object" && block.content !== null
									? (block.content as Record<string, unknown>)
									: { output: block.content },
						},
					});
				}
			}

			if (parts.length > 0) {
				const hasFunctionResponse = parts.some((p) => "functionResponse" in p);
				const role = hasFunctionResponse
					? "user"
					: msg.role === "assistant"
						? "model"
						: "user";
				contents.push({ role, parts });
			}
		}
	}

	if (contents.length === 0) {
		contents.push({ role: "user", parts: [{ text: "Привет" }] });
	}

	return contents;
}

export function formatGeminiFunctionDeclarations(
	tools: (AgentTool | Record<string, unknown>)[],
): Array<{ name: string; description: string; parameters: unknown }> | undefined {
	if (tools.length === 0) return undefined;

	return tools.map((t) => {
		if ("function" in t && typeof (t as any).function === "object") {
			const fn = (t as any).function;
			return {
				name: fn.name,
				description: fn.description || "",
				parameters: cleanGeminiSchema(fn.parameters),
			};
		}
		const agentTool = t as AgentTool;
		let parameters = agentTool.parameters;
		if (parameters && typeof (parameters as any).safeParse === "function") {
			parameters = zodToJsonSchema(parameters as any);
		}
		return {
			name: agentTool.name,
			description: agentTool.description || "",
			parameters: cleanGeminiSchema(parameters) || {
				type: "object",
				properties: {},
			},
		};
	});
}
