/**
 * Фоновый разбор очереди исходящих сообщений.
 *
 * ЗАЧЕМ: services/notificationWorker.ts объявлял `setInterval` в 10 секунд и
 * ниоткуда не вызывался — startNotificationWorker не встречается в проекте
 * нигде, кроме собственного теста. Очередь не разбиралась вообще.
 *
 * Устройство повторяет startDenteTelegramOutboxDueWorker в routes/telegram.ts:
 * следующий тик планируется только после завершения предыдущего, наложение
 * тиков исключено, а сам обработчик выключается переменной окружения — на
 * машине разработчика фоновые отправки не нужны.
 */

import { scheduleAppointmentReminders, type ReminderScheduleReport } from "./appointmentReminders.js";
import { purgeExpiredActionCodes } from "./appointmentActionLinks.js";
import { completeFinishedCampaigns, launchScheduledCampaigns } from "./campaigns.js";
import { processInboundEvents } from "../messengerIngestion.js";
import { dispatchDueMessages, type DispatchReport } from "./dispatcher.js";

export type DispatchWorkerLogger = {
	info: (payload: Record<string, unknown>, message: string) => void;
	warn: (payload: Record<string, unknown>, message: string) => void;
	error: (payload: Record<string, unknown>, message: string) => void;
};

export type DispatchWorkerHandle = {
	readonly enabled: boolean;
	stop: () => void;
	runOnce: () => Promise<DispatchReport | null>;
	/** Отдельный прогон планировщика напоминаний — для теста и ручного запуска. */
	scheduleRemindersOnce: () => Promise<ReminderScheduleReport | null>;
};

/**
 * Состояние автоматической отправки — для показа в интерфейсе.
 *
 * ЗАЧЕМ ЭТО ОТДЕЛЬНО. Обработчик выключен по умолчанию, и это правильно: рассылка
 * пациентам не должна включаться сама на чьей-то машине. Но узнать об этом из
 * интерфейса было НЕЛЬЗЯ. Клиника видела очередь, в которой копятся сообщения, и
 * не имела ни одного признака, что их никто не отправляет. Худший исход такой:
 * администратор уверен, что напоминания уходят, пациенты не приходят, и никто не
 * связывает одно с другим неделями.
 */
export type AutomaticSendingState = {
	readonly enabled: boolean;
	readonly intervalSeconds: number | null;
	readonly batchSize: number | null;
	/** Что делать человеку, читающему это на экране. */
	readonly detail: string;
	/** Имя переменной окружения — чтобы не искать её по документации. */
	readonly enableWith: string;
};

/**
 * Чистая функция: читает окружение и объясняет состояние словами. Вынесена из
 * тела обработчика, чтобы её можно было и показать в интерфейсе, и проверить
 * тестом без запуска таймеров.
 */
export function describeAutomaticSending(env: NodeJS.ProcessEnv = process.env): AutomaticSendingState {
	const enabled = parseBoolean(env.DENTE_COMMUNICATION_WORKER_ENABLED);
	if (!enabled) {
		return {
			enabled: false,
			intervalSeconds: null,
			batchSize: null,
			detail:
				"Автоматическая отправка выключена на сервере: сообщения копятся в очереди и никуда не уходят. " +
				// Название кнопки указано ровно то, что стоит на экране
				// (MessageDeliveryConsole): текст, отсылающий к несуществующей
				// кнопке, — это тупик, а не подсказка.
				"Пока она выключена, очередь разбирается вручную кнопкой «Отправить из очереди».",
			enableWith: "DENTE_COMMUNICATION_WORKER_ENABLED"
		};
	}

	const intervalMs = parseInteger(env.DENTE_COMMUNICATION_WORKER_INTERVAL_MS, 30_000, 5_000, 15 * 60_000);
	return {
		enabled: true,
		intervalSeconds: Math.round(intervalMs / 1000),
		batchSize: parseInteger(env.DENTE_COMMUNICATION_WORKER_BATCH_SIZE, 25, 1, 200),
		detail: `Очередь разбирается автоматически каждые ${Math.round(intervalMs / 1000)} с.`,
		enableWith: "DENTE_COMMUNICATION_WORKER_ENABLED"
	};
}

function parseBoolean(value: string | undefined): boolean {
	const normalized = value?.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseInteger(value: string | undefined, fallback: number, min: number, max: number): number {
	const parsed = Number.parseInt(value?.trim() ?? "", 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, parsed));
}

