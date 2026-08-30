import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

/**
 * Общая загрузка данных для виджетов раздела «Аналитика» и безопасный разбор
 * полей ответа.
 *
 * ЧТО БЫЛО СЛОМАНО. Все три виджета папки повторяли одну и ту же цепочку
 * `fetch(...).then((res) => res.json())` без проверки `res.ok`. Последствия:
 *
 * 1. Ответ 401 или 500 отдаёт тело `{"message":"…"}` — это корректный JSON, он
 *    разбирался без ошибки, `Array.isArray` давал false, список оставался
 *    пустым, и виджет писал «Правила повторной записи пусты». То есть провал
 *    запроса показывался пользователю как достоверное «данных нет».
 * 2. Пустое тело (например 204 или обрыв соединения) роняет `res.json()`
 *    исключением с английским текстом; его глотал `catch`, и получалось то же
 *    ложное «пусто».
 * 3. Поля элементов брались без проверки: `rule.creditedRole.toUpperCase()`
 *    на строке без роли бросало TypeError уже во время отрисовки, а это ронял
 *    весь раздел «Аналитика» в заглушку «Раздел временно не открылся».
 *
 * ПРАВИЛО. Тело читается один раз строкой, разбирается чистой функцией, и
 * каждый элемент списка проходит через нормализацию вызывающего виджета. После
 * неё в разметке не остаётся ни одного обращения к полю, которого может не
 * быть. Состояния ровно три: загрузка, ошибка, пусто — и они не подменяют друг
 * друга.
 */

import { logger } from "../../utils/logger";
import { staffRoleLabels } from "../../workspaceUiLabels";

/**
 * Единый текст ошибки для виджетов. Причину (401, 500, обрыв сети) пользователь
 * исправить не может, а вот обновить страницу — может.
 */
export const WIDGET_LOAD_ERROR_MESSAGE =
	"Не удалось загрузить, обновите страницу";

/** Состояние виджета. Ровно одно из трёх, без промежуточных комбинаций. */
export type WidgetListState<T> =
	| { readonly status: "loading" }
	| { readonly status: "error"; readonly message: string }
	| { readonly status: "ready"; readonly items: readonly T[] };

export type WidgetListResult<T> =
	| { readonly ok: true; readonly items: T[] }
	| { readonly ok: false; readonly message: string };

/** Запись-объект или null. Массив записью не считается. */
function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/**
 * Разбор ответа списочного эндпоинта из УЖЕ прочитанного тела.
 *
 * Чистая функция: ни fetch, ни DOM. Поэтому «401 с телом-объектом» и «пустое
 * тело» — обычные тест-кейсы, а не то, что проверяется вручную по экрану.
 */
export function parseWidgetListPayload<T>(
	status: number,
	rawBody: string,
	toItem: (row: Record<string, unknown>) => T,
): WidgetListResult<T> {
	if (status < 200 || status >= 300) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		// Пустое тело на успешном статусе — не пустой список, а испорченный ответ.
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	// Некоторые эндпоинты отдают список внутри конверта {success,data}.
	const envelope = asRecord(payload);
	const list = Array.isArray(payload)
		? payload
		: envelope && Array.isArray(envelope.data)
			? (envelope.data as unknown[])
			: null;
	if (!list) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	// Элементы, не являющиеся объектами, отбрасываются здесь: иначе они дошли бы
	// до разметки и уронили её на первом же обращении к полю.
	return {
		ok: true,
		items: list.flatMap((row) =>
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			asRecord(row) ? [toItem(asRecord(row)!)] : [],
		),
	};
}

/**
 * Загрузка списка. Возвращает готовое состояние виджета — сам виджет о статусах
 * ответа и разборе тела больше ничего не знает.
 */
