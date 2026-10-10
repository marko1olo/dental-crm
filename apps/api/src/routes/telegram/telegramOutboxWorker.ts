import type {
	DenteTelegramOutboxSendDueResponse,
} from "@dental/shared";
import {
	denteTelegramOutboxSendResponseSchema,
	denteTelegramOutboxSendDueResponseSchema,
} from "@dental/shared";
import type { DomainState } from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	buildDenteTelegramOutbox,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	dueOutboxClientMutationId,
	telegramRetryAfterSeconds,
} from "./telegramUtils.js";
import {
	executeTelegramOutboxSend,
	isDenteTelegramOutboxItemDue,
	telegramOutboxScheduleState,
	telegramOutboxScheduleUnreadableWarning,
} from "./telegramOutboxDelivery.js";
import {
	resolveTelegramOutboxRuntimeScopeFromQuery,
} from "./telegramRuntimeContext.js";
import {
	telegramOutboxScheduleUnreadableBlockedReason,
	type TelegramOutboxSendDueInput,
	type TelegramResolvedOutboxRuntime,
	type TelegramDueWorkerLogger,
	type DenteTelegramOutboxDueWorkerHandle,
} from "./types.js";

export async function executeDenteTelegramOutboxDueBatch(
	input: TelegramOutboxSendDueInput,
	runtime?: TelegramResolvedOutboxRuntime,
	domainState?: DomainState,
): Promise<DenteTelegramOutboxSendDueResponse> {
	const runtimeResult = runtime
		? { ok: true as const, runtime }
		: resolveTelegramOutboxRuntimeScopeFromQuery({});
	if (!runtimeResult.ok) {
		return denteTelegramOutboxSendDueResponseSchema.parse({
			ok: false,
			dryRun: input.dryRun,
			requestedLimit: input.limit,
			dueCount: 0,
			notDueCount: 0,
			attemptedCount: 0,
			sentCount: 0,
			dryRunCount: 0,
			blockedCount: 1,
			failedCount: 0,
			results: [
				{
					itemId: "telegram-runtime-scope",
					statusCode: runtimeResult.statusCode,
					result: {
						error: runtimeResult.error,
						message: runtimeResult.message,
					},
				},
			],
		});
	}
	const requestedLimit = input.limit ?? 50;
	const outbox = buildDenteTelegramOutbox(
		{ limit: Math.max(requestedLimit, 50), status: "due" },
		runtimeResult.runtime.runtimeScope,
		domainState,
	);
	const nowMs = Date.now();
	const readyItems = outbox.items.filter(
		(item) => item.deliveryStatus === "ready",
	);
	const dueItems = readyItems
		.filter((item) => isDenteTelegramOutboxItemDue(item, nowMs))
		.slice(0, requestedLimit);
	// Позиция с нечитаемым временем не отправляется, но и не исчезает молча: она уходит в ответ как
	// заблокированная, поэтому попадает в blockedCount, в лог воркера и в ответ роута со статусом 409.
	// Без этого fail-closed превратился бы в «тихо не отправляем и никому не говорим».
	const unreadableItems = readyItems
		.filter(
			(item) =>
				telegramOutboxScheduleState(item.scheduledAt, nowMs) === "unreadable",
		)
		.slice(0, requestedLimit);
	const unreadableResults: DenteTelegramOutboxSendDueResponse["results"] =
		unreadableItems.map((item) => ({
			itemId: item.id,
			statusCode: 409,
			result: denteTelegramOutboxSendResponseSchema.parse({
				status: "blocked",
				outboxItem: item,
				taskId: item.taskId,
				eventId: null,
				telegramMessageId: null,
				clientMutationId: null,
				warnings: [
					...item.warnings,
					telegramOutboxScheduleUnreadableWarning(item.scheduledAt),
				],
				retryAfterSeconds: null,
				blockedReason: telegramOutboxScheduleUnreadableBlockedReason,
			}),
		}));
	const sendResults: DenteTelegramOutboxSendDueResponse["results"] =
		await Promise.all(
			dueItems.map(async (item) => {
				const sendResult = await executeTelegramOutboxSend(
					item.id,
					{
						dryRun: Boolean(input.dryRun),
						clientMutationId: input.dryRun
							? null
							: dueOutboxClientMutationId(item.id, item.scheduledAt),
					},
					runtimeResult.runtime,
					domainState,
				);
				return {
					itemId: item.id,
					statusCode: sendResult.statusCode,
					result: sendResult.body,
				};
			}),
		);
	const results: DenteTelegramOutboxSendDueResponse["results"] = [
		...sendResults,
		...unreadableResults,
	];
	const sentCount = results.filter(
		(entry) => "status" in entry.result && entry.result.status === "sent",
	).length;
	const dryRunCount = results.filter(
		(entry) => "status" in entry.result && entry.result.status === "dry_run",
	).length;
	const blockedCount = results.filter(
		(entry) => "status" in entry.result && entry.result.status === "blocked",
	).length;
	const failedCount = results.filter(
		(entry) => "status" in entry.result && entry.result.status === "failed",
	).length;
	return denteTelegramOutboxSendDueResponseSchema.parse({
		ok: failedCount === 0 && blockedCount === 0,
		dryRun: input.dryRun,
		requestedLimit: input.limit,
		dueCount: outbox.dueCount,
		notDueCount: outbox.notDueCount,
		// Отправкой считается только реальная попытка: отказ по нечитаемому времени попыткой не был.
		attemptedCount: sendResults.length,
		sentCount,
		dryRunCount,
		blockedCount,
		failedCount,
		results,
	});
}


