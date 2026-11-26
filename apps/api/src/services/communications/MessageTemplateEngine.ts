import type { TenantDb } from "../../db/rls.js";
import {
	createMessageTemplate,
	deleteMessageTemplate,
	getMessageTemplateById,
	getMessageTemplates,
	updateMessageTemplate,
} from "./messageTemplateService.js";
import {
	calculateSmsSegments,
	checkChannelLimits,
} from "./templateEngine/channelLimits.js";
import { extractMacroKeys } from "./templateEngine/macroAliases.js";
import {
	detectMedicalSecrecyLeaks,
	sanitizeMedicalSecrecy,
} from "./templateEngine/secrecyDetector.js";
import { resolveContextVariables } from "./templateEngine/templateContextResolver.js";
import { renderTemplateAsync } from "./templateEngine/templateRenderer.js";
import type {
	CreateTemplateInput,
	MessageTemplateRecord,
	RenderTemplateOptions,
	RenderTemplateResult,
	UpdateTemplateInput,
} from "./templateEngine/types.js";

export * from "./templateEngine/index.js";

function toMessageTemplateRecord(r: {
	id: string;
	organizationId: string;
	channel: string;
	intent: string;
	title: string;
	templateText: string;
	variables?: string[] | null | undefined;
	isActive: boolean;
	createdAt?: Date | string | undefined;
}): MessageTemplateRecord {
	const createdAt =
		r.createdAt instanceof Date
			? r.createdAt
			: r.createdAt !== undefined
				? new Date(r.createdAt)
				: new Date(0);
	return {
		id: r.id,
		organizationId: r.organizationId,
		channel: r.channel as MessageTemplateRecord["channel"],
		intent: r.intent,
		title: r.title,
		templateText: r.templateText,
		variables: r.variables ?? null,
		isActive: r.isActive,
		createdAt,
	};
}

/**
 * Facade over canonical template rendering, 152-FZ secrecy checks,
 * and messageTemplateService CRUD SSOT (Mandate 8bf / W12-OPS-03).
 */
export class MessageTemplateEngine {
	public static detectMedicalSecrecyLeaks(
		text: string,
		options?: Parameters<typeof detectMedicalSecrecyLeaks>[1],
	) {
		return detectMedicalSecrecyLeaks(text, options);
	}

	public static sanitizeMedicalSecrecy(text: string) {
		return sanitizeMedicalSecrecy(text);
	}

	public static extractMacroKeys(templateText: string): string[] {
		return extractMacroKeys(templateText);
	}

	public static calculateSmsSegments(text: string) {
		return calculateSmsSegments(text);
	}

	public static checkChannelLimits(channel: string, renderedText: string) {
		return checkChannelLimits(channel, renderedText);
	}

	public static async resolveContextVariables(
		organizationId: string,
		options: Parameters<typeof resolveContextVariables>[1],
		tx?: TenantDb,
	) {
		return resolveContextVariables(organizationId, options, undefined, undefined, tx);
	}

	public static async render(
		organizationId: string,
		options: RenderTemplateOptions,
		tx?: TenantDb,
	): Promise<RenderTemplateResult> {
		return renderTemplateAsync(organizationId, options, tx);
	}

	public static async listTemplates(
		organizationId: string,
		filter: {
			channel?: string | undefined;
			intent?: string | undefined;
			isActive?: boolean | undefined;
		} = {},
		tx?: TenantDb,
	): Promise<MessageTemplateRecord[]> {
		const rows = await getMessageTemplates(organizationId, filter, tx);
		return rows.map(toMessageTemplateRecord);
	}

	public static async getTemplateById(
		organizationId: string,
		templateId: string,
		tx?: TenantDb,
	): Promise<MessageTemplateRecord | null> {
		const row = await getMessageTemplateById(organizationId, templateId, tx);
		return row ? toMessageTemplateRecord(row) : null;
	}

	public static async createTemplate(
		organizationId: string,
		input: CreateTemplateInput,
		tx?: TenantDb,
	): Promise<MessageTemplateRecord> {
		const created = await createMessageTemplate(
			organizationId,
			{
				title: input.title,
				channel: input.channel as Parameters<typeof createMessageTemplate>[1]["channel"],
				intent: input.intent ?? "custom",
				templateText: input.templateText,
				isActive: input.isActive ?? true,
				...(input.variables !== undefined ? { variables: input.variables } : {}),
			},
			tx,
		);
		return toMessageTemplateRecord(created);
	}

	public static async updateTemplate(
		organizationId: string,
		templateId: string,
		input: UpdateTemplateInput,
		tx?: TenantDb,
	): Promise<MessageTemplateRecord> {
		const updated = await updateMessageTemplate(
			organizationId,
			templateId,
			{
				...(input.title !== undefined ? { title: input.title } : {}),
				...(input.channel !== undefined
					? {
							channel: input.channel as NonNullable<
								Parameters<typeof updateMessageTemplate>[2]["channel"]
							>,
						}
					: {}),
				...(input.intent !== undefined ? { intent: input.intent } : {}),
				...(input.templateText !== undefined
					? { templateText: input.templateText }
					: {}),
				...(input.variables !== undefined ? { variables: input.variables } : {}),
				...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
			},
			tx,
		);
		return toMessageTemplateRecord(updated);
	}

	public static async deleteTemplate(
		organizationId: string,
		templateId: string,
		tx?: TenantDb,
	): Promise<void> {
		return deleteMessageTemplate(organizationId, templateId, tx);
	}
}