export async function fetchWidgetList<T>(
	url: string,
	headers: Record<string, string>,
	toItem: (row: Record<string, unknown>) => T,
	signal?: AbortSignal,
): Promise<WidgetListResult<T>> {
	try {
		// `signal` подставляется только когда он есть: при exactOptionalPropertyTypes
		// поле `signal: undefined` в RequestInit не проходит проверку типов.
		const response = await fetch(
			url,
			signal ? { headers, signal } : { headers },
		);
		const raw = await response.text();
		return parseWidgetListPayload(response.status, raw, toItem);
	} catch (error) {
		// Текст исключения наружу не идёт ни при каких условиях: он английский.
		logger.error(`[analytics widget fetch error] ${url}:`, error);
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
}

/* ------------------------------------------------------------------ */
/*  Безопасное чтение полей элемента                                   */
/* ------------------------------------------------------------------ */

/** Непустая строка или заранее заданная подпись. Никогда не undefined. */
export function textOr(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: fallback;
}

/** Число или null. Строки и мусор к нулю не приводятся: ноль — это утверждение. */
export function numberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** Прочерк (U+2014) там, где числа нет. Не «0» и не пустая ячейка. */
export const UNKNOWN_VALUE_TEXT = "—";

/**
 * Название роли по-русски.
 *
 * Источник названий один — `staffRoleLabels` из workspaceUiLabels.ts, вторая
 * карта названий ролей в проекте не заводится. Здесь только приведение ключа:
 * данные приходят в верхнем регистре (`DOCTOR`), а сокращение `ADMIN` в карте
 * отсутствует, потому что штатная роль называется `administrator`.
 *
 * Незнакомое непустое значение возвращается как есть: придумывать ему роль
 * нельзя, а прятать — значит скрыть от пользователя то, что записано в базе.
 */
const ROLE_KEY_ALIASES: Record<string, keyof typeof staffRoleLabels> = {
	admin: "administrator",
	administrator: "administrator",
	doctor: "doctor",
	assistant: "assistant",
	owner: "owner",
	manager: "manager",
};

export function roleLabel(
	value: unknown,
	fallback = "роль не указана",
): string {
	const raw = typeof value === "string" ? value.trim() : "";
	if (raw.length === 0) return fallback;
	const key = ROLE_KEY_ALIASES[raw.toLowerCase()];
	return key ? staffRoleLabels[key] : raw;
}

/* ------------------------------------------------------------------ */
/*  Финансовые расчеты и утилизация кресел (Chair-Hour Rate)          */
/* ------------------------------------------------------------------ */

export interface ChairHourMetrics {
	readonly chairId: string | null;
	readonly chairName: string;
	readonly occupiedMinutes: number;
	readonly availableMinutes: number;
	readonly utilizationRatePercent: number;
	readonly revenueKopecks: number;
	readonly revenuePerHourKopecks: number;
	readonly capacityYieldPerHourKopecks: number;
}

/**
 * Расчет коэффициента утилизации кресла в процентах (0–100%).
 */
export function calculateChairUtilizationPercent(
	occupiedMinutes: number,
	availableMinutes: number,
): number {
	if (
		!Number.isFinite(occupiedMinutes) ||
		!Number.isFinite(availableMinutes) ||
		availableMinutes <= 0
	) {
		return 0;
	}
	const safeOccupied = Math.max(0, occupiedMinutes);
	const rate = (safeOccupied / availableMinutes) * 100;
	return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
}

/**
 * Выручка на фактически отработанный кресло-час в целых копейках.
 */
export function calculateHourlyRevenueKopecks(
	revenueKopecks: number,
	occupiedMinutes: number,
): number {
	if (
		!Number.isFinite(revenueKopecks) ||
		revenueKopecks <= 0 ||
		!Number.isFinite(occupiedMinutes) ||
		occupiedMinutes <= 0
	) {
		return 0;
	}
	const hours = occupiedMinutes / 60;
	return Math.round(revenueKopecks / hours);
}

/**
 * Выручка на доступный кресло-час (Capacity Yield) в целых копейках.
 */
export function calculateCapacityYieldKopecks(
	revenueKopecks: number,
	availableMinutes: number,
): number {
	if (
		!Number.isFinite(revenueKopecks) ||
		revenueKopecks <= 0 ||
		!Number.isFinite(availableMinutes) ||
		availableMinutes <= 0
	) {
		return 0;
	}
	const hours = availableMinutes / 60;
	return Math.round(revenueKopecks / hours);
}

/**
 * Форматирование суммы в копейках в стандартный рублёвый вид.
 * 14500000 коп. -> "145 000,00 ₽" (или "145 000 ₽" при includeKopecks=false)
 */
export function formatKopecksToRub(
	kopecks: number,
	includeKopecks = true,
): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return includeKopecks ? "0,00 ₽" : "0 ₽";
	}
	const isNegative = kopecks < 0;
	const absKopecks = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(absKopecks / 100);
	const remainderKopecks = absKopecks % 100;
	const formattedRubles = rubles
		.toLocaleString("ru-RU")
		.replace(/\u00A0/g, " ");

	if (includeKopecks) {
		const kopStr = remainderKopecks.toString().padStart(2, "0");
		return `${isNegative ? "-" : ""}${formattedRubles},${kopStr} ₽`;
	}
	return `${isNegative ? "-" : ""}${formattedRubles} ₽`;
}

/**
 * Форматирование часовой ставки выручки на кресло: "4 250 ₽/час".
 */
export function formatKopecksPerHour(kopecksPerHour: number): string {
	return `${formatKopecksToRub(kopecksPerHour, false)}/час`;
}

