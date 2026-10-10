import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	patientCommunicationConsents,
} from "../../db/schema.js";
import { readSmtpCredentialsFromEnv } from "../../emailTransport.js";
import { scheduleAppointmentReminders } from "../../services/communications/appointmentReminders.js";
import {
	campaignProgress,
	cancelCampaign,
	createCampaign,
	launchCampaign,
	previewCampaign,
} from "../../services/communications/campaigns.js";
import {
	type CommunicationChannelCode,
	MACHINE_DELIVERABLE_CHANNELS,
	resolveChannelCredentials,
} from "../../services/communications/channelRouter.js";
import {
	DEFAULT_COMMUNICATION_SETTINGS,
	dispatchDueMessages,
	enqueueMessage,
} from "../../services/communications/dispatcher.js";
import { describeAutomaticSending } from "../../services/communications/dispatchWorker.js";
import { fetchSmsBalance, readSmsCredentialsFromEnv } from "../../smsTransport.js";
import { queueBacklog } from "./outboxQueries.js";
import type {
	AudienceCriteria,
	Channel,
	DeliverableChannel,
	Intent,
	Scope,
} from "./types.js";

export async function insertTemplate(params: {
	organizationId: string;
	clinicId?: string | null;
	title: string;
	channel: Channel;
	intent: Intent;
	audienceRole: string;
	body: string;
	variables: string[];
	isActive: boolean;
}) {
	const [created] = await db
		.insert(communicationTemplates)
		.values({
			organizationId: params.organizationId,
			clinicId: params.clinicId ?? null,
			title: params.title,
			channel: params.channel,
			intent: params.intent,
			audienceRole: params.audienceRole,
			body: params.body,
			variablesJson: JSON.stringify(params.variables),
			isActive: params.isActive,
		})
		.returning();

	return created;
}

export async function updateTemplateRow(params: {
	organizationId: string;
	templateId: string;
	title: string;
	channel: Channel;
	intent: Intent;
	audienceRole: string;
	body: string;
	variables: string[];
	isActive: boolean;
	clinicId?: string | null;
}) {
	const [updated] = await db
		.update(communicationTemplates)
		.set({
			title: params.title,
			channel: params.channel,
			intent: params.intent,
			audienceRole: params.audienceRole,
			body: params.body,
			variablesJson: JSON.stringify(params.variables),
			isActive: params.isActive,
			clinicId: params.clinicId,
		})
		.where(
			and(
				eq(communicationTemplates.id, params.templateId),
				eq(communicationTemplates.organizationId, params.organizationId),
			),
		)
		.returning();

	return updated ?? null;
}

export async function saveSettingsRow(
	organizationId: string,
	next: Record<string, unknown>,
) {
	await db
		.insert(communicationSettings)
		.values({ organizationId, ...next })
		.onConflictDoUpdate({
			target: communicationSettings.organizationId,
			set: { ...next, updatedAt: new Date() },
		});
}

export async function upsertPatientConsents(params: {
	organizationId: string;
	patientId: string;
	entries: Array<{
		channel: Channel;
		scope: Scope;
		state: "granted" | "revoked";
		source: string;
		evidence?: string | null | undefined;
	}>;
}) {
	const now = new Date();
	if (params.entries.length === 0) return 0;

	const valuesToInsert = params.entries.map((entry) => ({
		organizationId: params.organizationId,
		patientId: params.patientId,
		channel: entry.channel,
		scope: entry.scope,
		state: entry.state,
		source: entry.source,
		evidence: entry.evidence ?? null,
		decidedAt: now,
	}));

	await db
		.insert(patientCommunicationConsents)
		.values(valuesToInsert)
		.onConflictDoUpdate({
			target: [
				patientCommunicationConsents.organizationId,
				patientCommunicationConsents.patientId,
				patientCommunicationConsents.channel,
				patientCommunicationConsents.scope,
			],
			set: {
				state: sql`EXCLUDED.state`,
				source: sql`EXCLUDED.source`,
				evidence: sql`EXCLUDED.evidence`,
				decidedAt: now,
				updatedAt: now,
			},
		});

	return params.entries.length;
}

export async function enqueueOutboxMessage(params: {
	organizationId: string;
	patientId?: string | null;
	templateId?: string | null;
	channel: DeliverableChannel;
	intent: Intent;
	scope: Scope;
	recipientAddress?: string | null;
	subject?: string | null;
	body: string;
	dedupeKey?: string;
	scheduledAt?: string | null;
}) {
	const bodyHash = createHash("sha256")
		.update(params.body)
		.digest("hex")
		.slice(0, 16);
	const timeBucket = Math.floor(Date.now() / 60000);
	const dedupeKey =
		params.dedupeKey ??
		`manual:${params.patientId ?? params.recipientAddress ?? "anon"}:${params.channel}:${params.intent}:${bodyHash}:${timeBucket}`;

	return enqueueMessage({
		organizationId: params.organizationId,
		patientId: params.patientId ?? null,
		templateId: params.templateId ?? null,
		channel: params.channel as CommunicationChannelCode,
		intent: params.intent,
		scope: params.scope,
		recipientAddress: params.recipientAddress ?? null,
		subject: params.subject ?? null,
		body: params.body,
		dedupeKey,
		scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
	});
}

