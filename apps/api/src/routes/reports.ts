/**
 * Маршруты отчётов руководителю.
 *
 * ЗАЧЕМ: единственным отчётом был /api/analytics/dashboard. Владелец клиники не
 * мог увидеть ни динамику выручки, ни долю неявок, ни дебиторку, ни то, что
 * именно продаётся, — при том что данные для всего этого в базе лежат.
 *
 * ПЕРИОД. Все отчёты, кроме дебиторки, принимают from и to. По умолчанию —
 * текущий месяц целиком. Дебиторка периода не имеет: долг не «возникает в
 * марте», он просто есть на дату отчёта.
 *
 * ДОСТУП. Отчёты — это выручка, долги и выработка сотрудников; право
 * analytics.read уже существует и раздано владельцу, управляющему и
 * администратору, но не врачу и не ассистенту.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireClinicalReadContext } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import {
	appointmentFunnel,
	chairLoad,
	clinicTimeZone,
	currentMonthPeriod,
	doctorPerformance,
	instantOfLocalTime,
	patientFlow,
	receivables,
	reminderEffect,
	revenueTimeline,
	scheduleLoad,
	serviceSales,
	type ReportScope
} from "../services/reports/managerReports.js";

/** Календарная дата: ровно то, что показывает и отдаёт `<input type="date">`. */
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * ГРАНИЦА ПЕРИОДА: ЛИБО КАЛЕНДАРНАЯ ДАТА, ЛИБО ПОЛНЫЙ ISO СО СМЕЩЕНИЕМ.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стоял только `z.string().datetime({ offset: true })`,
 * то есть маршрут требовал МГНОВЕНИЕ. Календарную дату из поля ввода в мгновение
 * приходилось превращать браузеру, а он делал это в СВОЁМ поясе:
 * `new Date("2026-07-01T00:00:00")` без смещения разбирается в поясе клиента.
 * Измерено: браузер в Москве (+3) посылал `2026-06-30T21:00:00.000Z`, браузер на
 * Камчатке (+12) — `2026-06-30T12:00:00.000Z`, разница девять часов на одном и том
 * же выборе «июль».
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Владелец сети из Москвы смотрит камчатский филиал:
 * для клиники московская граница — 1 июля 09:00 по её часам. Месячный отчёт терял
 * кассу первой смены месяца и захватывал девять часов 1 августа. Суммы при этом
 * правдоподобны, поэтому расхождение с кассой ищут в кассе, а не в границах.
 *
 * ЗАЧЕМ СОЮЗ, А НЕ ЗАМЕНА. Полный ISO принимают тесты и, возможно, другие
 * клиенты; отобрать его — сломать работающее. Набор принимаемых значений
 * РАСШИРЯЕТСЯ, а не меняется.
 */
const periodBoundarySchema = z.union([
	z.string().regex(CALENDAR_DATE_PATTERN),
	z.string().datetime({ offset: true })
]);

const periodQuerySchema = z.object({
	from: periodBoundarySchema.optional(),
	to: periodBoundarySchema.optional(),
	granularity: z.enum(["day", "week", "month"]).optional(),
	minutesPerDay: z.coerce.number().int().min(60).max(1440).optional(),
	workingDaysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
	minDebtRub: z.coerce.number().int().min(1).max(10_000_000).optional()
});

const MAX_PERIOD_DAYS = 400;

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "ReportValidationError", message });
}

/*
 * Часовой пояс клиники берётся из `managerReports.js`, а СВОЕЙ копии здесь
 * больше нет.
 *
 * Она тут была — байт в байт та же выборка `clinics.timezone` с тем же
 * возвратом `null` при сбое. Пояс клиники — источник истины о календарной дате
 * для всего сервера, и второй читатель означает второе место, куда придётся
 * вносить каждое следующее правило (проверка имени по каталогу PostgreSQL, кэш,
 * поведение при отсутствии клиники). Из такой же экономии в этом дереве выросли
 * четыре разных расчёта долга пациента.
 *
 * Выплаты уже импортируют канонический (`routes/billing.ts:15`). Осталась ТРЕТЬЯ
 * копия — `apps/api/src/migration/loader.ts:63`; она читает пояс из настроек
 * рассылки и возвращает `Promise<string>`, то есть при отсутствии значения
 * ПОДСТАВЛЯЕТ пояс по умолчанию вместо «неизвестно». Это отдельный долг, он
 * записан в очередь, и здесь его молча не трогаю.
 */

