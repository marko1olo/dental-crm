/**
 * Как отчёт об отправке звучит для человека.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ. Текст итога собирался прямо внутри
 * MessageDeliveryConsole.tsx, и собирался неполно. Сервер возвращал СЕМЬ
 * счётчиков разбора очереди, а экран объявлял тип из ЧЕТЫРЁХ полей и ветвился по
 * трём. Самый частый в жизни отказ — шлюз недоступен — даёт
 * `{claimed: 5, sent: 0, retried: 5, failed: 0, suppressed: 0}`: пять сообщений
 * взяты из очереди, ни одно не ушло, `failed` равен нулю. Экран считал
 * `failed > 0 ? "fail" : "done"`, получал «done» и печатал спокойной серой
 * строкой с role="status": «Отправлено: 0 сообщений.» Пять напоминаний не дошли
 * до пациентов, а клиника видела сообщение об успехе. То же с `deferred` (тихие
 * часы) — он не существовал для экрана вовсе.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ ФУНКЦИЯ В КОМПОНЕНТЕ. Здесь нет ни React, ни
 * стилей, поэтому проверка «отчёт вида X не должен читаться как успех» — обычный
 * тест на чистой функции, а не запуск браузера. Ровно этого не хватало, чтобы
 * дефект нашёлся тестом, а не в клинике.
 *
 * ГЛАВНОЕ ПРАВИЛО. Каждое поле отчёта описано в таблице
 * `ReportVoice<TReport>` — отображённом типе по `keyof TReport`. Добавили в отчёт
 * поле — сборка падает, пока не сказано, как оно читается человеку. Молча выпасть
 * из текста, как выпали `retried`, `deferred`, `releasedStuck`,
 * `skippedNoChannel` и `skippedNoTemplateData`, новое поле больше не может.
 *
 * ЯЗЫК. Библиотеки i18n в проекте нет, поэтому строки лежат здесь прямым текстом,
 * как и во всём разделе «Связь». Плюс в том, что теперь они собраны в одном
 * словаре, а не размазаны по обработчикам кнопок; минус записан долгом в handoff.
 */

// Из ЛИСТОВОГО модуля, а не из AppHelpers: тот файл на 6066 строк по цепочке
// импортов тянет таблицы стилей, из-за чего тест этого модуля падал на
// ERR_UNKNOWN_FILE_EXTENSION ещё до первого утверждения. То есть вынос логики
// отчёта из компонента — сделанный ровно для того, чтобы её можно было
// проверять без React, — обнулялся одной этой строкой импорта.
import { countLabel } from "../../lib/russianPlural.js";

/**
 * ПОЧЕМУ РАЗДЕЛЕНО НА ВИДЫ. БЫЛО СЛОМАНО: и удача, и отказ писались в одно поле
 * `notice` и выводились одинаковой серой строкой с role="status". Администратор
 * нажимал «Отправить из очереди», сервер отвечал отказом, а на экране появлялась
 * такая же спокойная строка, как после успешной отправки, — «Сервер ответил
 * 500». Человек считал, что сообщения ушли, и не отправлял их повторно: письма
 * и SMS не доходили до пациентов, а на экране всё выглядело сделанным.
 * Отказ идёт красным блоком и через role="alert", и к нему всегда прикладывается
 * подсказка, что делать дальше.
 */
export type Notice = { kind: "done" | "fail"; text: string };

/** Отказ: сначала понятная человеку подсказка, потом причина от сервера. */
export function failNotice(error: unknown, hint: string): Notice {
	const reason = error instanceof Error ? error.message : String(error);
	return { kind: "fail", text: `${hint} Причина: ${reason}` };
}