export async function cancelQueuedMessage(
	organizationId: string,
	outboxId: string,
) {
	const [cancelled] = await db
		.update(communicationOutbox)
		.set({
			status: "cancelled",
			lockedAt: null,
			lockedBy: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(communicationOutbox.id, outboxId),
				eq(communicationOutbox.organizationId, organizationId),
				inArray(communicationOutbox.status, ["queued", "sending"]),
			),
		)
		.returning({ id: communicationOutbox.id });

	return cancelled ?? null;
}

export async function retryQueuedMessage(
	organizationId: string,
	outboxId: string,
) {
	const now = new Date();
	const [restored] = await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			attempts: 0,
			nextAttemptAt: now,
			lockedAt: null,
			lockedBy: null,
			updatedAt: now,
		})
		.where(
			and(
				eq(communicationOutbox.id, outboxId),
				eq(communicationOutbox.organizationId, organizationId),
				inArray(communicationOutbox.status, [
					"failed",
					"cancelled",
					"suppressed",
				]),
			),
		)
		.returning({ id: communicationOutbox.id });

	return restored ?? null;
}

export async function dispatchOutboxBatch(
	organizationId: string,
	batchSize: number,
) {
	return dispatchDueMessages({
		organizationId,
		batchSize: Number.isFinite(batchSize) ? batchSize : 25,
		workerId: `manual:${organizationId}`,
	});
}

export async function runAppointmentReminders(organizationId: string) {
	return scheduleAppointmentReminders({ organizationId });
}

export async function createCampaignRecord(params: {
	organizationId: string;
	title: string;
	templateId: string;
	scope: Scope;
	criteria: AudienceCriteria;
	clinicId?: string | null;
	scheduledAt?: string | null;
}) {
	return createCampaign({
		organizationId: params.organizationId,
		title: params.title,
		templateId: params.templateId,
		scope: params.scope,
		criteria: params.criteria,
		clinicId: params.clinicId ?? null,
		scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
	});
}

export async function previewCampaignRecord(
	organizationId: string,
	campaignId: string,
) {
	return previewCampaign(organizationId, campaignId);
}

export async function launchCampaignRecord(
	organizationId: string,
	campaignId: string,
) {
	return launchCampaign({ organizationId, campaignId });
}

export async function cancelCampaignRecord(
	organizationId: string,
	campaignId: string,
) {
	return cancelCampaign(organizationId, campaignId);
}

export async function getCampaignProgressRecord(
	organizationId: string,
	campaignId: string,
) {
	return campaignProgress(organizationId, campaignId);
}

export async function getGatewayStatusOverview(organizationId: string) {
	const credentials = await resolveChannelCredentials(organizationId);
	const smsCredentials = readSmsCredentialsFromEnv();
	const smtpCredentials = readSmtpCredentialsFromEnv();

	// Остаток запрашивается у шлюза только когда он действительно настроен
	const smsBalance = smsCredentials
		? await fetchSmsBalance(smsCredentials)
		: null;

	const backlog = await queueBacklog(organizationId);

	return {
		channels: {
			sms: {
				configured: smsCredentials !== null,
				provider: smsCredentials?.provider ?? null,
				sender: smsCredentials?.sender ?? null,
				balance: smsBalance?.ok
					? { amount: smsBalance.balanceRub, currency: smsBalance.currency }
					: null,
				balanceError:
					smsBalance && !smsBalance.ok ? smsBalance.errorMessage : null,
			},
			email: {
				configured: smtpCredentials !== null,
				host: smtpCredentials?.host ?? null,
				from: smtpCredentials?.fromAddress ?? null,
				requireTls: smtpCredentials?.requireTls ?? true,
			},
			whatsapp: { configured: credentials.whatsapp !== null },
			telegram: { configured: credentials.telegramBotToken !== null },
			max: {
				configured: credentials.maxBotToken !== null,
				detail:
					credentials.maxBotToken !== null
						? "Бот подключён. Первым написать нельзя: диалог начинает пациент."
						: "Бот MAX не подключён: нет токена или интеграция выключена.",
			},
			vk: {
				configured: false,
				detail: "Отправка во ВКонтакте не подключена: нет ключа сообщества.",
			},
		},
		automaticSending: {
			...describeAutomaticSending(),
			...backlog,
		},
		deliverableChannels: MACHINE_DELIVERABLE_CHANNELS,
		defaults: DEFAULT_COMMUNICATION_SETTINGS,
	};
}
