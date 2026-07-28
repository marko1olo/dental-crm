/**
 * Таблица «Эффективность врачей» на экране аналитики: форматирование ячеек и
 * разбор ответа /api/analytics/dashboard.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Здесь нет ни React, ни импорта CSS, поэтому решения
 * о том, что показать вместо неизвестного числа и что показать вместо
 * упавшего запроса, проверяются обычным node:test, а не глазами по скриншоту.
 * Именно эти два решения экран и провалил.
 *
 * ЧТО БЫЛО СЛОМАНО
 *
 * 1. Прибыль. Сервер (apps/api/src/routes/analytics.ts:131-132) честно отдаёт
 *    `margin: null` и `completionRate: null`: себестоимости материалов и
 *    процента врача в базе нет, а прежние «35 % маржи» и «85 % успешности»
 *    были константами, выданными за расчёт. Интерфейс к этому не привели —
 *    он печатал строку «+null ₽» зелёным цветом прибыли и «null%» красным.
 *    Красный тут особенно вреден: null не проходит ни `>= 80`, ни `>= 60`,
 *    поэтому неизвестное значение получало вид плохой оценки врача.
 *
 * 2. Пустое тело ответа. `await res.json()` на пустом теле бросает исключение,
 *    и его английский текст — «Failed to execute 'json' on 'Response'…» —
 *    печатался пользователю как единственное содержимое экрана.
 *
 * ПРАВИЛО, ОБЩЕЕ С ОТЧЁТАМИ РУКОВОДИТЕЛЮ (components/reports/ManagerReportsPanel.tsx):
 * прочерк вместо выдуманного числа, и ноль — не замена неизвестному. Ноль
 * означает «посчитали, вышло ноль»; прочерк означает «считать не из чего».
 * Подменять второе первым — та же ложь, что и прежние 35 %.
 */

/** Тон ячейки. В цвет превращается только здесь — см. `metricToneClass`. */
export type MetricTone = "neutral" | "positive" | "warning" | "negative";

export interface MetricCell {
	/** Готовая подпись. Для неизвестного значения — прочерк без единиц измерения. */
	readonly text: string;
	readonly tone: MetricTone;
	/** Подсказка: почему значения нет. Только у неизвестных величин. */
	readonly title?: string;
}

/** Прочерк (U+2014), а не «0», не «n/a» и не пустая ячейка. */
export const UNKNOWN_METRIC_TEXT = "—";

export const UNKNOWN_MARGIN_TITLE =
	"Прибыль не рассчитывается: себестоимость материалов и процент врача в системе не заданы";

export const UNKNOWN_COMPLETION_TITLE =
	"Успешность не рассчитывается: в системе нет разметки завершённых и сорванных приёмов по врачу";

/**
 * Пороги оценки успешности в процентных пунктах. Вынесены из разметки, чтобы
 * граница «зелёный/жёлтый/красный» была видима и проверяема, а не спрятана в
 * тернарном операторе внутри JSX.
 */
export const COMPLETION_GOOD_PERCENT = 80;
export const COMPLETION_FAIR_PERCENT = 60;

/**
 * Классы тона. Только токены темы: `--ok-fg`, `--warn-fg`, `--bad-fg` и
 * `--muted` определены для light, dark и night в styles/dente-redesign.css.
 * Статических hex здесь быть не может — прежний класс `.margin-positive`
 * зашивал `#10b981` и в ночной теме светился чужим цветом.
 */
const TONE_CLASS: Record<MetricTone, string> = {
	neutral: "text-[var(--muted)]",
	positive: "text-[var(--ok-fg)]",
	warning: "text-[var(--warn-fg)]",
	negative: "text-[var(--bad-fg)]",
};

export function metricToneClass(tone: MetricTone): string {
	return TONE_CLASS[tone];
}

/**
 * Денежная сумма для дашборда: коротко, но без вранья.
 *
 * Сокращение здесь уместно — в плитке показателя длинное число не читается. Но
 * прежний вид врал и был нерусским:
 *
 *  - `(abs / 1_000).toFixed(0)` округлял до целых тысяч: 1 400 ₽ печаталось
 *    как «1K ₽», а 1 500 ₽ — как «2K ₽». В диапазоне от тысячи до десяти тысяч
 *    ошибка доходила до половины суммы, и это в плитке «Выручка».
 *  - «K» и «M» — латинские буквы в русском интерфейсе.
 *  - Суммы меньше тысячи печатались как есть: с переводом оплат на копейки
 *    (миграция 0131) 950,75 ₽ выводилось как «950.75 ₽» — с точкой и без
 *    разделения разрядов.
 *
 * Теперь: до тысячи — обычный денежный вид с копейками, дальше — один знак
 * после запятой и русские сокращения. 1 400 ₽ становится «1,4 тыс. ₽».
 */