export function parseTelegramWorkerBoolean(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function parseTelegramWorkerInt(
	value: string | undefined,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function retryAfterDelayMs(
	response: DenteTelegramOutboxSendDueResponse,
): number | null {
	let retryAfterSeconds = 0;
	for (const entry of response.results) {
		if ("retryAfterSeconds" in entry.result) {
			const retryAfter = entry.result.retryAfterSeconds;
			if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
				retryAfterSeconds = Math.max(retryAfterSeconds, retryAfter);
			}
		}
	}
	return retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
}

export function startDenteTelegramOutboxDueWorker(
	options: { logger?: TelegramDueWorkerLogger } = {},
): DenteTelegramOutboxDueWorkerHandle {
	const enabled = parseTelegramWorkerBoolean(
		process.env.DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED,
	);
	const logger = options.logger;
	if (!enabled) {
		return {
			enabled: false,
			stop: () => undefined,
			runOnce: async () => null,
		};
	}

	const intervalMs = parseTelegramWorkerInt(
		process.env.DENTE_TELEGRAM_OUTBOX_WORKER_INTERVAL_MS,
		60_000,
		15_000,
		15 * 60_000,
	);
	const limit = parseTelegramWorkerInt(
		process.env.DENTE_TELEGRAM_OUTBOX_WORKER_BATCH_LIMIT,
		10,
		1,
		25,
	);
	const dryRun = parseTelegramWorkerBoolean(
		process.env.DENTE_TELEGRAM_OUTBOX_WORKER_DRY_RUN,
	);
	const runOnStart = parseTelegramWorkerBoolean(
		process.env.DENTE_TELEGRAM_OUTBOX_WORKER_RUN_ON_START,
	);
	let stopped = false;
	let inFlight = false;
	let skippedTicks = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const schedule = (delayMs: number) => {
		if (stopped) return;
		timer = setTimeout(() => {
			void runAndReschedule().catch((error: unknown) => {
				logger?.error?.({ error }, "DENTE Telegram due worker tick failed");
			});
		}, delayMs);
		if (timer && "unref" in timer && typeof timer.unref === "function") {
			timer.unref();
		}
	};

	const runAndReschedule =
		async (): Promise<DenteTelegramOutboxSendDueResponse | null> => {
			if (stopped) return null;
			if (inFlight) {
				skippedTicks += 1;
				logger?.warn?.(
					{ skippedTicks },
					"DENTE Telegram due worker skipped overlapping tick",
				);
				schedule(intervalMs);
				return null;
			}
			inFlight = true;
			try {
				const response = await executeDenteTelegramOutboxDueBatch({
					dryRun,
					limit,
				});
				const retryDelayMs = retryAfterDelayMs(response);
				logger?.info?.(
					{
						attemptedCount: response.attemptedCount,
						sentCount: response.sentCount,
						dryRunCount: response.dryRunCount,
						blockedCount: response.blockedCount,
						failedCount: response.failedCount,
						retryDelayMs,
					},
					"DENTE Telegram due worker tick completed",
				);
				schedule(retryDelayMs ?? intervalMs);
				return response;
			} catch (error) {
				logger?.error?.({ error }, "DENTE Telegram due worker tick failed");
				schedule(intervalMs);
				throw error;
			} finally {
				inFlight = false;
			}
		};

	const handle: DenteTelegramOutboxDueWorkerHandle = {
		enabled: true,
		stop: () => {
			stopped = true;
			if (timer) clearTimeout(timer);
			timer = null;
		},
		runOnce: runAndReschedule,
	};
	logger?.info?.(
		{ intervalMs, limit, dryRun, runOnStart },
		"DENTE Telegram due worker enabled",
	);
	schedule(runOnStart ? 0 : intervalMs);
	return handle;
}