/* ------------------------------------------------------------------ */
/*  Когортный анализ возвращаемости (Recall 6 / 12 мес)               */
/* ------------------------------------------------------------------ */

export type CohortTreatmentCategory =
	| "sanitation"
	| "implantation"
	| "general_therapy";

export interface RecallCohortData {
	readonly cohortKey: string;
	readonly cohortLabel: string;
	readonly category: CohortTreatmentCategory;
	readonly categoryLabel: string;
	readonly totalPatients: number;
	readonly returned6m: number;
	readonly rate6m: number;
	readonly returned12m: number;
	readonly rate12m: number;
	readonly recallRevenueKopecks: number;
	readonly healthTone: "ok" | "warn" | "bad";
}

/**
 * Расчет процента возврата пациентов через 6 и 12 месяцев с определением статуса.
 */
export function calculateRecallRates(
	totalPatients: number,
	returned6m: number,
	returned12m: number,
): { rate6m: number; rate12m: number; healthTone: "ok" | "warn" | "bad" } {
	if (!Number.isFinite(totalPatients) || totalPatients <= 0) {
		return { rate6m: 0, rate12m: 0, healthTone: "bad" };
	}
	const safe6m = Math.max(
		0,
		Math.min(totalPatients, Number.isFinite(returned6m) ? returned6m : 0),
	);
	const safe12m = Math.max(
		0,
		Math.min(totalPatients, Number.isFinite(returned12m) ? returned12m : 0),
	);

	const rate6m = Math.round((safe6m / totalPatients) * 1000) / 10;
	const rate12m = Math.round((safe12m / totalPatients) * 1000) / 10;

	// Для стоматологии: возвращаемость >= 65% - норма (ok), 45-64% - требует внимания (warn), < 45% - критично (bad)
	const healthTone: "ok" | "warn" | "bad" =
		rate6m >= 65 || rate12m >= 65
			? "ok"
			: rate6m >= 45 || rate12m >= 45
				? "warn"
				: "bad";

	return { rate6m, rate12m, healthTone };
}

/* ------------------------------------------------------------------ */
/*  Зона риска оттока и 1-кликовые предложения                        */
/* ------------------------------------------------------------------ */

export type ChurnRiskBand = "due_6m" | "overdue_12m" | "critical_24m";

export interface ChurnRiskProfile {
	readonly band: ChurnRiskBand;
	readonly bandLabel: string;
	readonly badgeTone: "ok" | "warn" | "bad";
	readonly recommendedService: string;
}

export function classifyChurnRisk(
	daysSinceLastVisit: number,
	category: CohortTreatmentCategory = "sanitation",
): ChurnRiskProfile {
	const days = Number.isFinite(daysSinceLastVisit)
		? Math.max(0, daysSinceLastVisit)
		: 0;

	if (days >= 730) {
		return {
			band: "critical_24m",
			bandLabel: "Критический отток (>2 лет)",
			badgeTone: "bad",
			recommendedService:
				"Комплексный перезапуск лечения и профосмотр главврача",
		};
	}
	if (days >= 365) {
		return {
			band: "overdue_12m",
			bandLabel: "Пропущен осмотр (12+ мес)",
			badgeTone: "warn",
			recommendedService:
				category === "implantation"
					? "КТ-контроль остеоинтеграции имплантов + осмотр хирурга"
					: "Годовой профосмотр + диагностика скрытого кариеса",
		};
	}
	return {
		band: "due_6m",
		bandLabel: "Срок профгигиены (6+ мес)",
		badgeTone: "ok",
		recommendedService:
			category === "implantation"
				? "Профгигиена имплантов (Air-Flow глицин) + полировка"
				: "Профессиональная гигиена Air-Flow + реминерализация",
	};
}

/**
 * Склонение ФИО врача в родительный падеж для естественной медицинской речи:
 * «у д-ра Смирнова А.П.», «у д-ра Ковалёвой А.И.»
 */
export function formatDoctorGenitive(doctorName?: string): string {
	if (!doctorName) return "";
	const trimmed = doctorName.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/\s+/).filter(Boolean);
	const surname = parts[0] || "";
	if (!surname) return "";
	const rest = parts.slice(1).join(" ");

	let genitiveSurname = surname;
	// Фамилии на -ов, -ев, -ёв, -ин, -ын (мужские)
	if (/^[А-ЯЁ][а-яё]+(ов|ев|ёв|ин|ын)$/i.test(surname)) {
		genitiveSurname = `${surname}а`;
	} else if (/^[А-ЯЁ][а-яё]+(ова|ева|ёва|ина|ына)$/i.test(surname)) {
		// Женские на -ова, -ева, -ёва, -ина, -ына
		genitiveSurname = `${surname.slice(0, -1)}ой`;
	} else if (/^[А-ЯЁ][а-яё]+(ий|ый|ой)$/i.test(surname)) {
		// Прилагательные мужские: Белый -> Белого, Великий -> Великого
		genitiveSurname = `${surname.slice(0, -2)}ого`;
	} else if (/^[А-ЯЁ][а-яё]+ая$/i.test(surname)) {
		// Прилагательные женские: Белая -> Белой
		genitiveSurname = `${surname.slice(0, -2)}ой`;
	}

	return rest ? `${genitiveSurname} ${rest}` : genitiveSurname;
}