/**
 * ГРАНИЦА ПЕРИОДА В МГНОВЕНИЕ. КАЛЕНДАРНУЮ ДАТУ РАЗРЕШАЕТ ТОТ, КТО ЗНАЕТ ПОЯС.
 *
 * Календарная дата (`YYYY-MM-DD`) — не мгновение: «1 июля» на Камчатке
 * начинается на девять часов раньше, чем «1 июля» в Москве. Превращать одно в
 * другое имеет право только тот, кто знает пояс клиники, то есть сервер.
 *
 * `from` — начало суток в поясе клиники. `to` — КОНЕЦ суток ВКЛЮЧИТЕЛЬНО, и он
 * считается как начало СЛЕДУЮЩИХ суток минус миллисекунда. Так ни длина месяца,
 * ни сутки длиной 23 и 25 часов на переходе зимнего времени не считаются руками:
 * «следующий день» задаётся номером дня, а `Date.UTC` внутри `instantOfLocalTime`
 * нормализует переполнение сам (день 32 июля — это 1 августа).
 *
 * СМЕЩЕНИЕ СНИМАЕТСЯ ДВАЖДЫ, и это делает `instantOfLocalTime`
 * (`services/reports/managerReports.ts`). Своей копии зонной арифметики здесь
 * НЕТ намеренно: это был бы пятый источник истины о календарной дате, а из такой
 * экономии в этом дереве уже выросли четыре разных расчёта долга пациента и три
 * копии `clinicTimeZone`.
 *
 * ПОЛНЫЙ ISO проходит насквозь: мгновение однозначно само по себе, и пояс ему не
 * нужен.
 *
 * ПОЯС НЕИЗВЕСТЕН — прежнее поведение: сутки берутся в поясе серверного
 * процесса. Отчёт обязан вернуть какой-то период; отказ здесь хуже
 * приблизительного ответа, и точно так же поступает `currentMonthPeriod`.
 *
 * `null` — дату разобрать нельзя. Несуществующая календарная дата (`2026-02-30`,
 * `2026-13-01`) отклоняется, а НЕ нормализуется молча в 2 марта и январь 2027:
 * правдоподобный ответ на невозможный запрос хуже отказа.
 */
export function resolvePeriodBoundary(raw: string, edge: "from" | "to", timeZone: string | null): Date | null {
	const calendar = CALENDAR_DATE_PATTERN.exec(raw);
	if (!calendar) {
		const instant = new Date(raw);
		return Number.isNaN(instant.getTime()) ? null : instant;
	}

	const year = Number(calendar[1]);
	const month = Number(calendar[2]);
	const day = Number(calendar[3]);
	if (month < 1 || month > 12 || day < 1) return null;
	// Нулевой день следующего месяца — последний день этого. Номер последнего дня
	// от пояса не зависит: он определяется только годом и месяцем.
	if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;

	const boundaryDay = edge === "to" ? day + 1 : day;
	if (timeZone) {
		const instant = instantOfLocalTime(timeZone, year, month, boundaryDay);
		if (instant !== null) return new Date(edge === "to" ? instant - 1 : instant);
	}

	const local = new Date(year, month - 1, boundaryDay, 0, 0, 0, 0);
	if (Number.isNaN(local.getTime())) return null;
	return new Date(edge === "to" ? local.getTime() - 1 : local.getTime());
}

/**
 * Период из запроса. Слишком широкий диапазон отклоняется, а не обрезается
 * молча: отчёт «за всё время», выданный за отчёт «за год», хуже отказа.
 */
