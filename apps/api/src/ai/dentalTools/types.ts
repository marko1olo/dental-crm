/**
 * types.ts — Типы данных, рантайм-матрица и сериализация JSON Schema для Dental Tool Arsenal.
 *
 * Поддерживает два профиля выполнения:
 * - "web_browser": безопасный режим браузера (CRM, клинические расчеты, UI-триггеры).
 * - "desktop_native": режим локального десктопного приложения/ПК (запуск просмотрщиков VATECH/Planmeca, чтение файлов, порты).
 */

import { z } from "zod";

export type AgentRuntimeMode = "web_browser" | "desktop_native";

export interface OpenAIFunctionDefinition {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface OpenAIToolDefinition {
	type: "function";
	function: OpenAIFunctionDefinition;
}

export interface DentalToolContext {
	organizationId: string;
	userId?: string;
	runtimeMode?: AgentRuntimeMode;
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle database instance
	db?: any;
	allowLocalExecution?: boolean;
}

export interface DentalToolEntry<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TResult = unknown> {
	name: string;
	description: string;
	schema: TSchema;
	supportedModes: readonly AgentRuntimeMode[];
	definition: OpenAIToolDefinition;
	handler: (args: z.infer<TSchema>, context: DentalToolContext) => Promise<TResult>;
}

/**
 * Конвертер Zod-схем в JSON Schema для OpenAI Function Calling
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const properties: Record<string, unknown> = {};
		const required: string[] = [];

		for (const [key, propSchema] of Object.entries(shape)) {
			let current = propSchema as z.ZodTypeAny;
			let isOptional = false;

			if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
				isOptional = true;
				// biome-ignore lint/suspicious/noExplicitAny: unwrap helper
				current = (current as any).unwrap();
			} else if (current instanceof z.ZodDefault) {
				isOptional = true;
				// biome-ignore lint/suspicious/noExplicitAny: default helper
				current = (current as any)._def.innerType;
			}

			if (!isOptional) {
				required.push(key);
			}

			properties[key] = zodToJsonSchema(current);
		}

		return {
			type: "object",
			properties,
			...(required.length > 0 ? { required } : {}),
			additionalProperties: false,
		};
	}

	if (schema instanceof z.ZodString) {
		const result: Record<string, unknown> = { type: "string" };
		if (schema.description) result.description = schema.description;
		return result;
	}

	if (schema instanceof z.ZodNumber) {
		const result: Record<string, unknown> = { type: "number" };
		if (schema.description) result.description = schema.description;
		return result;
	}

	if (schema instanceof z.ZodBoolean) {
		const result: Record<string, unknown> = { type: "boolean" };
		if (schema.description) result.description = schema.description;
		return result;
	}

	if (schema instanceof z.ZodEnum) {
		return {
			type: "string",
			enum: schema._def.values,
			...(schema.description ? { description: schema.description } : {}),
		};
	}

	if (schema instanceof z.ZodArray) {
		return {
			type: "array",
			items: zodToJsonSchema(schema.element),
			...(schema.description ? { description: schema.description } : {}),
		};
	}

	if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
		// biome-ignore lint/suspicious/noExplicitAny: unwrap helper
		return zodToJsonSchema((schema as any).unwrap());
	}

	if (schema instanceof z.ZodDefault) {
		// biome-ignore lint/suspicious/noExplicitAny: default helper
		return zodToJsonSchema((schema as any)._def.innerType);
	}

	return { type: "string" };
}

export function createOpenAIToolDefinition(
	name: string,
	description: string,
	schema: z.ZodTypeAny,
): OpenAIToolDefinition {
	return {
		type: "function",
		function: {
			name,
			description,
			parameters: zodToJsonSchema(schema),
		},
	};
}
