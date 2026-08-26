/**
 * schemaSerializer.ts — Converts Zod parameter schemas to OpenAI and Anthropic tool calling JSON schemas.
 */

import { z } from "zod";
import type { ToolDefinition } from "./tool.js";

// biome-ignore lint/suspicious/noExplicitAny: Recursive Zod type introspection
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
				current = (current as any).unwrap();
			} else if (current instanceof z.ZodDefault) {
				isOptional = true;
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

export function toolToOpenAiSchema(
	tool: ToolDefinition,
	qualifiedName?: string,
): Record<string, unknown> {
	return {
		type: "function",
		function: {
			name: qualifiedName ?? tool.name,
			description: tool.description,
			parameters: zodToJsonSchema(tool.parameters),
		},
	};
}

export function toolToAnthropicSchema(
	tool: ToolDefinition,
	qualifiedName?: string,
): Record<string, unknown> {
	return {
		name: qualifiedName ?? tool.name,
		description: tool.description,
		input_schema: zodToJsonSchema(tool.parameters),
	};
}
