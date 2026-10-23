import {
	calculateSmsSegments,
	checkChannelLimits,
} from "./templateEngine/channelLimits.js";
import { extractMacroKeys } from "./templateEngine/macroAliases.js";
import {
	detectMedicalSecrecyLeaks,
	sanitizeMedicalSecrecy,
} from "./templateEngine/secrecyDetector.js";
import {
	createTemplate,
	deleteTemplate,
	getTemplateById,
	listTemplates,
	updateTemplate,
} from "./templateEngine/templateCatalogService.js";
import { resolveContextVariables } from "./templateEngine/templateContextResolver.js";
import { renderTemplate } from "./templateEngine/templateRenderer.js";
import type {
	CreateTemplateInput,
	MessageTemplateRecord,
	RenderTemplateOptions,
	RenderTemplateResult,
	UpdateTemplateInput,
} from "./templateEngine/types.js";

export * from "./templateEngine/index.js";

export class MessageTemplateEngine {
	public static detectMedicalSecrecyLeaks(text: string) {
		return detectMedicalSecrecyLeaks(text);
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
		return checkChannelLimits(channel as any, renderedText);
	}

	public static async resolveContextVariables(
		organizationId: string,
		options: Parameters<typeof resolveContextVariables>[1],
	) {
		return resolveContextVariables(organizationId, options);
	}

	public static async render(
		organizationId: string,
		options: RenderTemplateOptions,
	): Promise<RenderTemplateResult> {
		return renderTemplate(organizationId, options);
	}

	public static async listTemplates(
		organizationId: string,
		filter: { channel?: string | undefined; intent?: string | undefined; isActive?: boolean | undefined } = {},
	): Promise<MessageTemplateRecord[]> {
		return listTemplates(organizationId, filter);
	}

	public static async getTemplateById(
		organizationId: string,
		templateId: string,
	): Promise<MessageTemplateRecord | null> {
		return getTemplateById(organizationId, templateId);
	}

	public static async createTemplate(
		organizationId: string,
		input: CreateTemplateInput,
	): Promise<MessageTemplateRecord> {
		return createTemplate(organizationId, input);
	}

	public static async updateTemplate(
		organizationId: string,
		templateId: string,
		input: UpdateTemplateInput,
	): Promise<MessageTemplateRecord> {
		return updateTemplate(organizationId, templateId, input);
	}

	public static async deleteTemplate(
		organizationId: string,
		templateId: string,
	): Promise<void> {
		return deleteTemplate(organizationId, templateId);
	}
}
