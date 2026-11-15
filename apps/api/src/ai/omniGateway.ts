/**
 * omniGateway.ts — Omni-LLM Gateway Factory & Multi-Provider Router SSOT.
 *
 * Provides structured JSON extraction and LLM routing for background daemons and copilot services.
 */

import { z } from "zod";
import { stripReasoning } from "@dental/shared/ai";
import { createChatCompletion } from "./agentRouterClient.js";
import type { AgentRouterRole } from "./router/routerTypes.js";
import type { ChatOptions } from "./omniGatewayTypes.js";

export * from "./omniGatewayTypes.js";

function normalizeAgentRouterRole(role: string): AgentRouterRole {
	if (
		role === "system" ||
		role === "user" ||
		role === "assistant" ||
		role === "tool"
	) {
		return role;
	}
	return "user";
}

export function extractJsonText(rawText: string): string {
	const stripped = stripReasoning(rawText);

	// 1. If wrapped in markdown code fence, extract fence content
	const codeBlockMatch = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	if (codeBlockMatch?.[1]) {
		return codeBlockMatch[1].trim();
	}

	// 2. Locate outermost JSON object or array
	const firstBrace = stripped.indexOf("{");
	const firstBracket = stripped.indexOf("[");
	let startIdx = -1;
	if (firstBrace !== -1 && firstBracket !== -1) {
		startIdx = Math.min(firstBrace, firstBracket);
	} else if (firstBrace !== -1) {
		startIdx = firstBrace;
	} else if (firstBracket !== -1) {
		startIdx = firstBracket;
	}

	if (startIdx !== -1) {
		const isObject = stripped[startIdx] === "{";
		const endChar = isObject ? "}" : "]";
		const lastIdx = stripped.lastIndexOf(endChar);
		if (lastIdx > startIdx) {
			return stripped.slice(startIdx, lastIdx + 1).trim();
		}
	}

	return stripped
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "")
		.trim();
}

export class OmniLlmGateway {
	public async generateStructuredJson<T>(
		schema: z.ZodType<T>,
		messages: Array<{ role: string; content: string }>,
		options: ChatOptions = {},
	): Promise<{ data: T; rawText: string }> {
		const systemInstruction = [
			options.system ?? "You are a specialized clinical AI assistant.",
			"IMPORTANT: Your response MUST be a valid JSON object strictly matching the schema.",
			"Do not include any introductory commentary, explanation, or markdown formatting tags outside the JSON object.",
		].join("\n\n");

		const res = await createChatCompletion({
			messages: [
				{ role: "system", content: systemInstruction },
				...messages.map((m) => ({
					role: normalizeAgentRouterRole(m.role),
					content: m.content,
				})),
			],
			model: options.modelId ?? options.model,
			temperature: options.temperature ?? 0.1,
			max_tokens: options.maxTokens,
			response_format: options.responseFormat,
			timeoutMs: options.timeoutMs,
			signal: options.signal,
			apiKey: options.apiKey,
			baseUrl: options.baseUrl,
		});

		const rawText = res.choices?.[0]?.message?.content || "";
		const cleaned = extractJsonText(rawText);

		let parsedJson: unknown;
		try {
			parsedJson = JSON.parse(cleaned);
		} catch (parseErr) {
			throw new Error(
				`Failed to parse model output as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\nRaw text: ${rawText}`,
			);
		}

		const validated = schema.safeParse(parsedJson);
		if (!validated.success) {
			const issues = validated.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join("; ");
			throw new Error(`Model JSON output failed Zod validation: ${issues}`);
		}

		return {
			data: validated.data,
			rawText,
		};
	}
}

export const omniLlmGateway = new OmniLlmGateway();
export const defaultOmniLlmProvider = omniLlmGateway;
export const defaultOmniGateway = omniLlmGateway;
