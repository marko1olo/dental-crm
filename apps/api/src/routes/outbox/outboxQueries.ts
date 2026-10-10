import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { and, desc, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { communicationCampaigns } from "../../db/communicationsSchema.js";
import {
	communicationOutbox,
	communicationTemplates,
	patientCommunicationConsents,
	patients,
} from "../../db/schema.js";
import { parseAudienceCriteria } from "../../services/communications/campaigns.js";
import { resolveCommunicationSettings } from "../../services/communications/dispatcher.js";
import { type OutboxQuery, parseVariables } from "./types.js";

export async function fetchTemplateList(organizationId: string) {
	let rows = await db
		.select()
		.from(communicationTemplates)
		.where(eq(communicationTemplates.organizationId, organizationId));

	if (organizationId === DEMO_SHOWCASE_ORG_ID && rows.length === 0) {
		try {
			await db.insert(communicationTemplates).values([
				{
					organizationId,
					title: "Подтверждение приёма (WhatsApp)",
					channel: "whatsapp",
					intent: "appointment_confirmation",
					audienceRole: "patient",
					body: "Здравствуйте, {patient_name}! Напоминаем о записи в клинику {clinic_name} {appointment_date} в {appointment_time}. Пожалуйста, подтвердите визит.",
					variablesJson: JSON.stringify(["patient_name", "clinic_name", "appointment_date", "appointment_time"]),
					isActive: true,
				},
				{
					organizationId,
					title: "Рекомендации после лечения (Telegram)",
					channel: "telegram",
					intent: "post_visit_instruction",
					audienceRole: "patient",
					body: "Здравствуйте, {patient_name}! Благодарим за визит в {clinic_name}. Соблюдайте рекомендации лечащего врача. При вопросах звоните: {clinic_phone}.",
					variablesJson: JSON.stringify(["patient_name", "clinic_name", "clinic_phone"]),
					isActive: true,
				},
				{
					organizationId,
					title: "Приглашение на профосмотр (SMS)",
					channel: "sms",
					intent: "recall",
					audienceRole: "patient",
					body: "{patient_name}, прошло 6 мес. с вашего осмотра в {clinic_name}. Запишитесь на плановую профгигиену: {clinic_phone}",
					variablesJson: JSON.stringify(["patient_name", "clinic_name", "clinic_phone"]),
					isActive: true,
				},
			]);
			rows = await db
				.select()
				.from(communicationTemplates)
				.where(eq(communicationTemplates.organizationId, organizationId));
		} catch {
			// safe fallback
		}
	}

	return rows.map((row) => ({
		id: row.id,
		organizationId: row.organizationId,
		clinicId: row.clinicId,
		title: row.title,
		channel: row.channel,
		intent: row.intent,
		audienceRole: row.audienceRole,
		body: row.body,
		variables: parseVariables(row.variablesJson),
		isActive: row.isActive,
	}));
}

export async function fetchTemplateById(
	organizationId: string,
	templateId: string,
) {
	const [existing] = await db
		.select()
		.from(communicationTemplates)
		.where(
			and(
				eq(communicationTemplates.id, templateId),
				eq(communicationTemplates.organizationId, organizationId),
			),
		)
		.limit(1);

	return existing ?? null;
}

export async function fetchActiveReminderTemplate(organizationId: string) {
	const [reminderTemplate] = await db
		.select({ id: communicationTemplates.id })
		.from(communicationTemplates)
		.where(
			and(
				eq(communicationTemplates.organizationId, organizationId),
				eq(communicationTemplates.intent, "appointment_confirmation"),
				eq(communicationTemplates.isActive, true),
			),
		)
		.limit(1);

	return reminderTemplate ?? null;
}

export async function fetchSettings(organizationId: string) {
	return resolveCommunicationSettings(organizationId);
}

export async function fetchPatientConsents(
	organizationId: string,
	patientId: string,
) {
	return db
		.select()
		.from(patientCommunicationConsents)
		.where(
			and(
				eq(patientCommunicationConsents.organizationId, organizationId),
				eq(patientCommunicationConsents.patientId, patientId),
			),
		);
}

export async function findPatientById(
	organizationId: string,
	patientId: string,
) {
	const [patient] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)),
		)
		.limit(1);

	return patient ?? null;
}

export async function fetchOutboxJournal(
	organizationId: string,
	query: OutboxQuery,
) {
	const filters: SQL[] = [eq(communicationOutbox.organizationId, organizationId)];
	if (query.status) {
		filters.push(eq(communicationOutbox.status, query.status));
	}
	if (query.channel) {
		filters.push(eq(communicationOutbox.channel, query.channel));
	}
	if (query.patientId) {
		filters.push(eq(communicationOutbox.patientId, query.patientId));
	}
	if (query.campaignId) {
		filters.push(eq(communicationOutbox.campaignId, query.campaignId));
	}
	if (query.from) {
		filters.push(gte(communicationOutbox.createdAt, new Date(query.from)));
	}
	if (query.to) {
		filters.push(lte(communicationOutbox.createdAt, new Date(query.to)));
	}

	const where = and(...filters);

	const [rows, summary] = await Promise.all([
		db
			.select()
			.from(communicationOutbox)
			.where(where)
			.orderBy(desc(communicationOutbox.createdAt))
			.limit(query.limit)
			.offset(query.offset),
		db
			.select({
				status: communicationOutbox.status,
				total: sql<number>`count(*)::int`,
			})
			.from(communicationOutbox)
			.where(eq(communicationOutbox.organizationId, organizationId))
			.groupBy(communicationOutbox.status),
	]);

	return {
		items: rows,
		summary: Object.fromEntries(
			summary.map((row) => [row.status, Number(row.total)]),
		),
		limit: query.limit,
		offset: query.offset,
	};
}

export async function fetchCampaignsList(organizationId: string) {
	const rows = await db
		.select()
		.from(communicationCampaigns)
		.where(eq(communicationCampaigns.organizationId, organizationId))
		.orderBy(desc(communicationCampaigns.createdAt))
		.limit(100);

	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		channel: row.channel,
		scope: row.scope,
		status: row.status,
		templateId: row.templateId,
		criteria: parseAudienceCriteria(row.audienceJson),
		scheduledAt: row.scheduledAt,
		launchedAt: row.launchedAt,
		completedAt: row.completedAt,
		createdAt: row.createdAt,
	}));
}

/**
 * Сколько сообщений ждёт отправки и с какого времени.
 *
 * Считается по времени, когда сообщение уже ДОЛЖНО было уйти: строка,
 * запланированная на завтра, не «застряла». Возраст самой старой такой
 * строки — это и есть ответ на вопрос «давно ли всё стоит».
 */
export async function queueBacklog(
	organizationId: string,
): Promise<{ waiting: number; oldestWaitingAt: Date | null }> {
	const now = new Date();
	const [row] = await db
		.select({
			waiting: sql<number>`count(*)::int`,
			oldest: sql<Date | null>`min(${communicationOutbox.scheduledAt})`,
		})
		.from(communicationOutbox)
		.where(
			and(
				eq(communicationOutbox.organizationId, organizationId),
				eq(communicationOutbox.status, "queued"),
				lte(communicationOutbox.scheduledAt, now),
			),
		);

	return {
		waiting: Number(row?.waiting ?? 0),
		oldestWaitingAt: row?.oldest ?? null,
	};
}