export interface PersonalizedOfferResult {
	readonly title: string;
	readonly messageText: string;
	readonly recommendedService: string;
	readonly urgencyText: string;
	readonly channelSuggestions: readonly ("sms" | "whatsapp" | "phone")[];
}

export function generatePersonalizedOffer(params: {
	patientName: string;
	clinicName?: string;
	daysSinceLastVisit: number;
	category?: CohortTreatmentCategory;
	doctorName?: string;
}): PersonalizedOfferResult {
	const rawName = (params.patientName || "").trim();
	const nameParts = rawName.split(/\s+/).filter(Boolean);
	const firstName =
		nameParts.length >= 2
			? nameParts[1]
			: nameParts[0] || "Уважаемый пациент";
	const patronymic = nameParts.length >= 3 ? ` ${nameParts[2]}` : "";
	const greeting = `${firstName}${patronymic}`.trim();

	const clinic = params.clinicName || "Стоматологическая клиника";
	const category = params.category || "sanitation";
	const days = Number.isFinite(params.daysSinceLastVisit)
		? Math.max(0, params.daysSinceLastVisit)
		: 0;
	const genitiveDoctor = formatDoctorGenitive(params.doctorName);
	const doctor = genitiveDoctor ? ` у д-ра ${genitiveDoctor}` : "";

	const risk = classifyChurnRisk(days, category);

	let messageText = "";
	let title = "";

	if (category === "implantation") {
		if (risk.band === "critical_24m") {
			title = "Приглашение на ревизию имплантов и КТ-контроль";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло более двух лет с момента установки имплантов/протезирования. Для сохранения гарантии и здоровья десен приглашаем вас на контрольный 3D-снимок и осмотр хирурга${doctor}. Записаться на удобное время можно по телефону клиники.`;
		} else if (risk.band === "overdue_12m") {
			title = "Годовой контроль остеоинтеграции имплантов";
			messageText = `${greeting}, добрый день! ${clinic}: прошёл 1 год с момента имплантации/протезирования. Напоминаем о важности ежегодного контрольного осмотра для сохранения гарантии. Рекомендуем пройти осмотр${doctor} и сделать контрольный снимок. Ждём вас!`;
		} else {
			title = "Плановая гигиена в области имплантов";
			messageText = `${greeting}, здравствуйте! ${clinic}: подошёл 6-месячный срок специализированной гигиены в зоне имплантов (Air-Flow мягким порошком). Процедура защищает от воспаления тканей. Записаться можно по телефону клиники.`;
		}
	} else if (category === "sanitation") {
		if (risk.band === "critical_24m") {
			title = "Приглашение на повторную диагностику после санации";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло более двух лет после завершения санации полости рта. Приглашаем вас на комплексный бесплатный осмотр${doctor} и оценку состояния пломб. Записаться можно по телефону клиники.`;
		} else if (risk.band === "overdue_12m") {
			title = "Годовой профилактический осмотр";
			messageText = `${greeting}, добрый день! ${clinic}: прошло больше года с вашего последнего визита. Напоминаем о необходимости планового профосмотра${doctor} для сохранения гарантии на выполненное лечение. Ждём вас!`;
		} else {
			title = "Плановая профгигиена через 6 месяцев";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло 6 месяцев после завершения лечения — самое время для плановой профгигиены Air-Flow и осмотра терапевта${doctor}. Записаться можно по телефону клиники.`;
		}
	} else {
		title = "Плановый профилактический осмотр";
		messageText = `${greeting}, здравствуйте! ${clinic}: прошло более полугода с последнего визита. Приглашаем на плановый осмотр к вашему лечащему врачу${doctor}. Будем рады вас видеть!`;
	}

	// Защита от сдвоенных точек («д-ра Смирнова А.П..» -> «д-ра Смирнова А.П.»)
	const cleanMessageText = messageText
		.replace(/\.{2,}/g, ".")
		.replace(/\.\s*\./g, ".");

	return {
		title,
		messageText: cleanMessageText,
		recommendedService: risk.recommendedService,
		urgencyText: risk.bandLabel,
		channelSuggestions: ["whatsapp", "sms", "phone"],
	};
}
