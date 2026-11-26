import {
	DEFAULT_MESSAGE_TEMPLATES,
	extractTemplateMacroKeys,
	interpolateTemplateText,
	type CreateMessageTemplateInput,
	type MessageTemplate,
	type MessageTemplateChannel,
	type MessageTemplateScenario,
	type RenderMessageTemplateInput,
	type RenderMessageTemplateResult,
	type UpdateMessageTemplateInput,
} from "@dental/shared";
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { detectMedicalSecrecyLeaks } from "./templateEngine/secrecyDetector.js";
import { resolveContextVariables } from "./templateEngine/templateContextResolver.js";
import { checkChannelFit, describeSmsPayload } from "./templateEngine/templateRenderer.js";

export class MessageTemplateSecrecyError extends Error {
	public readonly detectedTerms: string[];
	constructor(terms: string[]) {
		super(
			`Недопустимо сохранять шаблон с врачебной тайной (152-ФЗ / 323-ФЗ ст. 13): обнаружены клинические термины (${terms.join(", ")}). Шаблоны рассылок не должны содержать медицинские диагнозы.`,
		);
		this.name = "MessageTemplateSecrecyError";
		this.detectedTerms = terms;
	}
}

function extractUuidV7Timestamp(id: string): Date {
	const hex = id.replace(/-/g, "");
	if (hex.length >= 13 && hex[12] === "7") {
		const ms = Number.parseInt(hex.slice(0, 12), 16);
		if (Number.isFinite(ms) && ms > 0) return new Date(ms);
	}
	return new Date(0);
}

function parseVariablesJson(raw: string | null | undefined): string[] {
	try {
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
	} catch {
		return [];
	}
}

export interface MessageTemplateFilter {
	channel?: MessageTemplateChannel | string | undefined;
	scenario?: MessageTemplateScenario | string | undefined;
	intent?: string | undefined;
	isActive?: boolean | undefined;
}

export type DbCommunicationChannel = (typeof schema.communicationChannel.enumValues)[number];
export type DbCommunicationIntent = (typeof schema.communicationIntent.enumValues)[number];

export function normalizeTemplateChannel(
	channel?: MessageTemplateChannel | string | null,
): DbCommunicationChannel {
	if (!channel) return "telegram";
	const valid = schema.communicationChannel.enumValues;
	if (valid.includes(channel as DbCommunicationChannel)) {
		return channel as DbCommunicationChannel;
	}
	return "telegram";
}

export function normalizeTemplateIntent(
	scenarioOrIntent?: MessageTemplateScenario | string | null,
): DbCommunicationIntent {
	if (!scenarioOrIntent) return "general";
	const valid = schema.communicationIntent.enumValues;
	if (valid.includes(scenarioOrIntent as DbCommunicationIntent)) {
		return scenarioOrIntent as DbCommunicationIntent;
	}
	switch (scenarioOrIntent) {
		case "appointment_reminder":
		case "appointment_reminder_24h":
			return "appointment_confirmation";
		case "post_op_checkup_043":
			return "post_visit_instruction";
		case "ztl_ready_alert":
			return "document_ready";
		case "retention_recall_6m":
			return "recall";
		case "debt_notification":
			return "payment_reminder";
		default:
			return "general";
	}
}

function mapTemplateRow(
	row: typeof schema.communicationTemplates.$inferSelect,
	overrideVariables?: string[],
): MessageTemplate {
	return {
		id: row.id,
		organizationId: row.organizationId,
		title: row.title,
		channel: row.channel as MessageTemplateChannel,
		intent: row.intent,
		templateText: row.body,
		variables: overrideVariables ?? parseVariablesJson(row.variablesJson),
		isActive: row.isActive,
		createdAt: extractUuidV7Timestamp(row.id),
	};
}

