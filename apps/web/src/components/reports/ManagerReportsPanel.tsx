import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
/**
 * Отчёты руководителю: выручка, врачи, кресла, потери, дебиторка.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПАНЕЛЬ. Существующий экран аналитики показывает воронку по
 * статусам, доли кресел и когорты. Того, по чему владелец клиники принимает
 * решения, там не было: динамики выручки, доли неявок, дебиторки и того, что
 * именно продаётся. Всё это теперь считает /api/reports/*.
 *
 * ЧЕТЫРЕ ЗАПРОСА, А НЕ ОДИН, И ЧТО ЭТО ЗАКРЫЛО. Маршрутов отчётов управляющего
 * девять. Панель звала ОДИН — сводку, и три разреза из девяти не доходили до
 * владельца никак, хотя считались верно: что продаётся (`/api/reports/services`),
 * загрузка по дням недели и часам (`/api/reports/schedule-load`) и ИМЕНА
 * должников со сроком долга (`/api/reports/receivables`; сводка отдаёт только
 * итог и число должников, то есть цифру, по которой нельзя позвонить). Ещё один
 * разрез — поток пациентов по месяцам — приходил в сводке и НЕ РИСОВАЛСЯ: от
 * него на экране была одна плитка «первичные / повторные» за весь период.
 * Разбор каждого решения стоит рядом со своим блоком ниже.
 *
 * ЧТО ЗДЕСЬ ПРИНЦИПИАЛЬНО
 *
 * 1. Рядом с процентом занятости печатается база расчёта. «Загрузка 42 %» без
 *    указания, от чего считали, — не показатель, а повод для неверного решения.
 *
 * 2. Прочерк вместо выдуманного числа. Маржа не считается, потому что
 *    себестоимости материалов и процента врача в базе нет; здесь стоит «—», а
 *    не правдоподобные 35 %.
 *
 * 3. Пустой период подписан словами. Нули, выданные за данные, читают как
 *    «клиника ничего не заработала».
 *
 * Диаграммы нарисованы полосками на CSS: сторонняя библиотека графиков здесь
 * ничего не добавляет, а её оформление ведут в другом месте.
 *
 * ОФОРМЛЕНИЕ. Всё на переменных темы через styles/dente-operations.css — в
 * первой версии панель рисовалась голыми <table> и <ul> с оформлением в
 * атрибуте style и зашитым цветом полосы, который ломался в тёмной теме.
 * Цифры моноширинные: суммы в колонке стоят разряд под разрядом.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money, operatorReadableErrorDetail } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { type ClinicMode, hasCapability } from "../../lib/clinicCapabilities";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { DoctorPayoutDashboard } from "../../pages/DoctorPayoutDashboard.js";
import { logger } from "../../utils/logger";

type RevenuePoint = {
	bucket: string;
	revenueRub: number;
	paymentCount: number;
	payingPatients: number;
};

type DoctorRow = {
	doctorUserId: string | null;
	doctorName: string;
	revenueRub: number;
	appointmentsTotal: number;
	appointmentsCompleted: number;
	appointmentsCancelled: number;
	appointmentsNoShow: number;
	completionRate: number | null;
	noShowRate: number | null;
	averageTicketRub: number | null;
	marginRub: null;
};

type ChairRow = {
	chairId: string | null;
	chairName: string;
	appointments: number;
	bookedMinutes: number;
	utilization: number | null;
};

export type ReportsSummary = {
	period: { from: string; to: string };
	revenue: {
		granularity: string;
		points: RevenuePoint[];
		totalRub: number;
		isEmpty: boolean;
	};
	doctors: {
		rows: DoctorRow[];
		unattributedRevenueRub: number;
		attributionNote: string;
		isEmpty: boolean;
	};
	chairs: {
		rows: ChairRow[];
		basis: {
			workingDays: number;
			minutesPerDay: number;
			totalMinutesPerChair: number;
			note: string;
		};
		isEmpty: boolean;
	};
	appointments: {
		byStatus: Record<string, number>;
		total: number;
		arrivalRate: number | null;
		completionRate: number | null;
		cancellationRate: number | null;
		noShowRate: number | null;
		lostAppointments: number;
		isEmpty: boolean;
	};
	reminderEffect: {
		reminded: ReminderGroup;
		notReminded: ReminderGroup;
		lostRateDifference: number | null;
		caveat: string;
		smallestGroupSize: number;
		enoughData: boolean;
		isEmpty: boolean;
	};
	patientFlow: {
		points: {
			bucket: string;
			newPatients: number;
			returningPatients: number;
		}[];
		newTotal: number;
		returningTotal: number;
	};
	receivables: {
		totalDebtRub: number;
		byBucket: Record<string, number>;
		debtors: number;
		/*
		 * Переплаты приходят из /api/reports/summary с 2026-07-28. Поля
		 * необязательные: старый ответ сервера (клиника обновляет веб раньше API)
		 * их не содержит, и блок переплат тогда просто не выводится — вместо
		 * «клиника должна вернуть undefined ₽».
		 */
		totalPrepaidRub?: number;
		prepayments?: {
			patientId: string;
			patientName: string;
			prepaidRub: number;
		}[];
	};
	isEmpty: boolean;
};

/** Группа приёмов в сравнении «дошло напоминание или нет». */
type ReminderGroup = {
	appointments: number;
	completed: number;
	cancelled: number;
	noShow: number;
	lost: number;
	lostRate: number | null;
};

const bucketLabels: Record<string, string> = {
	current: "до недели",
	up_to_30: "до 30 дней",
	up_to_90: "до 90 дней",
	over_90: "больше 90 дней",
	undated: "дата не определена",
};

/**
 * Подписи статусов записи из summary.appointments.byStatus.
 * Ключи — как в БД (appointments.status); неизвестный статус печатаем как есть,
 * чтобы новый код на сервере не превратился в пустую строку на экране.
 */
const appointmentStatusLabels: Record<string, string> = {
	scheduled: "Назначен",
	confirmed: "Подтверждён",
	arrived: "Пришёл",
	in_treatment: "На приёме",
	completed: "Завершён",
	cancelled: "Отменён",
	no_show: "Неявка",
	rescheduled: "Перенесён",
	waiting: "Ожидает",
};

const weekdayNames = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/*
 * Денежных форматов в проекте два, и оба общие: короткий `shortRub`
 * («1,4 тыс. ₽», pages/analyticsDoctorMetrics.ts) — для плиток и полос, где
 * длинное число не читается и ломает вёрстку, и полный `money` («1 500,50 ₽»,
 * AppHelpers.tsx) — для таблиц и итоговых приписок, где нужна точная сумма.
 *
 * БЫЛО: здесь стоял третий, местный формат `${value.toLocaleString("ru-RU")} ₽`
 * без ограничения дробной части. Суммы приходят с копейками, поэтому средний чек
 * 3416.666666666667 печатался в таблице как «3 416,666666666667 ₽», а те же
 * деньги на экране аналитики выглядели иначе — два формата в одном продукте.
 */

function formatPercent(value: number | null): string {
	// Прочерк, а не «0 %»: отсутствие данных и ноль — разные утверждения.
	return value === null ? "—" : `${Math.round(value * 100)} %`;
}