export function formatRub(value: number): string {
	const sign = value < 0 ? "−" : "";
	const abs = Math.abs(value);
	const short = (divided: number) =>
		divided.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	if (abs >= 1_000_000) return `${sign}${short(abs / 1_000_000)} млн ₽`;
	if (abs >= 1_000) return `${sign}${short(abs / 1_000)} тыс. ₽`;
	const kopecks = Math.round(abs * 100) % 100;
	return `${sign}${abs.toLocaleString("ru-RU", {
		minimumFractionDigits: kopecks === 0 ? 0 : 2,
		maximumFractionDigits: kopecks === 0 ? 0 : 2,
	})} ₽`;
}

/** Значение, пригодное для показа как число: не null, не undefined, не NaN/Infinity. */
function isRealNumber(value: number | null | undefined): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * Ячейка «Прибыль».
 *
 * Неизвестно — прочерк нейтральным цветом, без «+» и без «₽»: единица
 * измерения у отсутствующего значения не имеет смысла.
 * Плюс ставится только у прибыли, которая действительно больше нуля.
 * Ноль нейтрален: это не прибыль и не убыток.
 */
export function formatMarginCell(margin: number | null | undefined): MetricCell {
	if (!isRealNumber(margin)) {
		return { text: UNKNOWN_METRIC_TEXT, tone: "neutral", title: UNKNOWN_MARGIN_TITLE };
	}
	if (margin > 0) return { text: `+${formatRub(margin)}`, tone: "positive" };
	if (margin < 0) return { text: formatRub(margin), tone: "negative" };
	return { text: formatRub(0), tone: "neutral" };
}

/**
 * Ячейка «Успешность». Значение — процентные пункты (85 означает 85 %), в той
 * же единице, в какой его отдавал сервер до того, как показатель стал null.
 *
 * Цвет берётся от настоящего числа. У неизвестного значения цвета оценки нет
 * вовсе: покрасить прочерк красным — значит выставить врачу оценку, которой
 * никто не считал.
 */
export function formatCompletionRate(rate: number | null | undefined): MetricCell {
	if (!isRealNumber(rate)) {
		return { text: UNKNOWN_METRIC_TEXT, tone: "neutral", title: UNKNOWN_COMPLETION_TITLE };
	}
	const rounded = Math.round(rate);
	const tone: MetricTone =
		rounded >= COMPLETION_GOOD_PERCENT
			? "positive"
			: rounded >= COMPLETION_FAIR_PERCENT
				? "warning"
				: "negative";
	return { text: `${rounded} %`, tone };
}

/* ------------------------------------------------------------------ */
/*  Разбор ответа сервера                                              */
/* ------------------------------------------------------------------ */

export interface AnalyticsKpis {
	readonly totalPatients: number;
	readonly totalRevenue: number;
	readonly totalAppointments: number;
	readonly avgRevenuePerPatient: number;
}

/**
 * Строка врача. `margin` и `completionRate` объявлены `number | null` — ровно
 * то, что отдаёт сервер. Прежнее `number` было ложью в типе, и именно поэтому
 * `npm run typecheck` был зелёным всё время, пока экран печатал «+null ₽».
 */
export interface DoctorProfitabilityRow {
	readonly name: string;
	readonly revenue: number;
	readonly margin: number | null;
	readonly completionRate: number | null;
}

/**
 * Когорты. Поле «Month 1» из типа убрано: сервер перестал его считать
 * (analytics.ts:213-218 — `void m1;`), объект собирается только из `cohort` и
 * «Month 12». График рисовал для него отдельную область и строку легенды
 * «1-й месяц», под которой никогда не было данных.
 */
export interface CohortLtvPoint {
	readonly cohort: string;
	readonly "Month 12": number;
}

export interface NamedValuePoint {
	readonly name: string;
	readonly value: number;
	readonly fill: string;
}

export interface AnalyticsDashboardData {
	readonly kpis: AnalyticsKpis;
	readonly cohortLtvJson: readonly CohortLtvPoint[];
	readonly planFunnelJson: readonly NamedValuePoint[];
	readonly chairUtilizationJson: readonly NamedValuePoint[];
	readonly doctorProfitabilityJson: readonly DoctorProfitabilityRow[];
	/**
	 * Признак пустого периода от сервера (analytics.ts:267-271). Позволяет
	 * отличить «за период ничего не было» от «запрос не удался» — это разные
	 * сообщения, и раньше экран не показывал ни одного из них.
	 */
	readonly isEmpty: boolean;
}

export type DashboardParseResult =
	| { readonly ok: true; readonly data: AnalyticsDashboardData }
	| { readonly ok: false; readonly message: string };

/** Ни одно из этих сообщений не содержит английского текста исключения. */
export const EMPTY_BODY_MESSAGE =
	"Сервер вернул пустой ответ. Данные не потеряны — повторите запрос.";
