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
import { requireClinicalReadContext } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import {
	appointmentFunnel,
	chairLoad,
	currentMonthPeriod,
	doctorPerformance,
	patientFlow,
	receivables,
	revenueTimeline,
	scheduleLoad,
	serviceSales,
	type ReportScope
} from "../services/reports/managerReports.js";

const periodQuerySchema = z.object({
	from: z.string().datetime({ offset: true }).optional(),
	to: z.string().datetime({ offset: true }).optional(),
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

/**
 * Период из запроса. Слишком широкий диапазон отклоняется, а не обрезается
 * молча: отчёт «за всё время», выданный за отчёт «за год», хуже отказа.
 */
function resolvePeriod(
	query: z.infer<typeof periodQuerySchema>
): { ok: true; from: Date; to: Date } | { ok: false; message: string } {
	const fallback = currentMonthPeriod();
	const from = query.from ? new Date(query.from) : fallback.from;
	const to = query.to ? new Date(query.to) : fallback.to;

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
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
		const period = resolvePeriod(parsed.data);
		if (!period.ok) {
			badRequest(reply, period.message);
			return null;
		}

		return {
			scope: { organizationId: context.organizationId, from: period.from, to: period.to },
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

		const [revenue, doctors, chairs, funnel, flow, debts] = await Promise.all([
			revenueTimeline(resolved.scope, resolved.query.granularity ?? "day"),
			doctorPerformance(resolved.scope),
			chairLoad(resolved.scope),
			appointmentFunnel(resolved.scope),
			patientFlow(resolved.scope),
			receivables(resolved.scope.organizationId)
		]);

		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			revenue,
			doctors,
			chairs,
			appointments: funnel,
			patientFlow: flow,
			receivables: { totalDebtRub: debts.totalDebtRub, byBucket: debts.byBucket, debtors: debts.rows.length },
			// Признак пустоты по всем разделам сразу: интерфейс должен различать
			// «данных за период нет» и «все показатели равны нулю».
			isEmpty: revenue.isEmpty && doctors.isEmpty && chairs.isEmpty && funnel.isEmpty && flow.isEmpty
		};
	});
}

export default registerReportRoutes;
