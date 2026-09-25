/**
 * DENTE Dental CRM — Analytics Doctor Metrics Types, Constants, and Formatting.
 *
 * Cell formatting and type definitions for «Эффективность врачей» on the analytics dashboard.
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
 * Статических hex здесь быть не может.
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
 */
export function formatRub(value: number): string {
	if (typeof value !== "number" || !Number.isFinite(value)) return UNKNOWN_METRIC_TEXT;
	const sign = value < 0 ? "−" : "";
	const abs = Math.abs(value);
	const short = (divided: number) =>
		divided.toLocaleString("ru-RU", {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		});
	if (abs >= 1_000_000) return `${sign}${short(abs / 1_000_000)} млн ₽`;
	if (abs >= 1_000) return `${sign}${short(abs / 1_000)} тыс. ₽`;
	const kopecks = Math.round(abs * 100) % 100;
	return `${sign}${abs.toLocaleString("ru-RU", {
		minimumFractionDigits: kopecks === 0 ? 0 : 2,
		maximumFractionDigits: kopecks === 0 ? 0 : 2,
	})} ₽`;
}

/** Значение, пригодное для показа как число: не null, не undefined, не NaN/Infinity. */
export function isRealNumber(value: number | null | undefined): value is number {
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
export function formatMarginCell(
	margin: number | null | undefined,
): MetricCell {
	if (!isRealNumber(margin)) {
		return {
			text: UNKNOWN_METRIC_TEXT,
			tone: "neutral",
			title: UNKNOWN_MARGIN_TITLE,
		};
	}
	if (margin > 0) return { text: `+${formatRub(margin)}`, tone: "positive" };
	if (margin < 0) return { text: formatRub(margin), tone: "negative" };
	return { text: formatRub(0), tone: "neutral" };
}

/**
 * Ячейка «Успешность». Значение — процентные пункты (85 означает 85 %).
 */
export function formatCompletionRate(
	rate: number | null | undefined,
): MetricCell {
	if (!isRealNumber(rate)) {
		return {
			text: UNKNOWN_METRIC_TEXT,
			tone: "neutral",
			title: UNKNOWN_COMPLETION_TITLE,
		};
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

export function formatHours(hours: number | null | undefined): string {
	if (!isRealNumber(hours)) return UNKNOWN_METRIC_TEXT;
	return `${hours.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ч`;
}

export function formatPercent(percent: number | null | undefined): string {
	if (!isRealNumber(percent)) return UNKNOWN_METRIC_TEXT;
	return `${Math.round(percent)} %`;
}

/* ------------------------------------------------------------------ */
/*  Domain Types & Interfaces                                         */
/* ------------------------------------------------------------------ */

export interface AnalyticsKpis {
	readonly totalPatients: number;
	readonly totalRevenue: number;
	readonly totalAppointments: number;
	readonly avgRevenuePerPatient: number;
	readonly cashRevenue?: number;
	readonly cardRevenue?: number;
	readonly cashlessRevenue?: number;
	readonly advanceRevenue?: number;
	readonly sbpRevenue?: number;
	readonly bankTransferRevenue?: number;
	readonly insuranceRevenue?: number;
	readonly bonusRevenue?: number;
	readonly averageCheck?: number;
	readonly primaryPatientsCount?: number;
	readonly repeatPatientsCount?: number;
	readonly chairOccupancyRatePercent?: number;
}

/**
 * Строка врача: выручка, приёмы, средний чек, отработанные часы и доход в час.
 * `margin` и `completionRate` объявлены `number | null` — ровно то, что отдаёт сервер.
 */
export interface DoctorProfitabilityRow {
	readonly doctorId?: string | null;
	readonly name: string;
	readonly revenue: number;
	readonly appointmentsCount?: number;
	readonly avgTicketRub?: number;
	readonly workedHours?: number;
	readonly hourlyRevenueRub?: number;
	readonly margin: number | null;
	readonly completionRate: number | null;
	readonly services804nCount?: number;
	readonly labOrdersCount?: number;
	readonly labOrdersCostRub?: number;
	readonly doctorPayrollRub?: number;
	readonly clinicMarginRub?: number | null;
}

/**
 * Точка загрузки кресла: процент занятости от фонда времени смены и минуты.
 */
export interface ChairUtilizationPoint {
	readonly chairId?: string | null;
	readonly name: string;
	readonly value: number;
	readonly occupiedMinutes?: number;
	readonly availableMinutes?: number;
	readonly utilizationPercent?: number;
	readonly fill: string;
}

/**
 * Уровень плана лечения (3-Tier Treatment Plan Acceptance).
 */
export interface TierAcceptanceItem {
	readonly tier: "basic" | "optimum" | "premium" | string;
	readonly label: string;
	readonly totalPlans: number;
	readonly acceptedPlans: number;
	readonly acceptanceRatePercent: number;
	readonly totalRub: number;
}

export interface TierAcceptanceData {
	readonly totalConsultations: number;
	readonly consultationToPlanConversionPercent: number;
	readonly totalPlansCount: number;
	readonly acceptedPlansCount: number;
	readonly overallAcceptancePercent: number;
	readonly tiers: readonly TierAcceptanceItem[];
}

/**
 * Ячейка тепловой карты отмен и неявок по дням недели и часам.
 */
export interface NoShowHeatmapCell {
	readonly dayOfWeek: number;
	readonly dayName: string;
	readonly hour: number;
	readonly cancelledCount: number;
	readonly noShowCount: number;
	readonly totalLost: number;
}

export interface NoShowHeatmapData {
	readonly totalCancelled: number;
	readonly totalNoShow: number;
	readonly peakDay: string | null;
	readonly peakHour: number | null;
	readonly cells: readonly NoShowHeatmapCell[];
}

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
	readonly chairUtilizationJson: readonly ChairUtilizationPoint[];
	readonly doctorProfitabilityJson: readonly DoctorProfitabilityRow[];
	readonly tierAcceptance?: TierAcceptanceData | undefined;
	readonly noShowHeatmap?: NoShowHeatmapData | undefined;
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