/** Отметка времени в журнале и в списке необзвоненных пациентов — одним правилом. */
export function formatMoment(value: string | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "—";
	return parsed.toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ─── Контракт сервера ────────────────────────────────────────────────────────
//
// Оба типа повторяют ответ apps/api: DispatchReport из
// services/communications/dispatcher.ts и ReminderScheduleReport из
// services/communications/appointmentReminders.ts. Общего пакета типов у этих
// двух маршрутов нет, поэтому расхождение ловится тестом на форму отчёта, а не
// компилятором: см. tests/deliveryReportNotice.test.ts.

export type DispatchReport = {
	readonly claimed: number;
	readonly sent: number;
	readonly retried: number;
	readonly failed: number;
	readonly suppressed: number;
	readonly notConfigured: number;
	readonly deferred: number;
	readonly releasedStuck: number;
	/** Осталось лежать со сроком в будущем после неудачной попытки. Не пересекается с `retried`. */
	readonly awaitingRetry: number;
	/** Осталось ждать назначенного времени: попыток ещё не было. Не пересекается с `deferred`. */
	readonly awaitingSchedule: number;
};

export type ReminderSkipReason = "no_channel" | "no_template_data";

export type ReminderSkip = {
	readonly patientName: string;
	readonly reason: ReminderSkipReason;
	readonly appointmentAt: string;
};

export type ReminderScheduleReport = {
	readonly organizations: number;
	readonly examined: number;
	readonly queued: number;
	readonly alreadyQueued: number;
	readonly skippedNoChannel: number;
	readonly skippedNoTemplateData: number;
	readonly skipped: readonly ReminderSkip[];
	readonly problems: readonly string[];
};

// ─── Устройство таблиц ───────────────────────────────────────────────────────

/**
 * Чем является число для человека.
 *
 * `undelivered` — «сообщение не дошло до живого человека». Достаточно одного
 * такого счётчика больше нуля, чтобы итог перестал быть спокойным: это и есть
 * правило, которое нельзя закрыть наполовину. Раньше красным становился только
 * `failed`, и самый частый отказ проходил мимо.
 */
type CounterRole = "total" | "delivered" | "undelivered" | "detail";

type ReportVoice<TReport> = {
	readonly [Field in keyof TReport]: {
		readonly role: CounterRole;
		/** Порядок в готовой фразе: сначала итог, потом причины, потом подробности. */
		readonly order: number;
		/** Что сказать про это поле. `null` — говорить нечего (ноль, пустой список). */
		readonly say: (value: TReport[Field], report: TReport) => string | null;
	};
};

type SpokenPart = { readonly role: CounterRole; readonly text: string };

/**
 * Одно поле отчёта — во фразу или в ничто.
 *
 * Отдельная функция с параметром типа `Field` нужна не для красоты: внутри
 * `speak` ключ имеет тип-объединение `keyof TReport`, и тогда `voice[field].say`
 * тоже объединение функций, а его параметр сводится к `never` — код не
 * компилируется. С параметром типа связь «ключ → тип значения» сохраняется, и
 * проверка остаётся настоящей, без приведения типов.
 */
function speakField<TReport extends object, Field extends keyof TReport>(
	report: TReport,
	voice: ReportVoice<TReport>,
	field: Field,
): { readonly order: number; readonly part: SpokenPart | null } {
	const entry = voice[field];
	const text = entry.say(report[field], report);
	return {
		order: entry.order,
		part: text === null ? null : { role: entry.role, text },
	};
}

function speak<TReport extends object>(
	report: TReport,
	voice: ReportVoice<TReport>,
): SpokenPart[] {
	const fields = Object.keys(voice) as (keyof TReport)[];
	return fields
		.map((field) => speakField(report, voice, field))
		.sort((left, right) => left.order - right.order)
		.flatMap((spoken) => (spoken.part === null ? [] : [spoken.part]));
}

/** Спокойным итог остаётся только тогда, когда ни одно сообщение не осталось недоставленным. */
function noticeFrom(parts: SpokenPart[]): Notice {
	return {
		kind: parts.some((part) => part.role === "undelivered") ? "fail" : "done",
		text: parts.map((part) => part.text).join(" "),
	};
}

// ─── Разбор очереди ──────────────────────────────────────────────────────────

function messages(count: number): string {
	return countLabel(count, "сообщение", "сообщения", "сообщений");
}

const dispatchVoice: ReportVoice<DispatchReport> = {
	/*
	 * `claimed` называется всегда. Родительская версия печатала «Разобрано N:
	 * отправлено M…», и это была единственная строка на экране, из которой было
	 * видно, что сообщения взяты, а не ушли. Следующая версия её потеряла: осталось
	 * «Отправлено: 0 сообщений» без числа взятых.
	 */
	claimed: {
		role: "total",
		order: 10,
		say: (claimed) => `Взято из очереди: ${messages(claimed)}.`,
	},
	sent: {
		role: "delivered",
		order: 20,
		say: (sent) => `Отправлено: ${messages(sent)}.`,
	},
	retried: {
		role: "undelivered",
		order: 30,
		say: (retried) =>
			retried > 0
				? `Пока не ушло, попробуем ещё раз: ${retried}. Шлюз отказал — причина по каждому сообщению в ` +
					"журнале ниже. Следующая попытка будет позже сама; чтобы не ждать, нажмите «Отправить из очереди» " +
					"снова через несколько минут."
				: null,
	},
	failed: {
		role: "undelivered",
		order: 40,
		say: (failed) =>
			failed > 0
				? `Не ушло совсем: ${failed}. Попытки закончились — причина в журнале ниже, там же кнопка ` +
					"«Повторить» в строке сообщения."
				: null,
	},
	notConfigured: {
		role: "undelivered",
		order: 50,
		say: (notConfigured) =>
			notConfigured > 0
				? `Отправлять нечем: ${notConfigured}. Канал связи не настроен, и сами эти сообщения не уйдут ` +
					"никогда — сначала нужно подключить канал выше."
				: null,
	},
	suppressed: {
		role: "undelivered",
		order: 60,
		say: (suppressed) =>
			suppressed > 0
				? `Отправлять не стали: ${suppressed}. Пациент отказался от сообщений, исчерпан суточный предел ` +
					"или это реклама в тихие часы — в журнале ниже состояние «Не отправлено» и причина."
				: null,
	},
	deferred: {
		role: "undelivered",
		order: 70,
		say: (deferred) =>
			deferred > 0
				? `Отложено до утра: ${deferred}. Сейчас тихие часы — эти сообщения уйдут сами, когда тишина ` +
					"закончится (границы указаны в правилах рассылки ниже)."
				: null,
	},
	releasedStuck: {
		role: "detail",
		order: 80,
		say: (releasedStuck) =>
			releasedStuck > 0
				? `Заодно возвращено в очередь: ${releasedStuck} — эти сообщения зависли на предыдущей отправке.`
				: null,
	},
	/*
	 * Остаток очереди. Строки этого прохода сервер из обоих счётчиков исключил, так
	 * что здесь речь всегда о ДОПОЛНИТЕЛЬНЫХ сообщениях: пачка ограничена сверху, и
	 * «взято 25, отправлено 25» при сорока неотправленных — это не законченная
	 * работа.
	 */
	awaitingRetry: {
		role: "undelivered",
		order: 90,
		say: (awaitingRetry) =>
			awaitingRetry > 0
				? `Кроме этих, ждут повторной попытки: ${messages(awaitingRetry)} — их уже пробовали отправить, и ` +
					"не получилось. Нажмите «Отправить из очереди» ещё раз через несколько минут."
				: null,
	},
	awaitingSchedule: {
		role: "detail",
		order: 100,
		say: (awaitingSchedule) =>
			awaitingSchedule > 0
				? `Ещё ${messages(awaitingSchedule)} ждут своего времени — они уйдут, когда наступит срок.`
				: null,
	},
};

export function describeDispatchReport(report: DispatchReport): Notice {
	if (report.claimed === 0) {
		/*
		 * ВТОРОЕ НАЖАТИЕ. `claimBatch` берёт только строки с `nextAttemptAt <= now`,
		 * а неудачная попытка отодвигает срок в будущее, оставляя статус «в очереди».
		 * Поэтому после первого отказа второе нажатие видит `claimed === 0` — и
		 * печатало спокойное «Отправлять было нечего», пока пять неотправленных
		 * сообщений лежали с выдержкой.
		 */
		if (report.awaitingRetry > 0) {
			return {
				kind: "fail",
				text:
					`Ничего не отправлено: ${messages(report.awaitingRetry)} ждут повторной попытки после неудачной ` +
					"отправки, и раньше срока их брать нельзя. Причина по каждому — в журнале ниже; там же кнопка " +
					"«Повторить», если ждать не нужно." +
					(report.awaitingSchedule > 0
						? ` Ещё ${report.awaitingSchedule} ждут назначенного времени.`
						: ""),
			};
		}
		if (report.awaitingSchedule > 0) {
			// Назначенное на будущее — обычная работа, а не сбой. Красить в красный
			// нормальное состояние значит обесценить красный цвет для настоящей беды.
			return {
				kind: "done",
				text:
					`Отправлять сейчас нечего: ${messages(report.awaitingSchedule)} в очереди ждут назначенного ` +
					"времени и уйдут сами, когда оно наступит. Неудачных отправок нет.",
			};
		}
		// Пустая очередь при живом канале — нормальное состояние, а не сбой.
		return {
			kind: "done",
			text:
				"Отправлять было нечего: в очереди нет сообщений. Они появятся после кнопки «Поставить напоминания» " +
				"или после запуска рассылки.",
		};
	}

	return noticeFrom(speak(report, dispatchVoice));
}

// ─── Напоминания ─────────────────────────────────────────────────────────────

const skipReasonWords: Record<ReminderSkipReason, string> = {
	no_channel:
		"нет способа связи: не указан телефон или почта, нет привязки к мессенджеру либо пациент отказался",
	no_template_data:
		"в шаблоне напоминания не хватает данных о приёме, а отправлять с пропуском нельзя",
};

/** «Орлова Марина Петровна (29.07, 14:30)» — кому звонить и о каком приёме. */
function describeSkip(skip: ReminderSkip): string {
	return `${skip.patientName} (${formatMoment(skip.appointmentAt)})`;
}

function namesFor(
	skips: readonly ReminderSkip[],
	reason: ReminderSkipReason,
): string[] {
	return skips.filter((skip) => skip.reason === reason).map(describeSkip);
}

const reminderVoice: ReportVoice<ReminderScheduleReport> = {
	queued: {
		role: "delivered",
		order: 10,
		say: (queued) => `Поставлено напоминаний: ${queued}.`,
	},
	alreadyQueued: {
		role: "detail",
		order: 20,
		say: (alreadyQueued) =>
			alreadyQueued > 0 ? `Уже стояли в очереди: ${alreadyQueued}.` : null,
	},
	/*
	 * `organizations` — сколько клиник с ВКЛЮЧЁННЫМИ напоминаниями обработано
	 * (appointmentReminders.ts отбирает по appointmentReminderEnabled). Маршрут
	 * всегда ограничен одной клиникой, поэтому ноль здесь значит ровно одно:
	 * напоминания выключены. Экран показывал в этом случае спокойное «Поставлено
	 * напоминаний: 0» — администратор нажал кнопку, не получил ничего и не узнал
	 * почему. В отчёте по всем клиникам ноль означает «ни у кого не включены», и
	 * фраза остаётся верной.
	 */
	organizations: {
		role: "undelivered",
		order: 30,
		say: (organizations) =>
			organizations === 0
				? "Автоматические напоминания у клиники выключены, поэтому ставить их сейчас не из чего. Включите " +
					"их в правилах рассылки ниже — для этого нужен активный шаблон «Подтверждение приёма»."
				: null,
	},
	problems: {
		role: "undelivered",
		order: 40,
		say: (problems) => (problems.length > 0 ? problems.join(" ") : null),
	},
	skippedNoChannel: {
		role: "undelivered",
		order: 50,
		say: (skippedNoChannel, report) =>
			skippedNoChannel > 0
				? saySkipped(skippedNoChannel, "no_channel", report)
				: null,
	},
	skippedNoTemplateData: {
		role: "undelivered",
		order: 60,
		say: (skippedNoTemplateData, report) =>
			skippedNoTemplateData > 0
				? saySkipped(skippedNoTemplateData, "no_template_data", report)
				: null,
	},
	/*
	 * Имена печатаются рядом со своим счётчиком (см. saySkipped), поэтому само поле
	 * `skipped` отдельной фразы не даёт. Исключение — список пришёл, а счётчики
	 * нулевые: это расхождение с сервером, и молчать о нём нельзя, иначе имена
	 * потеряются точно так же, как терялись счётчики.
	 */
	skipped: {
		role: "undelivered",
		order: 70,
		say: (skipped, report) =>
			skipped.length > 0 &&
			report.skippedNoChannel === 0 &&
			report.skippedNoTemplateData === 0
				? `Без напоминания остались: ${skipped.map(describeSkip).join(", ")}. Этим пациентам нужно позвонить.`
				: null,
	},
	/*
	 * `examined` — сколько приёмов посмотрели. Ноль при включённых напоминаниях
	 * значит, что подходящих приёмов сейчас просто нет: это спокойный итог, но
	 * необъяснённый ноль на экране читается как поломка.
	 */
	examined: {
		role: "detail",
		order: 80,
		say: (examined, report) =>
			examined === 0 && report.organizations > 0 && report.problems.length === 0
				? "Приёмов, о которых пора напоминать, сейчас нет: напоминание ставится за столько часов до приёма, " +
					"сколько указано в правилах рассылки ниже."
				: null,
	},
};

/**
 * Сколько пациентов осталось без напоминания, почему и КТО именно. Счётчик
 * точный, имён столько, сколько прислал сервер: он ограничивает список
 * (MAX_NAMED_REMINDER_SKIPS), и умалчивать об обрезке нельзя.
 */
function saySkipped(
	count: number,
	reason: ReminderSkipReason,
	report: ReminderScheduleReport,
): string {
	const named = namesFor(report.skipped, reason);
	const head = `Без напоминания остались ${countLabel(count, "пациент", "пациента", "пациентов")} — ${skipReasonWords[reason]}.`;
	if (named.length === 0) {
		// Имён нет: старый сервер или обрезка. Числу верим, людей не выдумываем.
		return `${head} Кто именно — сервер не назвал; посмотрите приёмы на этот день в расписании.`;
	}
	const tail = named.length < count ? ` Названы первые ${named.length}.` : "";
	return `${head} Это ${named.join(", ")}.${tail} Этим пациентам нужно позвонить.`;
}

export function describeReminderReport(report: ReminderScheduleReport): Notice {
	return noticeFrom(speak(report, reminderVoice));
}