export function startCommunicationDispatchWorker(
	options: { logger?: DispatchWorkerLogger; env?: NodeJS.ProcessEnv } = {}
): DispatchWorkerHandle {
	const env = options.env ?? process.env;
	const logger = options.logger;

	if (!parseBoolean(env.DENTE_COMMUNICATION_WORKER_ENABLED)) {
		return { enabled: false, stop: () => undefined, runOnce: async () => null, scheduleRemindersOnce: async () => null };
	}

	const intervalMs = parseInteger(env.DENTE_COMMUNICATION_WORKER_INTERVAL_MS, 30_000, 5_000, 15 * 60_000);
	const batchSize = parseInteger(env.DENTE_COMMUNICATION_WORKER_BATCH_SIZE, 25, 1, 200);
	const stuckLockMinutes = parseInteger(env.DENTE_COMMUNICATION_WORKER_STUCK_LOCK_MINUTES, 10, 1, 240);
	const workerId = `${env.DENTE_COMMUNICATION_WORKER_ID?.trim() || "api"}:${process.pid}`;
	// Напоминания ставятся реже, чем разбирается очередь: приёмы не появляются
	// каждые полминуты, а лишний проход — это лишние запросы к базе.
	const reminderEveryTicks = parseInteger(env.DENTE_COMMUNICATION_REMINDER_EVERY_TICKS, 10, 1, 200);
	let ticksSinceReminders = reminderEveryTicks;

	let stopped = false;
	let inFlight = false;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const schedule = (delayMs: number) => {
		if (stopped) return;
		timer = setTimeout(() => {
			void tick();
		}, delayMs);
		// Тик не должен удерживать процесс при завершении работы.
		timer.unref?.();
	};

	const runOnce = async (): Promise<DispatchReport | null> => {
		if (stopped || inFlight) return null;
		inFlight = true;
		try {
			return await dispatchDueMessages({ batchSize, workerId, stuckLockMinutes });
		} finally {
			inFlight = false;
		}
	};

	const scheduleRemindersOnce = async (): Promise<ReminderScheduleReport | null> => {
		if (stopped) return null;
		return scheduleAppointmentReminders();
	};

	const tick = async () => {
		if (stopped) return;
		if (inFlight) {
			logger?.warn({}, "Разбор очереди сообщений: предыдущий тик ещё идёт, пропуск");
			schedule(intervalMs);
			return;
		}
		try {
			// Входящие разбираются на каждом тике, а не раз в десять: ответ
			// «СТОП» должен остановить рассылку до следующей отправки, а не
			// после неё.
			//
			// До этого разбор запускался только из вебхуков WhatsApp и MAX, без
			// ожидания результата и без повтора: упавшее событие не разбиралось
			// больше никогда, а входящие из других каналов — вообще.
			const inbound = await processInboundEvents({ limit: 100 });
			if (inbound.processed > 0) {
				logger?.info(
					{
						processed: inbound.processed,
						matched: inbound.matchedToPatient,
						leads: inbound.leadsCreated,
						optOuts: inbound.optOuts,
						ambiguous: inbound.ambiguous
					},
					"Входящие сообщения разобраны"
				);
			}
			for (const problem of inbound.problems) logger?.warn({ problem }, "Входящее сообщение не разобрано");
		} catch (error) {
			logger?.error({ error }, "Разбор входящих сообщений не удался");
		}

		try {
			// Сначала поставить напоминания, потом разобрать очередь: то, что
			// поставлено сейчас, уйдёт этим же проходом.
			if (ticksSinceReminders >= reminderEveryTicks) {
				ticksSinceReminders = 0;

				// Отложенные рассылки: время пришло — ставим получателей в очередь.
				const campaigns = await launchScheduledCampaigns();
				if (campaigns.launched > 0) {
					logger?.info({ launched: campaigns.launched }, "Отложенные рассылки запущены");
				}
				for (const problem of campaigns.problems) logger?.warn({ problem }, "Отложенная рассылка не запущена");

				// Запущенная рассылка без остатка в очереди считается завершённой.
				// Без этого «выполняется» остаётся навсегда.
				const finished = await completeFinishedCampaigns();
				if (finished > 0) logger?.info({ finished }, "Рассылки завершены");

				// Просроченные коды ссылок: держим неделю после истечения на случай
				// разбора «я нажал, а не сработало», дальше они только занимают место.
				const purged = await purgeExpiredActionCodes(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
				if (purged > 0) logger?.info({ purged }, "Просроченные ссылки подтверждения убраны");

				const reminders = await scheduleAppointmentReminders();
				if (reminders.queued > 0 || reminders.problems.length > 0) {
					logger?.info(
						{ queued: reminders.queued, examined: reminders.examined, problems: reminders.problems.length },
						"Напоминания о приёме поставлены в очередь"
					);
				}
				for (const problem of reminders.problems) logger?.warn({ problem }, "Напоминания о приёме: помеха");
			} else {
				ticksSinceReminders += 1;
			}
		} catch (error) {
			logger?.error({ error }, "Планировщик напоминаний не отработал");
		}

		try {
			const report = await runOnce();
			// Логируется только непустой проход: иначе журнал заполняется нулями.
			if (report && report.claimed > 0) {
				logger?.info({ ...report }, "Разбор очереди сообщений завершён");
			}
			if (report && report.releasedStuck > 0) {
				logger?.warn({ releasedStuck: report.releasedStuck }, "Возвращены зависшие отправки");
			}
		} catch (error) {
			logger?.error({ error }, "Разбор очереди сообщений не удался");
		}
		schedule(intervalMs);
	};

	schedule(intervalMs);

	return {
		enabled: true,
		stop: () => {
			stopped = true;
			if (timer) clearTimeout(timer);
			timer = null;
		},
		runOnce,
		scheduleRemindersOnce
	};
}