export const MALFORMED_BODY_MESSAGE =
	"Ответ сервера не удалось разобрать. Данные не потеряны — повторите запрос.";
export const MISSING_DATA_MESSAGE =
	"Сервер ответил без показателей. Данные не потеряны — повторите запрос.";
export const NETWORK_FAILURE_MESSAGE =
	"Сервер аналитики недоступен. Проверьте соединение и повторите запрос.";

function statusMessage(status: number): string {
	if (status === 401 || status === 403) {
		return "Нет доступа к аналитике клиники. Войдите заново или обратитесь к администратору.";
	}
	return `Сервер ответил ${status}. Данные не потеряны — повторите запрос.`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Число или null. Строки и мусор к нулю не приводятся: ноль — это утверждение. */
function nullableNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNamedValuePoints(value: unknown): NamedValuePoint[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				name: typeof row.name === "string" ? row.name : "",
				value: numberOr(row.value, 0),
				fill: typeof row.fill === "string" ? row.fill : "",
			},
		];
	});
}

function toDoctorRows(value: unknown): DoctorProfitabilityRow[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				name: typeof row.name === "string" ? row.name : "",
				revenue: numberOr(row.revenue, 0),
				margin: nullableNumber(row.margin),
				completionRate: nullableNumber(row.completionRate),
			},
		];
	});
}

function toCohortPoints(value: unknown): CohortLtvPoint[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [{ cohort: typeof row.cohort === "string" ? row.cohort : "", "Month 12": numberOr(row["Month 12"], 0) }];
	});
}

/**
 * Разбор ответа дашборда из УЖЕ прочитанного тела.
 *
 * Тело приходит строкой, потому что вызывающий обязан прочитать его один раз
 * через `response.text()`: `response.json()` на пустом теле бросает исключение
 * с английским текстом, и починить это перехватом уже поздно — экран его
 * однажды напечатал целиком.
 *
 * Функция чистая: ни fetch, ни DOM, ни таймеров. Поэтому «пустое тело» —
 * обычный тест-кейс, а не то, что можно проверить только скриншотом.
 */
export function parseDashboardPayload(status: number, rawBody: string): DashboardParseResult {
	const trimmed = rawBody.trim();

	if (trimmed.length === 0) {
		// Пустое тело при любом статусе. Статус важнее: 503 с пустым телом — сбой сервера.
		return { ok: false, message: status >= 400 ? statusMessage(status) : EMPTY_BODY_MESSAGE };
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: status >= 400 ? statusMessage(status) : MALFORMED_BODY_MESSAGE };
	}

	const envelope = asRecord(payload);

	// У сервера уже есть готовое русское сообщение (analytics.ts:280-284).
	// Прежний код его выбрасывал и печатал голый код состояния.
	const serverMessage =
		envelope && typeof envelope.message === "string" && envelope.message.trim().length > 0
			? envelope.message.trim()
			: null;

	if (status >= 400) {
		return { ok: false, message: serverMessage ?? statusMessage(status) };
	}
	if (!envelope) {
		return { ok: false, message: MALFORMED_BODY_MESSAGE };
	}
	if (envelope.success === false) {
		// Раньше этот случай не выставлял ни данных, ни ошибки: экран оставался пустым.
		return { ok: false, message: serverMessage ?? MISSING_DATA_MESSAGE };
	}

	const body = asRecord(envelope.data);
	if (!body) {
		return { ok: false, message: MISSING_DATA_MESSAGE };
	}

	const kpisRow = asRecord(body.kpis);
	const cohortLtvJson = toCohortPoints(body.cohortLtvJson);
	const planFunnelJson = toNamedValuePoints(body.planFunnelJson);
	const chairUtilizationJson = toNamedValuePoints(body.chairUtilizationJson);
	const doctorProfitabilityJson = toDoctorRows(body.doctorProfitabilityJson);

	return {
		ok: true,
		data: {
			kpis: {
				totalPatients: numberOr(kpisRow?.totalPatients, 0),
				totalRevenue: numberOr(kpisRow?.totalRevenue, 0),
				totalAppointments: numberOr(kpisRow?.totalAppointments, 0),
				avgRevenuePerPatient: numberOr(kpisRow?.avgRevenuePerPatient, 0),
			},
			cohortLtvJson,
			planFunnelJson,
			chairUtilizationJson,
			doctorProfitabilityJson,
			// Сервер присылает isEmpty; если поле отсутствует — считаем по факту,
			// чтобы старый ответ не выглядел как заполненный дашборд без данных.
			isEmpty:
				typeof body.isEmpty === "boolean"
					? body.isEmpty
					: cohortLtvJson.length === 0 &&
						planFunnelJson.length === 0 &&
						chairUtilizationJson.length === 0 &&
						doctorProfitabilityJson.length === 0,
		},
	};
}
