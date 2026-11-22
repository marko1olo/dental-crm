import {
	DEFAULT_MESSAGE_TEMPLATES,
	DYNAMIC_MESSAGE_MACROS,
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
import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { checkChannelFit, describeSmsPayload } from "./templateEngine/templateRenderer.js";

/**
 * Filter criteria for message template queries.
 */
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

/**
 * Ensures standard clinical templates are seeded for an organization.
 * SSOT: Каноническая таблица communication_templates (Мандат 8bf).
 */
export async function ensureDefaultMessageTemplatesSeeded(
	organizationId: string,
): Promise<number> {
	const existingCanonical = await db
		.select({ id: schema.communicationTemplates.id })
		.from(schema.communicationTemplates)
		.where(eq(schema.communicationTemplates.organizationId, organizationId))
		.limit(1);

	let insertedCount = 0;
	if (existingCanonical.length === 0) {
		for (const seed of DEFAULT_MESSAGE_TEMPLATES) {
			await db.insert(schema.communicationTemplates).values({
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
}

/**
 * Retrieves all message templates for an organization with optional filtering.
 */
export async function getMessageTemplates(
	organizationId: string,
	filter: MessageTemplateFilter = {},
): Promise<MessageTemplate[]> {
	// Auto-seed if empty
	await ensureDefaultMessageTemplatesSeeded(organizationId);

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

	const rows = await db
		.select()
		.from(schema.communicationTemplates)
		.where(and(...conditions))
		.orderBy(
			asc(schema.communicationTemplates.intent),
			asc(schema.communicationTemplates.title),
		);

	return rows.map((r) => {
		let vars: string[] = [];
		try {
			vars = JSON.parse(r.variablesJson || "[]");
		} catch {
			vars = [];
		}
		return {
			id: r.id,
			organizationId: r.organizationId,
			title: r.title,
			channel: r.channel as MessageTemplateChannel,
			intent: r.intent,
			templateText: r.body,
			variables: vars,
			isActive: r.isActive,
			createdAt: new Date(),
		};
	});
}

/**
 * Retrieves a single message template by ID within the organization.
 */
export async function getMessageTemplateById(
	organizationId: string,
	templateId: string,
): Promise<MessageTemplate | null> {
	const [row] = await db
		.select()
		.from(schema.communicationTemplates)
		.where(
			and(
				eq(schema.communicationTemplates.id, templateId),
				eq(schema.communicationTemplates.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!row) return null;
	let vars: string[] = [];
	try {
		vars = JSON.parse(row.variablesJson || "[]");
	} catch {
		vars = [];
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		title: row.title,
		channel: row.channel as MessageTemplateChannel,
		intent: row.intent,
		templateText: row.body,
		variables: vars,
		isActive: row.isActive,
		createdAt: new Date(),
	};
}

/**
 * Creates a new message template in the catalog.
 */
export async function createMessageTemplate(
	organizationId: string,
	input: CreateMessageTemplateInput,
): Promise<MessageTemplate> {
	const extractedVariables =
		input.variables && input.variables.length > 0
			? input.variables
			: extractTemplateMacroKeys(input.templateText);

	const [row] = await db
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

	return {
		id: row.id,
		organizationId: row.organizationId,
		title: row.title,
		channel: row.channel as MessageTemplateChannel,
		intent: row.intent,
		templateText: row.body,
		variables: extractedVariables,
		isActive: row.isActive,
		createdAt: new Date(),
	};
}

/**
 * Updates an existing message template.
 */
export async function updateMessageTemplate(
	organizationId: string,
	templateId: string,
	input: UpdateMessageTemplateInput,
): Promise<MessageTemplate> {
	const updateData: Partial<typeof schema.communicationTemplates.$inferInsert> = {};

	if (input.title !== undefined) updateData.title = input.title.trim();
	if (input.channel !== undefined) updateData.channel = normalizeTemplateChannel(input.channel);
	if (input.intent !== undefined) updateData.intent = normalizeTemplateIntent(input.intent);
	if (input.templateText !== undefined) {
		updateData.body = input.templateText;
		const vars =
			input.variables && input.variables.length > 0
				? input.variables
				: extractTemplateMacroKeys(input.templateText);
		updateData.variablesJson = JSON.stringify(vars);
	}
	if (input.isActive !== undefined) updateData.isActive = input.isActive;

	const [row] = await db
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

	let vars: string[] = [];
	try {
		vars = JSON.parse(row.variablesJson || "[]");
	} catch {
		vars = [];
	}

	return {
		id: row.id,
		organizationId: row.organizationId,
		title: row.title,
		channel: row.channel as MessageTemplateChannel,
		intent: row.intent,
		templateText: row.body,
		variables: vars,
		isActive: row.isActive,
		createdAt: new Date(),
	};
}

/**
 * Deletes a message template.
 */
export async function deleteMessageTemplate(
	organizationId: string,
	templateId: string,
): Promise<void> {
	const [row] = await db
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
}

/**
 * Resolves context variables from database for a patient / appointment / clinic.
 */
async function resolveTemplateContextVariables(
	organizationId: string,
	patientId?: string,
	appointmentId?: string,
): Promise<Record<string, string>> {
	const context: Record<string, string> = {};

	// 1. Fetch organization & clinic defaults
	const [clinic] = await db
		.select({
			name: schema.clinics.name,
			address: schema.clinics.address,
			phone: schema.clinics.phone,
		})
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);

	if (clinic) {
		if (clinic.name) context.clinic_name = clinic.name;
		if (clinic.address) context.clinic_address = clinic.address;
		if (clinic.phone) context.clinic_phone = clinic.phone;
	}

	// 2. Fetch patient data if provided
	if (patientId) {
		const [patient] = await db
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				phone: schema.patients.phone,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.id, patientId),
					eq(schema.patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (patient) {
			context.patient_name = patient.fullName;
			const parts = patient.fullName.trim().split(/\s+/);
			context.patient_first_name = parts[1] || parts[0] || "";
			if (patient.phone) {
				context.patient_phone = patient.phone;
			}
			const portalBase = (process.env.APP_PORTAL_URL || process.env.VITE_PORTAL_URL || "").replace(/\/$/, "");
			context.portal_link = portalBase ? `${portalBase}/portal/${patient.id.slice(0, 8)}` : `/portal/${patient.id.slice(0, 8)}`;
			const sbpBase = process.env.SBP_PAYMENT_URL || "https://sbp.nspk.ru/pay";
			context.sbp_payment_link = `${sbpBase}?id=dente-${patient.id.slice(0, 8)}`;
		}
	}

	// 3. Fetch appointment details if provided
	if (appointmentId) {
		const [appointment] = await db
			.select({
				id: schema.appointments.id,
				doctorUserId: schema.appointments.doctorUserId,
				startsAt: schema.appointments.startsAt,
				patientId: schema.appointments.patientId,
				chairId: schema.appointments.chairId,
			})
			.from(schema.appointments)
			.where(
				and(
					eq(schema.appointments.id, appointmentId),
					eq(schema.appointments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (appointment) {
			if (appointment.startsAt) {
				const dateObj = new Date(appointment.startsAt);
				context.appointment_date = dateObj.toLocaleDateString("ru-RU", {
					day: "numeric",
					month: "long",
				});
				context.appointment_time = dateObj.toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
				});
			}

			if (appointment.doctorUserId) {
				const [doctor] = await db
					.select({
						fullName: schema.users.fullName,
						role: schema.users.role,
					})
					.from(schema.users)
					.where(eq(schema.users.id, appointment.doctorUserId))
					.limit(1);

				if (doctor) {
					context.doctor_name = doctor.fullName || "Врач-стоматолог";
					context.doctor_role =
						doctor.role === "doctor"
							? "Врач-стоматолог"
							: doctor.role === "hygienist"
								? "Гигиенист"
								: doctor.role === "surgeon"
									? "Хирург-имплантолог"
									: doctor.role || "Стоматолог";
				}
			}

			if (appointment.chairId) {
				const [chair] = await db
					.select({ name: schema.chairs.name })
					.from(schema.chairs)
					.where(eq(schema.chairs.id, appointment.chairId))
					.limit(1);
				if (chair?.name) {
					context.chair_number = chair.name;
				}
			}

			if (!context.chair_number) {
				context.chair_number = "Кабинет №1, Кресло №1";
			}
			if (!context.portal_link) {
				const portalBase = (process.env.APP_PORTAL_URL || process.env.VITE_PORTAL_URL || "").replace(/\/$/, "");
				context.portal_link = portalBase ? `${portalBase}/portal/c-${appointment.id.slice(0, 8)}` : `/portal/c-${appointment.id.slice(0, 8)}`;
			}
		}
	}

	return context;
}

/**
 * Renders a message template by substituting dynamic macros with either real database entities,
 * explicitly passed variables, or fallback preview values.
 */
export async function renderMessageTemplate(
	organizationId: string,
	input: RenderMessageTemplateInput,
): Promise<RenderMessageTemplateResult> {
	let templateText = input.templateText ?? "";
	let channel = input.channel ?? "telegram";

	if (input.templateId) {
		const existing = await getMessageTemplateById(
			organizationId,
			input.templateId,
		);
		if (existing) {
			templateText = existing.templateText;
			channel = (input.channel || existing.channel) as MessageTemplateChannel;
		}
	}

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

	// 1. Extract database context if patientId or appointmentId provided
	const dbContext = await resolveTemplateContextVariables(
		organizationId,
		input.patientId,
		input.appointmentId,
	);

	// 2. Merge explicit variables over DB context
	const mergedValues: Record<string, string | number | null | undefined> = {
		...dbContext,
		...(input.variables ?? {}),
	};

	// 3. Interpolate
	const interpolation = interpolateTemplateText(templateText, mergedValues, {
		allowPreviewFallback: input.allowPreviewFallback ?? true,
	});

	// 4. Validate channel limits & SMS segmentation
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
