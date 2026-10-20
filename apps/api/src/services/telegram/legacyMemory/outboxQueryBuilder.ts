/**
 * outboxQueryBuilder.ts
 *
 * Outbox items query assembly, filtering, pagination and aggregation.
 */

import type {
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
} from "@dental/shared";
import { denteTelegramOutboxResponseSchema } from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	BuildDenteTelegramOutboxOptions,
	DenteTelegramOutboxRuntimeScope,
	DenteTelegramOutboxStatusFilter,
	NormalizedDenteTelegramOutboxOptions,
} from "./types.js";
import {
	communicationTasks,
	denteTelegramChatLinks,
	inMemoryDomainState,
	isOpenCommunicationTask,
} from "./storeState.js";
import { resolveDenteTelegramOutboxRuntimeScope } from "./botSettings.js";
import { telegramChatEncryptionKey } from "./linkCodes.js";
import { telegramTemplateKindForTask } from "./messageRenderer.js";
import {
	buildDenteTelegramDocumentReadyItems,
	buildDenteTelegramPaymentReminderItems,
	buildDenteTelegramRecallItems,
	buildDenteTelegramTaxDocumentRequestItems,
	buildDenteTelegramOutboxItem,
} from "./outboxItemBuilders.js";
import {
	buildDenteTelegramAppointmentReminderItems,
	buildDenteTelegramPostVisitCheckupItems,
	buildDenteTelegramPostVisitInstructionItems,
	buildDenteTelegramReviewRequestItems,
	staffDailyDigestOutboxId,
	staffDailyDigestAlreadySent,
} from "./outboxFollowupBuilders.js";

export function normalizeDenteTelegramOutboxOptions(
	input: number | BuildDenteTelegramOutboxOptions = 100,
): NormalizedDenteTelegramOutboxOptions {
	const source = typeof input === "number" ? { limit: input } : input;
	const parsedLimit = Number(source.limit ?? 100);
	const limit = Number.isFinite(parsedLimit)
		? Math.max(1, Math.min(300, Math.trunc(parsedLimit)))
		: 100;
	const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
	const cursor = String(
		Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0),
	);
	return {
		limit,
		cursor,
		status: source.status ?? "all",
		templateKind: source.templateKind ?? "all",
	};
}

export function denteTelegramOutboxItemMatchesStatus(
	item: DenteTelegramOutboxItem,
	status: DenteTelegramOutboxStatusFilter,
	nowMs: number,
): boolean {
	if (status === "all") return true;
	if (status === "due") {
		if (item.deliveryStatus !== "ready") return false;
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}
	return item.deliveryStatus === status;
}

export function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const taskItems = communicationTasks
		.filter(isOpenCommunicationTask)
		.filter((task) => task.channel === "telegram")
		.filter((task) => task.organizationId === organizationScope)
		.map((task) =>
			buildDenteTelegramOutboxItem(
				{
					id: `task:${task.id}`,
					task,
					subjectType: "patient",
					subjectId: task.patientId,
					visitId: task.visitId,
					templateKind: telegramTemplateKindForTask(task),
					scheduledAt: task.dueAt,
					source: "communication_task",
				},
				runtime,
			),
		);
	const staffDigestItems = denteTelegramChatLinks
		.filter(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === runtime.botConfigId &&
				link.subjectType === "staff" &&
				link.status === "active",
		)
		.flatMap((link) => {
			const itemId = staffDailyDigestOutboxId(link.subjectId);
			if (staffDailyDigestAlreadySent(itemId)) return [];
			return [
				buildDenteTelegramOutboxItem(
					{
						id: itemId,
						task: null,
						subjectType: "staff",
						subjectId: link.subjectId,
						templateKind: "staff_daily_digest",
						scheduledAt: now,
						source: "staff_digest",
					},
					runtime,
				),
			];
		});
	const paymentReminderItems = buildDenteTelegramPaymentReminderItems(
		runtime,
		state,
	);
	const appointmentReminderItems =
		buildDenteTelegramAppointmentReminderItems(runtime, state);
	const postVisitInstructionItems =
		buildDenteTelegramPostVisitInstructionItems(runtime, state);
	const postVisitCheckupItems =
		buildDenteTelegramPostVisitCheckupItems(runtime, state);
	const recallItems = buildDenteTelegramRecallItems(runtime, state);
	const taxDocumentRequestItems =
		buildDenteTelegramTaxDocumentRequestItems(runtime, state);
	const documentReadyItems = buildDenteTelegramDocumentReadyItems(
		runtime,
		state,
	);
	const reviewRequestItems = buildDenteTelegramReviewRequestItems(
		runtime,
		state,
	);
	const allItems = [
		...taskItems,
		...paymentReminderItems,
		...appointmentReminderItems,
		...postVisitInstructionItems,
		...postVisitCheckupItems,
		...recallItems,
		...taxDocumentRequestItems,
		...documentReadyItems,
		...reviewRequestItems,
		...staffDigestItems,
	].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
	return allItems;
}

export function findDenteTelegramOutboxItem(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem | null {
	return (
		buildAllDenteTelegramOutboxItems(
			new Date().toISOString(),
			runtimeScope,
			state,
		).find((item) => item.id === outboxItemId) ?? null
	);
}

export function buildDenteTelegramOutbox(
	input: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const options = normalizeDenteTelegramOutboxOptions(input);
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const now = new Date().toISOString();
	const allItems = buildAllDenteTelegramOutboxItems(now, runtime, state);
	const warnings: string[] = [];
	const nowMs = Date.now();
	const readyItems = allItems.filter((item) => item.deliveryStatus === "ready");
	const dueCount = readyItems.filter((item) => {
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}).length;
	const filteredItems = allItems.filter((item) => {
		if (!denteTelegramOutboxItemMatchesStatus(item, options.status, nowMs))
			return false;
		if (
			options.templateKind !== "all" &&
			item.templateKind !== options.templateKind
		)
			return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredItems.slice(safeOffset, safeOffset + options.limit);
	const nextOffset = safeOffset + items.length;
	const nextCursor =
		nextOffset < filteredItems.length ? String(nextOffset) : null;

	if (!runtime.botTokenConfigured)
		warnings.push(
			"Подключите бота Telegram в серверных настройках для реальной отправки сообщений.",
		);
	if (!telegramChatEncryptionKey()) {
		warnings.push(
			"Настройте защищенную серверную связку перед хранением обратимых ссылок на Telegram-чат.",
		);
	}
	if (!settings.patientPortalBaseUrl) {
		warnings.push(
			"patientPortalBaseUrl нужен для ссылок на готовые документы, памятки после приема и профилактические приглашения.",
		);
	}

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: settings.mode,
		transportReady: settings.mode !== "disabled" && runtime.botTokenConfigured,
		totalCount: allItems.length,
		filteredCount: filteredItems.length,
		limit: options.limit,
		cursor: options.cursor,
		nextCursor,
		readyCount: readyItems.length,
		dueCount,
		notDueCount: readyItems.length - dueCount,
		blockedCount: allItems.filter((item) => item.deliveryStatus !== "ready")
			.length,
		items,
		warnings,
	});
}