function resolvePeriod(
	query: z.infer<typeof periodQuerySchema>,
	timeZone: string | null
): { ok: true; from: Date; to: Date } | { ok: false; message: string } {
	const fallback = currentMonthPeriod(new Date(), timeZone);
	const from = query.from === undefined ? fallback.from : resolvePeriodBoundary(query.from, "from", timeZone);
	const to = query.to === undefined ? fallback.to : resolvePeriodBoundary(query.to, "to", timeZone);

	if (from === null || to === null) {
		return { ok: false, message: "Даты периода не разобраны." };
	}
	if (from > to) return { ok: false, message: "Начало периода позже его конца." };

	const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
	if (spanDays > MAX_PERIOD_DAYS) {
		return { ok: false, message: `Период длиннее ${MAX_PERIOD_DAYS} дней. Сузьте диапазон.` };
	}
	return { ok: true, from, to };
}

export async function registerReportRoutes(app: FastifyInstance) {
	/**
	 * Общий разбор запроса для всех отчётов с периодом: доступ, право, период.
	 * Возвращает null, если ответ клиенту уже отправлен.
	 */
	async function scopeFor(
		request: FastifyRequest,
		reply: FastifyReply,
		area: string
	): Promise<{ scope: ReportScope; query: z.infer<typeof periodQuerySchema> } | null> {
		const context = await requireClinicalReadContext(request, reply, area);
		if (!context) return null;
		if (!enforcePermissionWhenStaffKnown(request, reply, "analytics.read")) return null;

		const parsed = periodQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			badRequest(reply, "Проверьте параметры отчёта: даты, детализацию и пределы.");
			return null;
		}
		/*
		 * Пояс клиники читается ВСЕГДА, а не только когда период не задан.
		 *
		 * Прежнее условие («явные from/to уже приходят полным ISO со смещением,
		 * значит пояс не нужен») смешивало две РАЗНЫЕ роли пояса:
		 *
		 *  1. ГРАНИЦЫ периода. Здесь довод верен: полный ISO однозначен сам по
		 *     себе, и `resolvePeriod` берёт пояс только для ЗАПАСНОГО периода,
		 *     когда from/to не пришли вовсе. Поэтому эта правка границы не
		 *     двигает — проверено прогоном всех 18 тестов отчётов.
		 *  2. ГРУППИРОВКА внутри периода. Здесь довод неверен: `date_trunc` в
		 *     PostgreSQL режет месяц, неделю и день по поясу СЕССИИ, и никакое
		 *     смещение в границах на это не влияет. Без пояса группировка
		 *     возвращается в пояс сессии.
		 *
		 * ЦЕНА ОШИБКИ. Панель отчётов посылает from И to при КАЖДОЙ загрузке:
		 * оба поля заполнены из `monthBounds()` ещё до первого щелчка оператора
		 * (`apps/web/src/components/reports/ManagerReportsPanel.tsx:222-237`).
		 * То есть на единственном пути, которым ходит клиент, пояс был `null`
		 * всегда, и ни одна из починок поясов в отчётах не исполнялась ни разу:
		 * ни динамика выручки, ни тепловая карта смен, ни воронка пациентов.
		 * Тест воронки это видел и обходил — он посылает только `from` без `to`.
		 *
		 * Это ТРЕТИЙ случай одного класса в этом дереве: панель обзвона так же
		 * всегда посылала `?date=` и отменяла серверный расчёт «на завтра», а
		 * три починки диктовки не дошли до врача, потому что экран не
		 * открывался. Зелёный тест на маршруте не доказывает работу пути,
		 * которым ходит клиент.
		 *
		 * Лишний запрос к базе не лишний: `clinicTimeZone` держит кэш на
		 * процесс, а сверка имени по каталогу PostgreSQL кэшируется отдельно.
		 */
		const timeZone = await clinicTimeZone(context.organizationId);
		const period = resolvePeriod(parsed.data, timeZone);
		if (!period.ok) {
			badRequest(reply, period.message);
			return null;
		}

		return {
			// Пояс клиники доходит до отчётов: группировка в PostgreSQL иначе считается
			// в поясе сессии, и день с часом съезжают на величину смещения.
			scope: { organizationId: context.organizationId, from: period.from, to: period.to, timeZone },
			query: parsed.data
		};
	}

	app.get("/api/reports/revenue", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report revenue");
		if (!resolved) return;
		const report = await revenueTimeline(resolved.scope, resolved.query.granularity ?? "day");
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/doctors", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report doctors");
		if (!resolved) return;
		const report = await doctorPerformance(resolved.scope);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/chairs", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report chairs");
		if (!resolved) return;
		const options: { minutesPerDay?: number; workingDaysPerWeek?: number } = {};
		if (resolved.query.minutesPerDay !== undefined) options.minutesPerDay = resolved.query.minutesPerDay;
		if (resolved.query.workingDaysPerWeek !== undefined) options.workingDaysPerWeek = resolved.query.workingDaysPerWeek;
		const report = await chairLoad(resolved.scope, options);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/appointments", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report appointments");
		if (!resolved) return;
		const report = await appointmentFunnel(resolved.scope);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	/**
	 * Работают ли напоминания. Отдельный маршрут, а не поле воронки: сравнение
	 * групп требует объяснения оговорки, и его нельзя выдавать за долю неявок.
	 */
	app.get("/api/reports/reminder-effect", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report reminder effect");
		if (!resolved) return;
		const report = await reminderEffect(resolved.scope);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/patient-flow", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report patient flow");
		if (!resolved) return;
		const report = await patientFlow(resolved.scope);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/services", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report services");
		if (!resolved) return;
		const report = await serviceSales(resolved.scope, resolved.query.limit ?? 50);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	app.get("/api/reports/schedule-load", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report schedule load");
		if (!resolved) return;
		const report = await scheduleLoad(resolved.scope);
		return { period: { from: resolved.scope.from, to: resolved.scope.to }, ...report };
	});

	/**
	 * Дебиторка. Периода нет намеренно: долг существует на дату отчёта, а не
	 * «за март». Фильтр — минимальная сумма, чтобы копеечные расхождения не
	 * забивали список.
	 */
	app.get("/api/reports/receivables", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "report receivables");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "analytics.read")) return;

		const parsed = periodQuerySchema.safeParse(request.query);
		if (!parsed.success) return badRequest(reply, "Проверьте параметры отчёта.");

		const options: { minDebtRub?: number; limit?: number } = {};
		if (parsed.data.minDebtRub !== undefined) options.minDebtRub = parsed.data.minDebtRub;
		if (parsed.data.limit !== undefined) options.limit = parsed.data.limit;

		return receivables(context.organizationId, options);
	});

	/**
	 * Сводка для руководителя: всё главное одним запросом, чтобы экран не делал
	 * восемь обращений и не показывал половину чисел раньше другой половины.
	 */
	app.get("/api/reports/summary", async (request, reply) => {
		const resolved = await scopeFor(request, reply, "report summary");
		if (!resolved) return;

		const [revenue, doctors, chairs, funnel, flow, debts, reminders] = await Promise.all([
			revenueTimeline(resolved.scope, resolved.query.granularity ?? "day"),
			doctorPerformance(resolved.scope),
			chairLoad(resolved.scope),
			appointmentFunnel(resolved.scope),
			patientFlow(resolved.scope),
			receivables(resolved.scope.organizationId),
			reminderEffect(resolved.scope)
		]);

		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			revenue,
			doctors,
			chairs,
			appointments: funnel,
			reminderEffect: reminders,
			patientFlow: flow,
			/*
			 * Переплаты идут в сводку вместе с долгом. Без них экран показывал долг
			 * 53 000 ₽, а главный экран — 51 400 ₽, и разницу (две переплаты по
			 * 800 ₽) не объяснял никто: деньги пациентов молча зачитывались в чужой
			 * долг. `prepayments` несёт имена и суммы — иначе неизвестно, кому
			 * возвращать.
			 */
			receivables: {
				totalDebtRub: debts.totalDebtRub,
				byBucket: debts.byBucket,
				debtors: debts.rows.length,
				totalPrepaidRub: debts.totalPrepaidRub,
				prepayments: debts.prepayments
			},
			// Признак пустоты по всем разделам сразу: интерфейс должен различать
			// «данных за период нет» и «все показатели равны нулю».
			isEmpty: revenue.isEmpty && doctors.isEmpty && chairs.isEmpty && funnel.isEmpty && flow.isEmpty
		};
	});
}

export default registerReportRoutes;