export async function ensureDefaultMessageTemplatesSeeded(
	organizationId: string,
	tx?: TenantDb,
): Promise<number> {
	const run = async (tenantTx: TenantDb) => {
		await tenantTx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', 'seed_message_templates', ${organizationId}::text)))`,
		);

		const existingCanonical = await tenantTx
			.select({ id: schema.communicationTemplates.id })
			.from(schema.communicationTemplates)
			.where(eq(schema.communicationTemplates.organizationId, organizationId))
			.limit(1);

		let insertedCount = 0;
		if (existingCanonical.length === 0) {
			for (const seed of DEFAULT_MESSAGE_TEMPLATES) {
				await tenantTx.insert(schema.communicationTemplates).values({
					organizationId,
					title: seed.title,
					channel: normalizeTemplateChannel(seed.channel),
					intent: normalizeTemplateIntent(seed.intent),
					audienceRole: "patient",
					body: seed.templateText,
					variablesJson: JSON.stringify(seed.variables),
					isActive: true,
				});
				insertedCount++;
			}
		}

		return insertedCount;
	};
	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function getMessageTemplates(
	organizationId: string,
	filter: MessageTemplateFilter = {},
	tx?: TenantDb,
): Promise<MessageTemplate[]> {
	const run = async (tenantTx: TenantDb) => {
		await ensureDefaultMessageTemplatesSeeded(organizationId, tenantTx);

		const conditions: SQL[] = [
			eq(schema.communicationTemplates.organizationId, organizationId),
		];

		if (filter.channel && filter.channel !== "all") {
			const validChannel = normalizeTemplateChannel(filter.channel);
			conditions.push(eq(schema.communicationTemplates.channel, validChannel));
		}

		const intentFilter = filter.scenario ?? filter.intent;
		if (intentFilter && intentFilter !== "all") {
			const validIntent = normalizeTemplateIntent(intentFilter);
			conditions.push(eq(schema.communicationTemplates.intent, validIntent));
		}

		if (filter.isActive !== undefined) {
			conditions.push(
				eq(schema.communicationTemplates.isActive, filter.isActive),
			);
		}

		const rows = await tenantTx
			.select()
			.from(schema.communicationTemplates)
			.where(and(...conditions))
			.orderBy(
				asc(schema.communicationTemplates.intent),
				asc(schema.communicationTemplates.title),
			);

		return rows.map((r) => mapTemplateRow(r));
	};

	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function getMessageTemplateById(
	organizationId: string,
	templateId: string,
	tx?: TenantDb,
): Promise<MessageTemplate | null> {
	const run = async (tenantTx: TenantDb) => {
		const [row] = await tenantTx
			.select()
			.from(schema.communicationTemplates)
			.where(
				and(
					eq(schema.communicationTemplates.id, templateId),
					eq(schema.communicationTemplates.organizationId, organizationId),
				),
			)
			.limit(1);
		return row ? mapTemplateRow(row) : null;
	};
	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function createMessageTemplate(
	organizationId: string,
	input: CreateMessageTemplateInput,
	tx?: TenantDb,
): Promise<MessageTemplate> {
	const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
	if (leakCheck.hasLeak) {
		throw new MessageTemplateSecrecyError(leakCheck.detectedTerms);
	}

	const extractedVariables =
		input.variables && input.variables.length > 0
			? input.variables
			: extractTemplateMacroKeys(input.templateText);

	const run = async (tenantTx: TenantDb) => {
		const [row] = await tenantTx
			.insert(schema.communicationTemplates)
			.values({
				organizationId,
				title: input.title.trim(),
				channel: normalizeTemplateChannel(input.channel),
				intent: normalizeTemplateIntent(input.intent),
				audienceRole: "patient",
				body: input.templateText,
				variablesJson: JSON.stringify(extractedVariables),
				isActive: input.isActive ?? true,
			})
			.returning();

		if (!row) {
			throw new Error("Не удалось сохранить шаблон сообщения");
		}
		return mapTemplateRow(row, extractedVariables);
	};

	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function updateMessageTemplate(
	organizationId: string,
	templateId: string,
	input: UpdateMessageTemplateInput,
	tx?: TenantDb,
): Promise<MessageTemplate> {
	if (input.templateText !== undefined) {
		const leakCheck = detectMedicalSecrecyLeaks(input.templateText);
		if (leakCheck.hasLeak) {
			throw new MessageTemplateSecrecyError(leakCheck.detectedTerms);
		}
	}

	const updateData: Partial<typeof schema.communicationTemplates.$inferInsert> = {};
	if (input.title !== undefined) updateData.title = input.title.trim();
	if (input.channel !== undefined) {
		updateData.channel = normalizeTemplateChannel(input.channel);
	}
	if (input.intent !== undefined) {
		updateData.intent = normalizeTemplateIntent(input.intent);
	}
	if (input.templateText !== undefined) {
		updateData.body = input.templateText;
		const vars =
			input.variables && input.variables.length > 0
				? input.variables
				: extractTemplateMacroKeys(input.templateText);
		updateData.variablesJson = JSON.stringify(vars);
	}
	if (input.isActive !== undefined) updateData.isActive = input.isActive;

	const run = async (tenantTx: TenantDb) => {
		const [row] = await tenantTx
			.update(schema.communicationTemplates)
			.set(updateData)
			.where(
				and(
					eq(schema.communicationTemplates.id, templateId),
					eq(schema.communicationTemplates.organizationId, organizationId),
				),
			)
			.returning();

		if (!row) {
			throw new Error("Шаблон сообщения не найден или не принадлежит вашей клинике");
		}
		return mapTemplateRow(row);
	};

	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function deleteMessageTemplate(
	organizationId: string,
	templateId: string,
	tx?: TenantDb,
): Promise<void> {
	const run = async (tenantTx: TenantDb) => {
		const [row] = await tenantTx
			.delete(schema.communicationTemplates)
			.where(
				and(
					eq(schema.communicationTemplates.id, templateId),
					eq(schema.communicationTemplates.organizationId, organizationId),
				),
			)
			.returning();

		if (!row) {
			throw new Error("Шаблон сообщения не найден или не удалось удалить");
		}
	};
	return tx ? run(tx) : withTenantCtx(organizationId, run);
}

export async function renderMessageTemplate(
	organizationId: string,
	input: RenderMessageTemplateInput,
	tx?: TenantDb,
): Promise<RenderMessageTemplateResult> {
	let templateText = input.templateText ?? "";
	let channel = input.channel ?? "telegram";

	const { dbContext, resolvedText, resolvedChannel } = await (async () => {
		const run = async (tenantTx: TenantDb) => {
			let nextText = templateText;
			let nextChannel = channel;
			if (input.templateId) {
				const existing = await getMessageTemplateById(
					organizationId,
					input.templateId,
					tenantTx,
				);
				if (existing) {
					nextText = existing.templateText;
					nextChannel = (input.channel || existing.channel) as MessageTemplateChannel;
				}
			}
			const ctx =
				nextText.trim() && (input.patientId || input.appointmentId)
					? await resolveContextVariables(
							organizationId,
							input.patientId,
							input.appointmentId,
							undefined,
							tenantTx,
						)
					: {};
			return { dbContext: ctx, resolvedText: nextText, resolvedChannel: nextChannel };
		};
		return tx ? run(tx) : withTenantCtx(organizationId, run);
	})();

	templateText = resolvedText;
	channel = resolvedChannel;

	if (!templateText.trim()) {
		return {
			ok: false,
			renderedText: "",
			channel,
			usedMacros: [],
			missingMacros: [],
			characterCount: 0,
			problems: ["Текст шаблона не передан или шаблон не найден"],
		};
	}

	const mergedValues: Record<string, string | number | null | undefined> = {
		...dbContext,
		...(input.variables ?? {}),
	};

	const interpolation = interpolateTemplateText(templateText, mergedValues, {
		allowPreviewFallback: input.allowPreviewFallback ?? true,
	});

	const channelFit = checkChannelFit(channel, interpolation.text);
	const problems = [...channelFit.problems];

	if (interpolation.missingMacros.length > 0 && !input.allowPreviewFallback) {
		problems.push(
			`Не заполнены обязательные макросы: ${interpolation.missingMacros.map((m) => `{${m}}`).join(", ")}`,
		);
	}

	const smsPayload =
		channel === "sms" ? describeSmsPayload(interpolation.text) : null;

	return {
		ok: problems.length === 0,
		renderedText: interpolation.text,
		channel,
		usedMacros: interpolation.usedMacros,
		missingMacros: interpolation.missingMacros,
		characterCount: interpolation.text.length,
		smsSegments: smsPayload ? smsPayload.segments : undefined,
		smsEncoding: smsPayload ? smsPayload.encoding : undefined,
		problems,
	};
}