function formatHours(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

async function readJson<T>(response: Response): Promise<T> {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const payload = (await response.json().catch((err: any) => {
		logger.error(err);
		showToast(
			actionFailureToast(
				"Ошибка чтения ответа",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

/** Начало и конец месяца в виде YYYY-MM-DD для полей ввода. */
function monthBounds(now = new Date()): { from: string; to: string } {
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	return { from: iso(first), to: iso(last) };
}

/**
 * ЗАПРОС СВОДКИ. КАЛЕНДАРНАЯ ДАТА УХОДИТ НА СЕРВЕР КАК ЕСТЬ.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь границы превращались в мгновение: к календарной дате
 * приклеивалось `T00:00:00` для начала и `T23:59:59` для конца, полученная строка
 * скармливалась конструктору `Date`, и с него снималась строка ISO. Запись вида
 * `2026-07-01T00:00:00` БЕЗ смещения разбирается в поясе БРАУЗЕРА, а не клиники.
 * То есть календарную дату превращал в мгновение тот, кто пояс клиники не знает.
 *
 * Прежний вызов здесь НЕ ПРОЦИТИРОВАН дословно намеренно: страж
 * `tests/periodBoundsGoToServerAsCalendarDate.test.ts` ищет это превращение по
 * всему файлу, включая пояснения, и на цитате прежнего кода он справедливо
 * падает. Тот же приём уже применён в `pages/DoctorPayoutDashboard.tsx` из-за
 * стража оформления.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Владелец сети смотрит из Москвы (+3) камчатский
 * филиал (+12) и выбирает «июль». Измерено: браузер в Москве посылал
 * `2026-06-30T21:00:00.000Z`, браузер на Камчатке — `2026-06-30T12:00:00.000Z`,
 * разница девять часов на одном и том же выборе. Для камчатской клиники
 * московская граница — 1 июля 09:00 по её часам: месячный отчёт терял кассу
 * первой смены месяца и захватывал девять часов 1 августа. Отчёт при этом
 * выглядит правдоподобным, поэтому расхождение с кассой ищут в кассе.
 *
 * КАК ТЕПЕРЬ. Уходит ровно то, что показывает поле `<input type="date">` —
 * `YYYY-MM-DD`. Календарную дату в мгновение превращает СЕРВЕР, который читает
 * `clinics.timezone` (`apps/api/src/routes/reports.ts`, `resolvePeriodBoundary`);
 * `to` разрешается концом суток включительно. Полный ISO со смещением маршрут
 * по-прежнему принимает — его посылают тесты и другие клиенты.
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНАЯ ФУНКЦИЯ, А НЕ ТЕЛО `load`. Внутри компонента путь, которым
 * ходит клиент, проверить нечем: в этом дереве нет ни jsdom, ни happy-dom, тесты
 * веба гоняются через `node --test` и рисуют компоненты `renderToStaticMarkup`, а
 * он эффекты не исполняет — значит `fetch` из `useEffect` не случится и
 * перехватывать будет нечего. Отдельная функция позволяет проверке подменить
 * `globalThis.fetch` и прочитать АДРЕС, который уходит на сервер, а не состояние
 * компонента. Зелёный тест на состоянии в этом дереве трижды не доказывал работу
 * пути, которым ходит клиент.
 */
export async function fetchReportsSummary(
	period: CalendarPeriod & { readonly granularity: "day" | "week" | "month" },
	headers: Record<string, string>,
): Promise<ReportsSummary> {
	const query = new URLSearchParams({
		from: period.from,
		to: period.to,
		granularity: period.granularity,
	});
	const response = await fetch(`/api/reports/summary?${query.toString()}`, {
		headers,
	});
	return readJson<ReportsSummary>(response);
}

/**
 * ТРИ ОТЧЁТА, КОТОРЫЕ СЧИТАЛИСЬ, НО НЕ ДОХОДИЛИ ДО ВЛАДЕЛЬЦА.
 *
 * Маршрутов отчётов управляющего девять. Шесть из них сводка отдаёт целиком, и
 * панель их рисует: выручку, врачей, кресла, приёмы, эффект напоминаний, поток
 * пациентов. Оставшиеся ТРИ разреза до экрана не доходили никак:
 *
 *  1. `/api/reports/services` — что именно продаётся. В сводке этого нет вовсе.
 *     Владелец видел «получено 67 400 ₽» и не мог узнать, на чём.
 *  2. `/api/reports/schedule-load` — загрузка по дням недели и часам. В сводке
 *     нет вовсе. Именно по ней решают, когда открывать смены и куда ставить
 *     дополнительное кресло.
 *  3. `/api/reports/receivables` — ИМЕНА должников и срок долга. Сводка отдаёт
 *     только итог и число должников: «долг 53 000 ₽, 2 пациент(ов)». Кому
 *     звонить — не сказано, а без имени и срока дебиторка не работа, а цифра.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМИ ЗАПРОСАМИ, А НЕ ПОЛЯМИ СВОДКИ. Сводка — это сознательно
 * один поход за главными числами (её пояснение в routes/reports.ts). Три разреза
 * ниже к главным числам не относятся: два принимают свои параметры (`limit` у
 * услуг, `minDebtRub` у дебиторки), а дебиторка вообще НЕ ИМЕЕТ периода — долг
 * существует на дату отчёта, а не «за март». Дописать их в сводку значило бы
 * либо потерять эти параметры, либо привязать долг к периоду, которого у него
 * нет. Сервер здесь не меняется ни строкой: маршруты давно готовы.
 *
 * ОТКАЗ КАЖДОГО РАЗРЕЗА ОТДЕЛЬНЫЙ, И ЭТО ГЛАВНОЕ СВОЙСТВО. Один упавший запрос
 * не гасит остальные три и не гасит сводку: иначе достижимость, которую эта
 * правка добавляет, отбиралась бы обратно первым же отказом сервера.
 */
export type CalendarPeriod = {
	readonly from: string;
	readonly to: string;
};

/** Ответ `/api/reports/services`. Суммы НАЗНАЧЕННЫЕ, а не полученные. */
export type ServiceSalesReport = {
	rows: {
		title: string;
		quantity: number;
		plannedRub: number;
		averagePriceRub: number;
		discountRub: number;
	}[];
	plannedTotalRub: number;
	discountTotalRub: number;
	note: string;
	isEmpty: boolean;
};

/** Ответ `/api/reports/receivables`: то же, что в сводке, плюс сами должники. */
export type ReceivablesDetail = {
	rows: {
		patientId: string;
		patientName: string;
		debtRub: number;
		/** Самая ранняя неоплаченная позиция. null — датировать нечем. */
		oldestChargeAt: string | null;
		bucket: string;
	}[];
	totalDebtRub: number;
	byBucket: Record<string, number>;
	prepayments: { patientId: string; patientName: string; prepaidRub: number }[];
	totalPrepaidRub: number;
	note: string;
	isEmpty: boolean;
};

/** Ответ `/api/reports/schedule-load`. `weekday` — ISO: 1 понедельник, 7 воскресенье. */
export type ScheduleLoadReport = {
	cells: {
		weekday: number;
		hour: number;
		appointments: number;
		bookedMinutes: number;
	}[];
	busiestWeekday: number | null;
	busiestHour: number | null;
	isEmpty: boolean;
};

/*
 * ЗАПРОСЫ ТРЁХ РАЗРЕЗОВ. Форма ровно та же, что у сводки, и по тем же причинам:
 * период уходит календарной датой (пояс клиники знает сервер), заголовки
 * приходят аргументом (их собирает `auth.denteClinicalReadHeaders()` в момент
 * запроса), адрес записан литералом в самом вызове.
 *
 * АДРЕС ЛИТЕРАЛОМ — НЕ СТИЛИСТИКА. Недостижимость этих отчётов обнаружила
 * перепись адресов: она ищет упоминание серверного адреса в клиенте. Собери
 * адрес в переменной — и следующая перепись снова назовёт маршрут никем не
 * зовомым, хотя вызов есть.
 *
 * ЗАГОЛОВКИ ОБЯЗАТЕЛЬНЫ. Все три маршрута закрыты той же охраной, что и сводка
 * (`scopeFor` → `requireClinicalReadContext`): без `x-dente-admin-secret`
 * настоящая клиника получает 403, и раздел выглядит пустым, а не сломанным.
 * Именно поэтому проверка `tests/managerReportSlicesReachTheOwner.test.ts`
 * читает не состояние компонента, а то, ЧТО уходит в запрос.
 */

export async function fetchServiceSales(
	period: CalendarPeriod,
	headers: Record<string, string>,
): Promise<ServiceSalesReport> {
	const query = new URLSearchParams({ from: period.from, to: period.to });
	const response = await fetch(`/api/reports/services?${query.toString()}`, {
		headers,
	});
	return readJson<ServiceSalesReport>(response);
}

/**
 * Дебиторка периода НЕ ПРИНИМАЕТ, и это не упущение: долг существует на дату
 * отчёта. Передать сюда `from`/`to` значило бы показать «долг за март».
 */
export async function fetchReceivablesDetail(
	headers: Record<string, string>,
): Promise<ReceivablesDetail> {
	const response = await fetch("/api/reports/receivables", { headers });
	return readJson<ReceivablesDetail>(response);
}

export async function fetchScheduleLoad(
	period: CalendarPeriod,
	headers: Record<string, string>,
): Promise<ScheduleLoadReport> {
	const query = new URLSearchParams({ from: period.from, to: period.to });
	const response = await fetch(
		`/api/reports/schedule-load?${query.toString()}`,
		{ headers },
	);
	return readJson<ScheduleLoadReport>(response);
}

/** Загруженный разрез либо причина, по которой его нет. */
type ReportSlice<T> = {
	readonly data: T | null;
	readonly error: string | null;
};

const pendingSlice = { data: null, error: null };

function sliceOf<T>(result: PromiseSettledResult<T>): ReportSlice<T> {
	if (result.status === "fulfilled") return { data: result.value, error: null };
	return {
		data: null,
		error:
			result.reason instanceof Error
				? result.reason.message
				: String(result.reason),
	};
}

/**
 * ОТКАЗ ПО-РУССКИ: ЧТО НЕ ОТКРЫЛОСЬ, ПОЧЕМУ И ЧТО ДЕЛАТЬ.
 *
 * Причина берётся из ответа сервера, но только если её вообще можно показывать
 * человеку: решает это общий `operatorReadableErrorDetail` из AppHelpers.tsx —
 * он гасит текст без русских букв и текст с техническими словами («Failed to
 * fetch», имя класса ошибки, адрес маршрута). Второго правила «что показывать
 * оператору» здесь не заводится: оно уже есть, и разъехавшихся копий в этом
 * дереве хватает.
 *
 * Третья часть — действие — приписывается ВСЕГДА. Отказ без действия («Сервер
 * ответил 403») это код ответа русскими словами: человек читает и не знает, что
 * нажать. Самая частая причина отказа здесь — истёкший вход в кабинет, и лечится
 * она повторным входом.
 */
export function sliceRefusalText(
	subject: string,
	detail: string | null,
): string {
	const readable = operatorReadableErrorDetail(detail);
	const cause = readable
		? readable.replace(/\s*[.;]\s*$/, "")
		: "сервер отказал без объяснения";
	return (
		`${subject} не построен: ${cause}. Нажмите «Обновить». ` +
		"Если отказ повторяется — войдите в рабочий кабинет клиники заново, этот раздел закрыт входом."
	);
}

export type ManagerReportsPanelProps = {
	/**
	 * Режим клиники. Определяет, какие разрезы уместны: занятость единственного
	 * кресла — всегда одно и то же число, а выработка единственного врача — одна
	 * строка. Не передан — показывается всё (см. lib/clinicCapabilities.ts).
	 */
	readonly clinicMode?: ClinicMode | null;
};

export function ManagerReportsPanel({
	clinicMode = null,
}: ManagerReportsPanelProps = {}) {
	/*
	 * ПОЧЕМУ У ЗАПРОСА СВОДКИ ЕСТЬ ЗАГОЛОВКИ. Раздел был мёртв у заказчика целиком,
	 * и увидеть это на машине разработчика нельзя.
	 *
	 * /api/reports/summary закрыт охраной `apps/api/src/accessGuard.ts`: обработчик
	 * зовёт местную обёртку `scopeFor` (routes/reports.ts:79), а та —
	 * `requireClinicalReadContext`. Без заголовка `x-dente-admin-secret` охрана
	 * отвечает 403 даже при действительных токенах кабинета и сотрудника — проверено
	 * живьём на отдельном экземпляре API с заданным секретом и выключенными
	 * лазейками. Панель звала адрес голым fetch, поэтому вместо выручки, врачей,
	 * кресел, потерь и дебиторки владелец клиники видел одну строку «Отчёт не
	 * построен: Сервер ответил 403».
	 *
	 * Локально этого не видно: в корневом `.env` секрет закомментирован, зато
	 * включены лазейки DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS, и живут они
	 * только пока NODE_ENV !== "production". Ни типы, ни тесты, ни глаза на этой
	 * машине такую поломку не показывают — её ловит `npm run check:guarded-headers`.
	 *
	 * `auth` берётся ТОЛЬКО из useAppLogicContext(): одноимённые функции из
	 * AppHelpers.tsx (около строки 6142) сеансовый секрет НЕ подставляют — с ними код
	 * компилируется, гейт замолкает, а клиника по-прежнему получает 403. Контекстные
	 * подставляют `clinicalAdminSecretSession` (hooks/domains/useAuthLogic.ts:135).
	 */
	const appLogic = useAppLogicContext();
	/*
	 * СЕКРЕТ ЧИТАЕТСЯ ЧЕРЕЗ ref, А НЕ ИЗ ЗАМЫКАНИЯ И НЕ ЧЕРЕЗ ЗАВИСИМОСТЬ. Оба
	 * «прямых» способа здесь ломаются, каждый по-своему:
	 *   — взять `auth` в замыкание `load` нельзя: функция мемоизирована по
	 *     [from, to, granularity], и `auth` застыл бы на том отрисовывании, когда
	 *     секрета в сеансе ещё не было (он появляется после разблокировки раздела) —
	 *     то есть 403 держался бы до перезагрузки страницы;
	 *   — дописать `auth` в зависимости `load` нельзя: useAuthLogic возвращает НОВЫЙ
	 *     объект на каждом отрисовывании (useAppLogic.tsx:2395, без useMemo), поэтому
	 *     `load` менялся бы каждый раз, а `useEffect(..., [load])` ниже отправлял бы
	 *     запрос на каждом отрисовывании — бесконечный поток запросов к серверу.
	 * Ref остаётся одним и тем же объектом, а значение в нём всегда свежее: даже
	 * мемоизированный `load` прочитает секрет, появившийся уже после него.
	 */
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;
	const showDoctorBreakdown = hasCapability(clinicMode, "doctorBreakdown");
	const showChairUtilisation = hasCapability(clinicMode, "chairUtilisation");
	const initial = useMemo(() => monthBounds(), []);
	const [from, setFrom] = useState(initial.from);
	const [to, setTo] = useState(initial.to);
	const [granularity, setGranularity] = useState<"day" | "week" | "month">(
		"day",
	);
	const [summary, setSummary] = useState<ReportsSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [services, setServices] =
		useState<ReportSlice<ServiceSalesReport>>(pendingSlice);
	const [debtors, setDebtors] =
		useState<ReportSlice<ReceivablesDetail>>(pendingSlice);
	const [scheduleLoad, setScheduleLoad] =
		useState<ReportSlice<ScheduleLoadReport>>(pendingSlice);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			/*
			 * Заголовки собираются в момент запроса, а не при создании `load`:
			 * см. пояснение к authRef выше. Проверка на `auth` — не
			 * перестраховка: useAppLogicContext() вне провайдера возвращает
			 * пустой объект (contexts/AppLogicContext.tsx:21), и тогда обращение
			 * к функции уронило бы весь раздел вместо показа отказа.
			 */
			const auth = authRef.current;
			const readHeaders =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};
			/*
			 * `from` и `to` — календарные даты `YYYY-MM-DD` прямо из полей ввода.
			 * Своего превращения в мгновение здесь больше НЕТ: пояс клиники знает
			 * сервер, браузер — нет. Разбор в `fetchReportsSummary` выше.
			 *
			 * ЧЕТЫРЕ ЗАПРОСА ПАРАЛЛЕЛЬНО И `allSettled`, А НЕ `all`. Разрезы
			 * независимы, и падение одного не должно уносить остальные: с `all`
			 * отказ дебиторки погасил бы и выручку, и услуги, и загрузку — то есть
			 * достижимость, которую эта правка добавляет, отбирал бы обратно первый
			 * же 403. Ждать их по очереди тоже нельзя: четыре последовательных
			 * похода к базе складываются в задержку, которую видно глазом.
			 */
			const [summaryResult, servicesResult, debtorsResult, scheduleResult] =
				await Promise.allSettled([
					fetchReportsSummary({ from, to, granularity }, readHeaders),
					fetchServiceSales({ from, to }, readHeaders),
					fetchReceivablesDetail(readHeaders),
					fetchScheduleLoad({ from, to }, readHeaders),
				]);

			if (summaryResult.status === "fulfilled") {
				setSummary(summaryResult.value);
			} else {
				setSummary(null);
				setError(
					summaryResult.reason instanceof Error
						? summaryResult.reason.message
						: String(summaryResult.reason),
				);
			}
			setServices(sliceOf(servicesResult));
			setDebtors(sliceOf(debtorsResult));
			setScheduleLoad(sliceOf(scheduleResult));
		} catch (loadError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(loadError as { status?: number })?.status ?? null,
				),
				"error",
			);
			/*
			 * Сюда попадает только сбой ДО запросов — сборка заголовков:
			 * `localStorage` в приватном режиме браузера бросает исключение
			 * (lib/denteRequestHeaders.ts, известная латентная ошибка). Тогда не ушёл
			 * ни один из четырёх запросов, и все разрезы гасятся одной причиной.
			 */
			setSummary(null);
			setError(
				loadError instanceof Error ? loadError.message : String(loadError),
			);
			setServices(pendingSlice);
			setDebtors(pendingSlice);
			setScheduleLoad(pendingSlice);
		} finally {
			setLoading(false);
		}
	}, [from, to, granularity]);

	useEffect(() => {
		void load();
	}, [load]);

	const maxRevenue = useMemo(
		() =>
			summary?.revenue?.points?.reduce(
				(max, point) => Math.max(max, point.revenueRub),
				0,
			) ?? 0,
		[summary],
	);

	/**
	 * КРАЕВЫЕ СУММЫ СЕТКИ ЗАГРУЗКИ: по дням недели и по часам.
	 *
	 * Сервер отдаёт сетку «день недели × час» — 17 клеток на живых данных этой
	 * установки. Показывать её таблицей 7 × 24 бессмысленно: 168 ячеек, из которых
	 * заполнены единицы, и решение из них не читается. Читаются две краевые суммы:
	 * «в какой день» и «в какой час». Это projection тех же занятых минут, по
	 * которым сервер считает `busiestWeekday` и `busiestHour`, — то есть цифры
	 * панели и вывод сервера сходятся по построению, а не по совпадению.
	 *
	 * Пик у каждой оси СВОЙ. Общий знаменатель на два разных разреза сделал бы
	 * часовые полосы визуально втрое короче дневных при тех же данных: суммы по
	 * семи дням крупнее сумм по двенадцати часам просто потому, что корзин меньше.
	 */
	const scheduleMargins = useMemo(() => {
		const cells = scheduleLoad.data?.cells ?? [];
		const weekdayMinutes = new Map<number, number>();
		const hourMinutes = new Map<number, number>();
		for (const cell of cells) {
			weekdayMinutes.set(
				cell.weekday,
				(weekdayMinutes.get(cell.weekday) ?? 0) + cell.bookedMinutes,
			);
			hourMinutes.set(
				cell.hour,
				(hourMinutes.get(cell.hour) ?? 0) + cell.bookedMinutes,
			);
		}
		// Все семь дней подряд, включая пустые: «в субботу пусто» — это и есть
		// ответ, ради которого отчёт нужен, а пропущенная строка читается как
		// отсутствие данных.
		const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
			key: weekday,
			minutes: weekdayMinutes.get(weekday) ?? 0,
		}));
		// Часы — непрерывным отрезком от первого занятого до последнего. Пустой час
		// ВНУТРИ рабочего дня это настоящий ноль (обед, провал в записи), и прятать
		// его нельзя; сутки целиком показывать незачем — клиника ночью закрыта.
		const busyHours = [...hourMinutes.keys()].sort(
			(left, right) => left - right,
		);
		const byHour: { key: number; minutes: number }[] = [];
		const firstHour = busyHours[0];
		const lastHour = busyHours[busyHours.length - 1];
		if (firstHour !== undefined && lastHour !== undefined) {
			for (let hour = firstHour; hour <= lastHour; hour += 1) {
				byHour.push({ key: hour, minutes: hourMinutes.get(hour) ?? 0 });
			}
		}
		return {
			byWeekday,
			byHour,
			peakWeekdayMinutes: (byWeekday ?? []).reduce(
				(peak, row) => Math.max(peak, row?.minutes ?? 0),
				0,
			),
			peakHourMinutes: (byHour ?? []).reduce(
				(peak, row) => Math.max(peak, row?.minutes ?? 0),
				0,
			),
		};
	}, [scheduleLoad.data]);

	return (
		<section className="panel ops-panel" data-testid="manager-reports-panel">
			<div className="panel-heading">
				<h2>Отчёты руководителю</h2>
			</div>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="report-from">Период с</label>
					<input
						id="report-from"
						type="date"
						value={from}
						onChange={(event) => setFrom(event.target.value)}
					/>
				</span>
				<span className="ops-field">
					<label htmlFor="report-to">по</label>
					<input
						id="report-to"
						type="date"
						value={to}
						onChange={(event) => setTo(event.target.value)}
					/>
				</span>
				<span className="ops-field">
					<label htmlFor="report-granularity">Детализация</label>
					<select
						id="report-granularity"
						value={granularity}
						onChange={(event) =>
							setGranularity(event.target.value as "day" | "week" | "month")
						}
					>
						<option value="day">по дням</option>
						<option value="week">по неделям</option>
						<option value="month">по месяцам</option>
					</select>
				</span>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load()}
					disabled={loading}
				>
					{loading ? "Считаю…" : "Обновить"}
				</button>
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Отчёт не построен: {error}
				</p>
			) : null}

			{/* Скелет держит высоту: без него содержимое прыгает при каждой смене периода. */}
			{loading && summary === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{summary ? (
				summary?.isEmpty ? (
					<p className="ops-empty">
						За выбранный период данных нет: ни платежей, ни приёмов. Это не
						нулевые показатели, а отсутствие записей.
					</p>
				) : (
					<>
						{/* ── Главные числа ─────────────────────────────────────── */}
						<h3 className="ops-section-title">Итоги периода</h3>
						<ul className="ops-metrics">
							<li className="ops-metric ops-metric--primary">
								<span
									className="ops-metric__value"
									title={money(summary?.revenue?.totalRub ?? 0)}
								>
									{shortRub(summary?.revenue?.totalRub ?? 0)}
								</span>
								<span className="ops-metric__label">получено</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{summary?.appointments?.total ?? 0}
								</span>
								<span className="ops-metric__label">приёмов</span>
							</li>
							<li
								className={`ops-metric ${(summary?.appointments?.lostAppointments ?? 0) > 0 ? "ops-metric--danger" : ""}`}
							>
								<span className="ops-metric__value">
									{summary?.appointments?.lostAppointments ?? 0}
								</span>
								{/* Именно этот показатель уменьшают напоминаниями. */}
								<span className="ops-metric__label">
									потеряно: отмены и неявки
								</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{formatPercent(summary?.appointments?.noShowRate ?? null)}
								</span>
								<span className="ops-metric__label">доля неявок</span>
							</li>
							<li
								className={`ops-metric ${(summary?.receivables?.totalDebtRub ?? 0) > 0 ? "ops-metric--danger" : ""}`}
							>
								<span
									className="ops-metric__value"
									title={money(summary?.receivables?.totalDebtRub ?? 0)}
								>
									{shortRub(summary?.receivables?.totalDebtRub ?? 0)}
								</span>
								<span className="ops-metric__label">
									долг, {summary?.receivables?.debtors ?? 0} пациент(ов)
								</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{summary?.patientFlow?.newTotal ?? 0} /{" "}
									{summary?.patientFlow?.returningTotal ?? 0}
								</span>
								{/*
									Подпись называет единицу измерения. Было просто «первичные /
									повторные», и рядом стояла плитка «22 приёмов» — на экране
									получалось «7 / 0» против «22», то есть видимое противоречие.
									На деле это разные вещи: здесь считаются УНИКАЛЬНЫЕ ПАЦИЕНТЫ,
									дошедшие до кресла, а там — все записи любого состояния,
									включая ещё не состоявшиеся и отменённые. Цифра была верной,
									врала подпись.
								*/}
								<span className="ops-metric__label">
									пациентов: первичные / повторные
								</span>
							</li>
						</ul>

						{/* ── Динамика выручки ──────────────────────────────────── */}
						<h3 className="ops-section-title">Выручка</h3>
						{summary?.revenue?.isEmpty || !summary?.revenue?.points ? (
							<p className="ops-empty">Платежей за период не было.</p>
						) : (
							<ul className="ops-bars">
								{(summary?.revenue?.points ?? []).map((point) => (
									<li className="ops-bar" key={point?.bucket ?? Math.random()}>
										<span className="ops-bar__label">
											{point?.bucket ?? ""}
										</span>
										{/*
											Ширина в процентах, а не в пикселях: колонка отчёта на
											планшете и на широком мониторе разной ширины, и полоса в
											240 пикселей на узком экране вылезала за край.
										*/}
										<span
											className="ops-bar__track"
											title={`${point?.paymentCount ?? 0} платеж(ей), ${point?.payingPatients ?? 0} пациент(ов)`}
										>
											<span
												className="ops-bar__fill"
												style={{
													width: `${maxRevenue > 0 ? Math.max(2, Math.round(((point?.revenueRub ?? 0) / maxRevenue) * 100)) : 2}%`,
												}}
											/>
										</span>
										{/* Полоса узкая: короткий вид, точная сумма — в подсказке. */}
										<span
											className="ops-bar__value"
											title={money(point?.revenueRub ?? 0)}
										>
											{shortRub(point?.revenueRub ?? 0)}
										</span>
									</li>
								))}
							</ul>
						)}

						{/* ── Врачи ─────────────────────────────────────────────── */}
						{/*
							У отдельного врача этот разрез — одна строка с его же фамилией.
							Прячем не потому, что пусто, а потому что сравнивать не с кем.
						*/}
						{showDoctorBreakdown ? (
							<>
								<h3 className="ops-section-title">Врачи</h3>
								{summary?.doctors?.isEmpty ? (
									<p className="ops-empty">Выработки за период нет.</p>
								) : (
									<>
										<div className="ops-table-wrap">
											<table className="ops-table">
												<thead>
													<tr>
														<th scope="col">Врач</th>
														<th scope="col">Получено</th>
														<th scope="col">Приёмов</th>
														<th scope="col">Завершено</th>
														<th scope="col">Неявки</th>
														<th scope="col">Средний чек</th>
														<th scope="col">Маржа</th>
													</tr>
												</thead>
												<tbody>
													{(summary?.doctors?.rows ?? []).map((row) => (
														<tr
															key={
																row?.doctorUserId ??
																row?.doctorName ??
																Math.random()
															}
														>
															<td className="ops-strong" data-label="Врач">
																{row?.doctorName ?? "—"}
															</td>
															<td className="ops-num" data-label="Получено">
																{money(row?.revenueRub ?? 0)}
															</td>
															<td className="ops-num" data-label="Приёмов">
																{row?.appointmentsTotal ?? 0}
															</td>
															<td className="ops-num" data-label="Завершено">
																{row?.appointmentsCompleted ?? 0} (
																{formatPercent(row?.completionRate ?? null)})
															</td>
															<td className="ops-num" data-label="Неявки">
																{row?.appointmentsNoShow ?? 0} (
																{formatPercent(row?.noShowRate ?? null)})
															</td>
															<td className="ops-num" data-label="Средний чек">
																{row?.averageTicketRub === null ||
																row?.averageTicketRub === undefined
																	? "—"
																	: money(row.averageTicketRub)}
															</td>
															{/*
													Прочерк осознанный, но теперь он не тупик: расчёт врачебной
													выплаты живёт в блоке «Выплаты врачам» ниже, у него свой
													зарплатный месяц и свои правила округления до копейки.

													ПОДПИСЬ ИСПРАВЛЕНА. Было «Себестоимость материалов и процент
													врача в системе не заданы» — про процент это уже неверно:
													колонка `doctor_commissions.commission_pct` существует, и у
													неё два живых писателя (подпись дневника визита и профиль
													рабочего кабинета). Отсутствуют не поля, а строки, и
													заполняются они в другом месте — подсказка должна вести
													туда, а не утверждать, что возможности нет.
												*/}
															<td
																className="ops-num"
																data-label="Маржа"
																title="Маржа по врачу не считается здесь: смотрите блок «Выплаты врачам» ниже — там касса, ставка врача и удержание за материалы за выбранный зарплатный месяц"
															>
																—
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
										{(summary?.doctors?.unattributedRevenueRub ?? 0) > 0 ? (
											<p className="ops-hint">
												Не отнесено к врачу:{" "}
												{money(summary?.doctors?.unattributedRevenueRub ?? 0)}.{" "}
												{summary?.doctors?.attributionNote}
											</p>
										) : null}
									</>
								)}
							</>
						) : null}

						{/* ── Кресла ────────────────────────────────────────────── */}
						{/*
							При одном кресле процент занятости — всегда одно и то же число:
							смотреть там нечего, а строка на экране остаётся.
						*/}
						{showChairUtilisation ? (
							<>
								<h3 className="ops-section-title">Занятость кресел</h3>
								{summary?.chairs?.isEmpty ? (
									<p className="ops-empty">Приёмов за период не было.</p>
								) : (
									<>
										<div className="ops-table-wrap">
											<table className="ops-table">
												<thead>
													<tr>
														<th scope="col">Кресло</th>
														<th scope="col">Занято</th>
														<th scope="col">Приёмов</th>
														<th scope="col">Занятость</th>
													</tr>
												</thead>
												<tbody>
													{(summary?.chairs?.rows ?? []).map((row) => (
														<tr
															key={
																row?.chairId ?? row?.chairName ?? Math.random()
															}
														>
															<td className="ops-strong" data-label="Кресло">
																{row?.chairName ?? "—"}
															</td>
															<td className="ops-num" data-label="Занято">
																{formatHours(row?.bookedMinutes ?? 0)}
															</td>
															<td className="ops-num" data-label="Приёмов">
																{row?.appointments ?? 0}
															</td>
															<td className="ops-num" data-label="Занятость">
																{formatPercent(row?.utilization ?? null)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
										{/* База расчёта обязана стоять рядом с процентом. */}
										<p className="ops-hint">
											{summary?.chairs?.basis?.note ?? ""}
										</p>
									</>
								)}
							</>
						) : null}

						{/* ── Приёмы ────────────────────────────────────────────── */}
						<h3 className="ops-section-title">Приёмы</h3>
						<p>
							Дошли до кресла:{" "}
							{formatPercent(summary?.appointments?.arrivalRate ?? null)} ·
							завершено:{" "}
							{formatPercent(summary?.appointments?.completionRate ?? null)} ·
							отменено:{" "}
							{formatPercent(summary?.appointments?.cancellationRate ?? null)} ·
							неявки: {formatPercent(summary?.appointments?.noShowRate ?? null)}
						</p>
						{/*
							Доли считаются от ВСЕХ записей периода, включая ещё не
							состоявшиеся, поэтому в сумме они меньше ста процентов. Без этой
							строки экран выглядел как ошибка подсчёта: 45 + 14 + 9 = 68, и
							куда делись остальные — непонятно.
						*/}
						<p className="ops-hint">
							Доли считаются от всех {summary?.appointments?.total ?? 0} записей
							периода. Остаток до 100 % — приёмы, которые ещё не состоялись: они
							назначены на будущее или ждут подтверждения.
						</p>

						{/*
							── Разбивка по статусам ──────────────────────────────────
							ЧТО БЫЛО. `summary.appointments.byStatus` приходил в сводке
							с первого дня (managerReports.ts group by status), а панель
							рисовала только проценты arrival/completion/cancel/noShow.
							Владелец видел «неявки 9 %» и не мог узнать, сколько записей
							ещё в «назначен» / «на приёме» / «подтверждён» — без этого
							не видно, где застревает день.

							НОВОГО ЗАПРОСА НЕТ: числа уже в сводке. Отдельный
							/api/reports/appointments-by-status не зовём.
						*/}
						{Object.keys(summary?.appointments?.byStatus ?? {}).length > 0 ? (
							<div
								className="ops-table-wrap"
								data-testid="manager-reports-appointments-by-status"
							>
								<table className="ops-table">
									<caption className="sr-only">
										Число записей периода по статусу
									</caption>
									<thead>
										<tr>
											<th scope="col">Статус</th>
											<th scope="col">Записей</th>
											<th scope="col">Доля</th>
										</tr>
									</thead>
									<tbody>
										{Object.entries(summary?.appointments?.byStatus ?? {})
											.filter(([, count]) => count > 0)
											.sort((a, b) => b[1] - a[1])
											.map(([status, count]) => {
												const share =
													(summary?.appointments?.total ?? 0) > 0
														? count / (summary?.appointments?.total ?? 1)
														: null;
												return (
													<tr key={status}>
														<td className="ops-strong" data-label="Статус">
															{appointmentStatusLabels[status] ?? status}
														</td>
														<td className="ops-num" data-label="Записей">
															{count}
														</td>
														<td className="ops-num" data-label="Доля">
															{formatPercent(share)}
														</td>
													</tr>
												);
											})}
									</tbody>
								</table>
							</div>
						) : null}

						{/*
							── Поток пациентов по месяцам ────────────────────────────

							ЧТО ЗДЕСЬ БЫЛО НЕ ТАК. Разбивку `patientFlow.points` сводка
							присылает с самого начала, а панель показывала из неё ОДНУ
							плитку «7 / 0» в итогах периода. Отчёт существует ради
							динамики: по числу первичных за месяц оценивают рекламу, и из
							одной суммы за квартал этого не видно.

							НОВОГО ЗАПРОСА ЗДЕСЬ НЕТ НАМЕРЕННО. Числа уже пришли в сводке;
							звать /api/reports/patient-flow отдельно значило бы посчитать
							то же самое второй раз и получить второй источник тех же цифр.

							Корзина печатается как есть, `YYYY-MM`. Превращать её в «июнь
							2026» через `new Date("2026-06-01")` нельзя: такая строка
							разбирается как полночь UTC, и в браузере западнее Гринвича
							месяц уехал бы на предыдущий — тот же дефект, из-за которого
							границы периода теперь считает сервер. Так же печатает корзины
							и разрез выручки выше.
						*/}
						{(summary?.patientFlow?.points?.length ?? 0) > 0 ? (
							<>
								<h3 className="ops-section-title">
									Первичные и повторные пациенты
								</h3>
								<div className="ops-table-wrap">
									<table className="ops-table">
										<thead>
											<tr>
												<th scope="col">Месяц</th>
												<th scope="col">Первичные</th>
												<th scope="col">Повторные</th>
											</tr>
										</thead>
										<tbody>
											{(summary?.patientFlow?.points ?? []).map((point) => (
												<tr key={point?.bucket ?? Math.random()}>
													<td className="ops-strong" data-label="Месяц">
														{point?.bucket ?? "—"}
													</td>
													<td className="ops-num" data-label="Первичные">
														{point?.newPatients ?? 0}
													</td>
													<td className="ops-num" data-label="Повторные">
														{point?.returningPatients ?? 0}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<p className="ops-hint">
									Первичный — тот, у кого это первый завершённый приём за всю
									историю клиники, а не первый в выбранном периоде. Пациент,
									пришедший в одном месяце и первично, и повторно, посчитан
									первичным один раз. Считаются пациенты, дошедшие до кресла, а
									не все записи периода — поэтому эти числа меньше числа приёмов
									выше.
								</p>
							</>
						) : null}

						{/*
							── Работают ли напоминания ──────────────────────────────
							Клиника платит за каждое SMS и должна видеть, окупается ли
							это. Показываются ОБА состава групп, а не только разница:
							по разнице долей нельзя понять, что она посчитана на трёх
							приёмах. Когда данных мало, вывод помечается прямо, а не
							подаётся как результат.
						*/}
						<h3 className="ops-section-title">Работают ли напоминания</h3>
						{summary?.reminderEffect?.isEmpty ? (
							<p className="ops-empty">
								Приёмов за период нет — сравнивать нечего.
							</p>
						) : (
							<>
								<div className="ops-table-wrap">
									<table className="ops-table">
										<caption className="sr-only">
											Потери приёмов в зависимости от того, дошло ли напоминание
										</caption>
										<thead>
											<tr>
												<th scope="col">Приёмы</th>
												<th scope="col">Всего</th>
												<th scope="col">Отмены</th>
												<th scope="col">Неявки</th>
												<th scope="col">Потеряно</th>
												<th scope="col">Доля потерь</th>
											</tr>
										</thead>
										<tbody>
											{(
												[
													[
														"Напоминание дошло",
														summary?.reminderEffect?.reminded,
													],
													[
														"Напоминание не дошло",
														summary?.reminderEffect?.notReminded,
													],
												] as const
											).map(([label, group]) => (
												<tr key={label}>
													<td className="ops-strong" data-label="Приёмы">
														{label}
													</td>
													<td className="ops-num" data-label="Всего">
														{group?.appointments ?? 0}
													</td>
													<td className="ops-num" data-label="Отмены">
														{group?.cancelled ?? 0}
													</td>
													<td className="ops-num" data-label="Неявки">
														{group?.noShow ?? 0}
													</td>
													<td className="ops-num" data-label="Потеряно">
														{group?.lost ?? 0}
													</td>
													<td
														className="ops-num ops-strong"
														data-label="Доля потерь"
													>
														{formatPercent(group?.lostRate ?? null)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{summary?.reminderEffect?.lostRateDifference !== null &&
								summary?.reminderEffect?.lostRateDifference !== undefined ? (
									<p
										className={
											summary?.reminderEffect?.enoughData
												? "ops-hint"
												: "ops-hint ops-hint--weak"
										}
									>
										{summary?.reminderEffect?.enoughData ? (
											<>
												Без напоминания теряется на{" "}
												<strong>
													{Math.round(
														(summary?.reminderEffect?.lostRateDifference ?? 0) *
															100,
													)}{" "}
													п. п.
												</strong>{" "}
												больше.{" "}
											</>
										) : null}
										{summary?.reminderEffect?.caveat ?? ""}
									</p>
								) : (
									<p className="ops-hint">
										Одна из групп пуста — сравнивать не с чем.{" "}
										{summary?.reminderEffect?.caveat ?? ""}
									</p>
								)}
							</>
						)}

						{/* ── Дебиторка ─────────────────────────────────────────── */}
						<h3 className="ops-section-title">Дебиторка</h3>
						{(summary?.receivables?.totalDebtRub ?? 0) === 0 ? (
							<p className="ops-empty ops-empty--good">Долгов нет.</p>
						) : (
							<ul className="ops-bars">
								{Object.entries(summary?.receivables?.byBucket ?? {})
									.filter(([, amount]) => amount > 0)
									.map(([bucket, amount]) => (
										<li className="ops-bar" key={bucket}>
											<span className="ops-bar__label">
												{bucketLabels[bucket] ?? bucket}
											</span>
											<span className="ops-bar__track">
												<span
													className="ops-bar__fill"
													style={{
														width: `${Math.max(2, Math.round((amount / (summary?.receivables?.totalDebtRub || 1)) * 100))}%`,
													}}
												/>
											</span>
											<span className="ops-bar__value" title={money(amount)}>
												{shortRub(amount)}
											</span>
										</li>
									))}
							</ul>
						)}

						{/* ── Переплаты: клиника должна вернуть ────────────────────── */}
						{(summary?.receivables?.totalPrepaidRub ?? 0) > 0 && (
							<>
								<h3 className="ops-section-title">
									Переплаты: клиника должна вернуть
								</h3>
								{/*
								 * Разметка — та же таблица, что у врачей и кресел выше
								 * (`ops-table` в styles/dente-operations.css), с `data-label`
								 * для узких экранов. Своих классов здесь нет намеренно:
								 * придуманный `ops-list__row` в таблице стилей не описан и
								 * дал бы неоформленный блок.
								 */}
								<div className="ops-table-wrap">
									<table className="ops-table">
										<thead>
											<tr>
												<th scope="col">Пациент</th>
												<th scope="col">Переплата</th>
											</tr>
										</thead>
										<tbody>
											{(summary?.receivables?.prepayments ?? []).map((row) => (
												<tr key={row?.patientId ?? Math.random()}>
													<td className="ops-strong" data-label="Пациент">
														{row?.patientName ?? "—"}
													</td>
													<td className="ops-num" data-label="Переплата">
														{money(row?.prepaidRub ?? 0)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<p className="ops-hint">
									Эти пациенты заплатили больше назначенного — всего{" "}
									{money(summary?.receivables?.totalPrepaidRub ?? 0)}. На
									главном экране сумма к оплате считается по всей клинике одним
									вычитанием, поэтому переплата там уже зачтена в долг других
									пациентов: долг{" "}
									{money(summary?.receivables?.totalDebtRub ?? 0)} минус
									переплаты {money(summary?.receivables?.totalPrepaidRub ?? 0)}{" "}
									и есть та сумма, которую показывает главный экран. Верните
									деньги или зачтите их в счёт следующего приёма — иначе долг
									клиники продолжит выглядеть меньше, чем он есть.
								</p>
							</>
						)}

						<p className="ops-hint">
							Период:{" "}
							{summary?.period?.from
								? new Date(summary.period.from).toLocaleDateString("ru-RU")
								: "—"}{" "}
							—{" "}
							{summary?.period?.to
								? new Date(summary.period.to).toLocaleDateString("ru-RU")
								: "—"}
							. В выручку входят только полученные платежи; назначенные и
							возвращённые не учитываются.
						</p>
					</>
				)
			) : null}

			{/*
				── Что продаётся ─────────────────────────────────────────────────
				Разрез /api/reports/services. До этой правки его не звал никто:
				маршрут считал позиции лечения, а владелец видел только итоговое
				«получено» и не мог узнать, на чём клиника заработала и сколько
				отдала скидками.

				ПОЧЕМУ СНАРУЖИ ВЕТКИ `summary`, КАК И ВЫПЛАТЫ НИЖЕ. Внутри блок был
				бы виден только когда сводка УЖЕ построилась: при её отказе или при
				пустом периоде он исчезал бы вместе с ней, хотя у него свой запрос и
				своя причина отказа. Ровно так в этом дереве уже прятались три
				починки диктовки — экран не открывался, и работы будто не было.
			*/}
			{services.error !== null || services.data !== null ? (
				<>
					<h3 className="ops-section-title">Что продаётся</h3>
					{services.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText("Разрез по услугам", services.error)}
						</p>
					) : services.data === null || services.data.isEmpty ? (
						<p className="ops-empty">
							За выбранный период не назначено ни одной позиции лечения. Это не
							нулевая выручка, а отсутствие записей: услуги попадают в отчёт из
							карты приёма.
						</p>
					) : (
						<>
							<div className="ops-table-wrap">
								<table className="ops-table">
									<thead>
										<tr>
											<th scope="col">Услуга</th>
											<th scope="col">Количество</th>
											<th scope="col">Назначено</th>
											<th scope="col">Средняя цена</th>
											<th scope="col">Скидка</th>
										</tr>
									</thead>
									<tbody>
										{(services?.data?.rows ?? []).map((row) => (
											<tr key={row?.title ?? Math.random()}>
												<td className="ops-strong" data-label="Услуга">
													{row?.title ?? "—"}
												</td>
												<td className="ops-num" data-label="Количество">
													{row.quantity}
												</td>
												<td className="ops-num" data-label="Назначено">
													{money(row.plannedRub)}
												</td>
												<td className="ops-num" data-label="Средняя цена">
													{money(row.averagePriceRub)}
												</td>
												<td className="ops-num" data-label="Скидка">
													{row.discountRub > 0 ? money(row.discountRub) : "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{/*
								Приписка сервера про смысл сумм обязательна к показу: это
								НАЗНАЧЕННЫЕ деньги, а не полученные. Разница с выручкой выше —
								дебиторка и скидки, и без этой строки два числа на одном экране
								выглядят как ошибка расчёта.
							*/}
							<p className="ops-hint">
								Назначено всего {money(services?.data?.plannedTotalRub ?? 0)},
								из них отдано скидками{" "}
								{money(services?.data?.discountTotalRub ?? 0)}.{" "}
								{services?.data?.note}
							</p>
						</>
					)}
				</>
			) : null}

			{/*
				── Когда клиника занята ──────────────────────────────────────────
				Разрез /api/reports/schedule-load, тоже не звал никто. Он отвечает на
				вопрос, который из общей цифры за месяц не виден вовсе: «в среду с 10
				до 13 очередь, а в субботу пусто». По нему открывают и закрывают
				смены и решают, куда ставить дополнительное кресло.

				РЕЖИМ КЛИНИКИ ЗДЕСЬ НЕ ПРИ ЧЁМ, и это осознанно. Признаки
				`chairUtilisation` и `doctorBreakdown` прячут разрезы, бессмысленные
				по УСТРОЙСТВУ: у одного кресла занятость всегда одна и та же, у одного
				врача выработка это он сам. Часы приёма от числа кресел и врачей не
				зависят: отдельный врач так же решает, работать ли ему в субботу, и
				его собственная сетка для него так же не видна.
			*/}
			{scheduleLoad.error !== null || scheduleLoad.data !== null ? (
				<>
					<h3 className="ops-section-title">Когда клиника занята</h3>
					{scheduleLoad.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText(
								"Разрез загрузки по дням и часам",
								scheduleLoad.error,
							)}
						</p>
					) : scheduleLoad.data === null || scheduleLoad.data.isEmpty ? (
						<p className="ops-empty">
							Приёмов за выбранный период не было — распределять по дням и часам
							нечего.
						</p>
					) : (
						<>
							<ul className="ops-bars">
								{(scheduleMargins?.byWeekday ?? []).map((row) => (
									<li className="ops-bar" key={`weekday-${row?.key}`}>
										<span className="ops-bar__label">
											{weekdayNames[row?.key] ?? row?.key}
										</span>
										<span className="ops-bar__track">
											<span
												className="ops-bar__fill"
												style={{
													width: `${(row?.minutes ?? 0) > 0 && (scheduleMargins?.peakWeekdayMinutes ?? 0) > 0 ? Math.max(2, Math.round(((row?.minutes ?? 0) / scheduleMargins.peakWeekdayMinutes) * 100)) : 0}%`,
												}}
											/>
										</span>
										<span className="ops-bar__value">
											{formatHours(row?.minutes ?? 0)}
										</span>
									</li>
								))}
							</ul>
							<h3 className="ops-section-title">Часы приёма</h3>
							<ul className="ops-bars">
								{(scheduleMargins?.byHour ?? []).map((row) => (
									<li className="ops-bar" key={`hour-${row?.key}`}>
										<span className="ops-bar__label">
											{String(row.key).padStart(2, "0")}:00
										</span>
										<span className="ops-bar__track">
											<span
												className="ops-bar__fill"
												style={{
													width: `${row.minutes > 0 && scheduleMargins.peakHourMinutes > 0 ? Math.max(2, Math.round((row.minutes / scheduleMargins.peakHourMinutes) * 100)) : 0}%`,
												}}
											/>
										</span>
										<span className="ops-bar__value">
											{formatHours(row.minutes)}
										</span>
									</li>
								))}
							</ul>
							<p className="ops-hint">
								{scheduleLoad.data.busiestWeekday !== null &&
								scheduleLoad.data.busiestHour !== null
									? `Самый занятый день — ${weekdayNames[scheduleLoad.data.busiestWeekday] ?? scheduleLoad.data.busiestWeekday}, самый занятый час — ${String(scheduleLoad.data.busiestHour).padStart(2, "0")}:00. `
									: ""}
								День недели и час берутся в часовом поясе клиники, а не
								браузера. Отменённые приёмы в занятые минуты не входят; неявка
								кресло занимала и учтена.
							</p>
						</>
					)}
				</>
			) : null}

			{/*
				── Кто именно не доплатил ────────────────────────────────────────
				Разрез /api/reports/receivables. Сводка отдаёт только итог и ЧИСЛО
				должников — «долг 53 000 ₽, 2 пациент(ов)». По такой строке нельзя
				позвонить: нет ни имени, ни срока. Сами строки лежали в ответе
				маршрута, которого не звал никто.

				ПЕРИОДА У ЭТОГО РАЗРЕЗА НЕТ, и он снаружи ветки `summary` ещё и
				поэтому: долг существует на дату отчёта, а не «за март». Он обязан
				быть виден и когда в выбранном периоде не было ни одного приёма —
				именно в такую неделю и садятся звонить должникам.

				Расчёт тот же самый, что у корзин дебиторки выше: одна функция
				`receivables` на сервере, один способ считать долг. Второго расчёта
				долга здесь не появилось — их в этом дереве и без того было четыре.
			*/}
			{debtors.error !== null || debtors.data !== null ? (
				<>
					<h3 className="ops-section-title">Кто именно не доплатил</h3>
					{debtors.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText("Список должников", debtors.error)}
						</p>
					) : debtors?.data === null ||
						(debtors?.data?.rows ?? []).length === 0 ? (
						<p className="ops-empty ops-empty--good">
							Должников нет: ни у одного пациента нет неоплаченного лечения.
						</p>
					) : (
						<>
							<div className="ops-table-wrap">
								<table className="ops-table">
									<caption className="sr-only">
										Пациенты с неоплаченным лечением, от крупного долга к
										мелкому
									</caption>
									<thead>
										<tr>
											<th scope="col">Пациент</th>
											<th scope="col">Долг</th>
											<th scope="col">Срок</th>
											<th scope="col">Первая позиция</th>
										</tr>
									</thead>
									<tbody>
										{(debtors?.data?.rows ?? []).map((row) => (
											<tr key={row?.patientId ?? Math.random()}>
												<td className="ops-strong" data-label="Пациент">
													{row?.patientName ?? "—"}
												</td>
												<td className="ops-num" data-label="Долг">
													{money(row.debtRub)}
												</td>
												<td data-label="Срок">
													{bucketLabels[row.bucket] ?? row.bucket}
												</td>
												<td className="ops-num" data-label="Первая позиция">
													{row.oldestChargeAt === null
														? "дата не определена"
														: new Date(row.oldestChargeAt).toLocaleDateString(
																"ru-RU",
															)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="ops-hint">
								Итого {money(debtors?.data?.totalDebtRub ?? 0)} у{" "}
								{(debtors?.data?.rows ?? []).length} пациент(ов).{" "}
								{debtors?.data?.note}
							</p>
						</>
					)}
				</>
			) : null}

			{/*
				── Выплаты врачам ────────────────────────────────────────────────
				Расчёт зарплаты врача: касса врача за месяц, ставка, удержание за
				материалы, сумма к выплате. Раньше этой таблицы не видел никто —
				единственный экран, который её рендерил, не импортировал ни один
				файл (страж scripts/check-component-mount-reachability.mjs называл
				его сиротой), и владелец считал зарплату в тетради.

				ПОЧЕМУ ЗДЕСЬ. Это тот же вопрос, что и разрез по врачам выше, и
				ровно то, чего ждал прочерк в колонке «Маржа». Отдельный экран не
				нужен: владелец приходит сюда за месячными итогами, а зарплату
				считают тем же походом.

				ПОЧЕМУ СНАРУЖИ ВЕТКИ `summary`, А НЕ ВНУТРИ РАЗДЕЛА «ВРАЧИ».
				Внутри она была бы видна только когда отчёт УЖЕ построился и в его
				периоде есть записи: при `summary.isEmpty` и при любой ошибке
				/api/reports/summary блок исчезал бы вместе с ней. Зарплата к
				этому отчёту не относится — у неё свой запрос и свой зарплатный
				месяц, и пропадать она не должна ни в тихую неделю, ни когда
				сводка не загрузилась.

				ПОЧЕМУ ПОД ТЕМ ЖЕ ПРИЗНАКОМ, ЧТО И РАЗРЕЗ ПО ВРАЧАМ. Правило уже
				сформулировано в lib/clinicCapabilities.ts: `doctorBreakdown` нет
				у режима solo_doctor. Отдельный врач получает всю выручку сам —
				делить её с собой по проценту незачем, и объяснение пропажи уже
				написано (describeHiddenCapabilities). Второй признак про то же
				самое разъехался бы с первым.

				КОМУ ВИДНО. Решает СЕРВЕР: `payroll.read` и `payroll.read.own` в
				apps/api/src/security/permissions.ts. Роль в шапке — настройка
				интерфейса, её меняет сам пользователь, и прятать по ней зарплату
				значило бы охранять её кнопкой. Компонент исчезает, когда сервер
				ответил 403, и матрицу прав на клиенте не повторяет.
			*/}
			{showDoctorBreakdown ? <DoctorPayoutDashboard /> : null}
		</section>
	);
}

export default ManagerReportsPanel;

/**
 * Подписи дней недели для отчёта загрузки. До этой правки они были ЗАГОТОВКОЙ:
 * объявлены и экспортированы «для повторного использования», а разреза загрузки
 * по дням недели на экране не было вовсе. Теперь их читает раздел «Когда клиника
 * занята» выше; порядок соответствует ISO — 1 понедельник, 7 воскресенье, как
 * возвращает `extract(isodow …)` в services/reports/managerReports.ts.
 */
export { weekdayNames };
