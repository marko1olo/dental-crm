import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import { communicationTemplates } from "../../db/schema.js";
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
import { renderTemplate } from "./templateEngine/templateRenderer.js";
import type {
	CreateTemplateInput,
	MessageTemplateRecord,
	RenderTemplateOptions,
	RenderTemplateResult,
	UpdateTemplateInput,
} from "./templateEngine/types.js";

export * from "./templateEngine/index.js";

const VALID_INTENTS = new Set([
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
	"transactional_reply",
]);

function normalizeIntent(intent: string | undefined): any {
	if (!intent) return "general";
	if (intent === "appointment_reminder") return "appointment_confirmation";
	return VALID_INTENTS.has(intent) ? intent : "general";
}

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
		const conditions: SQL[] = [eq(communicationTemplates.organizationId, organizationId)];
		if (filter.channel && filter.channel !== "all") conditions.push(eq(communicationTemplates.channel, filter.channel as any));
		if (filter.intent && filter.intent !== "all") conditions.push(eq(communicationTemplates.intent, filter.intent as any));
		if (filter.isActive !== undefined) conditions.push(eq(communicationTemplates.isActive, filter.isActive));

		const rows = await db.select().from(communicationTemplates).where(and(...conditions))
			.orderBy(asc(communicationTemplates.intent), asc(communicationTemplates.title));
		return rows.map((r) => ({
			id: r.id,
			organizationId: r.organizationId,
			title: r.title,
			channel: r.channel,
			intent: r.intent,
			templateText: r.body,
			variables: (() => {
				try {
					return JSON.parse(r.variablesJson || "[]");
				} catch {
					return [];
				}
			})(),
			isActive: r.isActive,
			createdAt: new Date(),
		}));
	}

	public static async getTemplateById(
		organizationId: string,
		templateId: string,
	): Promise<MessageTemplateRecord | null> {
		const [row] = await db.select().from(communicationTemplates)
			.where(and(eq(communicationTemplates.id, templateId), eq(communicationTemplates.organizationId, organizationId))).limit(1);
		if (!row) return null;
		return {
			id: row.id,
			organizationId: row.organizationId,
			title: row.title,
			channel: row.channel,
			intent: row.intent,
			templateText: row.body,
			variables: (() => {
				try {
					return JSON.parse(row.variablesJson || "[]");
				} catch {
					return [];
				}
			})(),
			isActive: row.isActive,
			createdAt: new Date(),
		};
	}

	public static async createTemplate(
		organizationId: string,
		input: CreateTemplateInput,
	): Promise<MessageTemplateRecord> {
		const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
		if (leakCheck.hasLeak) {
			throw new Error(
				`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}). Шаблоны рассылок не должны содержать медицинские диагнозы.`,
			);
		}
		const extractedVariables = input.variables && input.variables.length > 0 ? input.variables : extractMacroKeys(input.templateText);
		const [row] = await db.insert(communicationTemplates).values({
			organizationId,
			title: input.title.trim(),
			channel: (input.channel ?? "telegram") as any,
			intent: normalizeIntent(input.intent),
			audienceRole: "patient",
			body: input.templateText,
			variablesJson: JSON.stringify(extractedVariables),
			isActive: input.isActive ?? true,
		}).returning();
		if (!row) throw new Error("Не удалось создать шаблон сообщения");
		return {
			id: row.id,
			organizationId: row.organizationId,
			title: row.title,
			channel: row.channel,
			intent: row.intent,
			templateText: row.body,
			variables: extractedVariables,
			isActive: row.isActive,
			createdAt: new Date(),
		};
	}

	public static async updateTemplate(
		organizationId: string,
		templateId: string,
		input: UpdateTemplateInput,
	): Promise<MessageTemplateRecord> {
		if (input.templateText !== undefined) {
			const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
			if (leakCheck.hasLeak) {
				throw new Error(`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}).`);
			}
		}
		const updateData: Record<string, unknown> = {};
		if (input.title !== undefined) updateData.title = input.title.trim();
		if (input.channel !== undefined) updateData.channel = input.channel as any;
		if (input.intent !== undefined) updateData.intent = normalizeIntent(input.intent);
		if (input.templateText !== undefined) {
			updateData.body = input.templateText;
			updateData.variablesJson = JSON.stringify(input.variables && input.variables.length > 0 ? input.variables : extractMacroKeys(input.templateText));
		}
		if (input.isActive !== undefined) updateData.isActive = input.isActive;

		const [row] = await db.update(communicationTemplates).set(updateData)
			.where(and(eq(communicationTemplates.id, templateId), eq(communicationTemplates.organizationId, organizationId))).returning();
		if (!row) throw new Error("Шаблон сообщения не найден или не принадлежит вашей клинике");
		return {
			id: row.id,
			organizationId: row.organizationId,
			title: row.title,
			channel: row.channel,
			intent: row.intent,
			templateText: row.body,
			variables: (() => {
				try {
					return JSON.parse(row.variablesJson || "[]");
				} catch {
					return [];
				}
			})(),
			isActive: row.isActive,
			createdAt: new Date(),
		};
	}

	public static async deleteTemplate(
		organizationId: string,
		templateId: string,
	): Promise<void> {
		const [row] = await db.delete(communicationTemplates)
			.where(and(eq(communicationTemplates.id, templateId), eq(communicationTemplates.organizationId, organizationId))).returning();
		if (!row) throw new Error("Шаблон сообщения не найден или не удалось удалить");
	}
}
