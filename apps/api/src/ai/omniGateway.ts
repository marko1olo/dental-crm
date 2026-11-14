/**
 * omniGateway.ts — Omni-LLM Gateway Factory & Multi-Provider Router SSOT.
 *
 * Provides structured JSON extraction and LLM routing for background daemons and copilot services.
 */

import { z } from "zod";
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
			temperature: options.temperature ?? 0.1,
		});

		const rawText = res.choices?.[0]?.message?.content || "";
		const cleaned = rawText
			.replace(/^```(?:json)?\s*/i, "")
			.replace(/\s*```$/, "")
			.trim();

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
