import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { messageTemplateCatalogs } from "../../../db/schema.js";
import { extractMacroKeys } from "./macroAliases.js";
import { detectMedicalSecrecyLeaks } from "./secrecyDetector.js";
import type { CreateTemplateInput, MessageTemplateRecord, UpdateTemplateInput } from "./types.js";

export async function listTemplates(
	organizationId: string,
	filter: { channel?: string | undefined; intent?: string | undefined; isActive?: boolean | undefined } = {},
): Promise<MessageTemplateRecord[]> {
	const conditions: SQL[] = [eq(messageTemplateCatalogs.organizationId, organizationId)];
	if (filter.channel && filter.channel !== "all") conditions.push(eq(messageTemplateCatalogs.channel, filter.channel));
	if (filter.intent && filter.intent !== "all") conditions.push(eq(messageTemplateCatalogs.intent, filter.intent));
	if (filter.isActive !== undefined) conditions.push(eq(messageTemplateCatalogs.isActive, filter.isActive));

	const rows = await db.select().from(messageTemplateCatalogs).where(and(...conditions))
		.orderBy(asc(messageTemplateCatalogs.intent), asc(messageTemplateCatalogs.title));
	return rows as MessageTemplateRecord[];
}

export async function getTemplateById(organizationId: string, templateId: string): Promise<MessageTemplateRecord | null> {
	const [row] = await db.select().from(messageTemplateCatalogs)
		.where(and(eq(messageTemplateCatalogs.id, templateId), eq(messageTemplateCatalogs.organizationId, organizationId))).limit(1);
	return (row as MessageTemplateRecord) ?? null;
}

export async function createTemplate(organizationId: string, input: CreateTemplateInput): Promise<MessageTemplateRecord> {
	const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
	if (leakCheck.hasLeak) {
		throw new Error(
			`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}). Шаблоны рассылок не должны содержать медицинские диагнозы.`,
		);
	}
	const extractedVariables = input.variables && input.variables.length > 0 ? input.variables : extractMacroKeys(input.templateText);
	const [row] = await db.insert(messageTemplateCatalogs).values({
		organizationId, title: input.title.trim(), channel: input.channel ?? "telegram",
		intent: input.intent ?? "general", templateText: input.templateText,
		variables: extractedVariables as any, isActive: input.isActive ?? true,
	}).returning();
	if (!row) throw new Error("Не удалось создать шаблон сообщения");
	return row as MessageTemplateRecord;
}

export async function updateTemplate(organizationId: string, templateId: string, input: UpdateTemplateInput): Promise<MessageTemplateRecord> {
	if (input.templateText !== undefined) {
		const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
		if (leakCheck.hasLeak) {
			throw new Error(`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${leakCheck.detectedTerms.join(", ")}).`);
		}
	}
	const updateData: Record<string, unknown> = {};
	if (input.title !== undefined) updateData.title = input.title.trim();
	if (input.channel !== undefined) updateData.channel = input.channel;
	if (input.intent !== undefined) updateData.intent = input.intent;
	if (input.templateText !== undefined) {
		updateData.templateText = input.templateText;
		updateData.variables = input.variables && input.variables.length > 0 ? input.variables : extractMacroKeys(input.templateText);
	}
	if (input.isActive !== undefined) updateData.isActive = input.isActive;

	const [row] = await db.update(messageTemplateCatalogs).set(updateData)
		.where(and(eq(messageTemplateCatalogs.id, templateId), eq(messageTemplateCatalogs.organizationId, organizationId))).returning();
	if (!row) throw new Error("Шаблон сообщения не найден или не принадлежит вашей клинике");
	return row as MessageTemplateRecord;
}

export async function deleteTemplate(organizationId: string, templateId: string): Promise<void> {
	const [row] = await db.delete(messageTemplateCatalogs)
		.where(and(eq(messageTemplateCatalogs.id, templateId), eq(messageTemplateCatalogs.organizationId, organizationId))).returning();
	if (!row) throw new Error("Шаблон сообщения не найден или не удалось удалить");
}
