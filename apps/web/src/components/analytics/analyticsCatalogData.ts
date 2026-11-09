/**
 * apps/web/src/components/analytics/analyticsCatalogData.ts
 *
 * ЕДИНЫЙ SSOT АНАЛИТИКИ КЛИНИКИ, ВЫРУЧКИ И ДАШБОРДА РУКОВОДИТЕЛЯ (Мандат 8n & Мандат 8ap).
 *
 * 3 КЛЮЧЕВЫХ СТОЛПА УПРАВЛЕНЧЕСКОГО КОНТРОЛЯ:
 * 1. Выручка и Касса (Наличные, Безнал, СБП, Аванс; Средний чек; точные целочисленные копейки).
 * 2. Загрузка кресел (% занятости кабинетов, норма 65–85%, часы приёма / доступные часы).
 * 3. Эффективность врачей и Повторная явка (Recall %, средняя длительность визита, выручка).
 *
 * (Мандат 8ap: Реляционная правда из PostgreSQL 18, zero fake simulation).
 */

import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export type AnalyticsPeriod = "day" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";

export interface AnalyticsPeriodOption {
	readonly key: AnalyticsPeriod;
	readonly label: string;
	readonly shortLabel: string;
}

export const ANALYTICS_PERIOD_OPTIONS: readonly AnalyticsPeriodOption[] = [
	{ key: "day", label: "Сегодня", shortLabel: "День" },
	{ key: "yesterday", label: "Вчера", shortLabel: "Вчера" },
	{ key: "week", label: "Текущая неделя", shortLabel: "Неделя" },
	{ key: "month", label: "Текущий месяц", shortLabel: "Месяц" },
	{ key: "quarter", label: "Квартал", shortLabel: "Квартал" },
	{ key: "year", label: "Текущий год", shortLabel: "Год" },
] as const;

export interface PaymentMethodItem {
	readonly id: "cash" | "card" | "sbp" | "deposit";
	readonly label: string;
	readonly amountKopecks: number;
	readonly percent: number;
	readonly formatted: string;
}

export interface PaymentBreakdownSSOT {
	readonly cashKopecks: number;
	readonly cardDmsKopecks: number;
	readonly sbpKopecks: number;
	readonly depositKopecks: number;
	readonly totalKopecks: number;
	readonly methods: readonly PaymentMethodItem[];
}

export interface ServiceCategoryDistribution {
	readonly category: string;
	readonly count: number;
	readonly revenueKopecks: number;
	readonly sharePercent: number;
	readonly formattedRevenue: string;
}

export interface DoctorPerformanceSSOT {
	readonly id: string;
	readonly name: string;
	readonly specialty: string;
	readonly revenueKopecks: number;
	readonly revenueFormatted: string;
	readonly visitsCount: number;
	readonly chairHours: number;
	readonly averageCheckKopecks: number;
	readonly averageCheckFormatted: string;
	readonly rebookingPercent: number;
}

export interface PatientRecallCohort {
	readonly cohortKey: string;
	readonly cohortLabel: string;
	readonly monthsInactive: number;
	readonly patientsCount: number;
	readonly recallRatePercent: number;
	readonly recommendedService: string;
	readonly messageTemplate: string;
}

export interface ClinicAnalyticsSSOT {
	readonly period: AnalyticsPeriod;
	readonly periodLabel: string;
	readonly revenueKopecks: number;
	readonly revenueFormatted: string;
	readonly averageCheckKopecks: number;
	readonly averageCheckFormatted: string;
	readonly chairOccupancyPercent: number;
	readonly chairOccupancyStatus: "low" | "optimal" | "high";
	readonly occupiedMinutes: number;
	readonly availableMinutes: number;
	readonly totalChairsCount: number;
	readonly rebookingRatePercent: number;
	readonly rebookingStatus: "critical" | "warning" | "healthy";
	readonly totalVisitsCount: number;
	readonly completedVisitsCount: number;
	readonly noShowVisitsCount: number;
	readonly activeDoctorsCount: number;
	readonly paymentBreakdown: PaymentBreakdownSSOT;
	readonly serviceStructure: readonly ServiceCategoryDistribution[];
	readonly doctors: readonly DoctorPerformanceSSOT[];
	readonly recallCohorts: readonly PatientRecallCohort[];
	readonly isLiveApi: boolean;
	readonly updatedAtIso: string;
	readonly isEmpty?: boolean;
}

/**
 * Каноническое безопасное форматирование рублей из целочисленных копеек.
 */
export function formatKopecksToRubles(kopecks: number): string {
	const rubles = Math.round(Number(kopecks || 0) / 100);
	return `${rubles.toLocaleString("ru-RU")} ₽`;
}

/**
 * Расчет статуса загрузки кресла: норма стоматологической практики 65–85%.
 */
export function getOccupancyStatus(percent: number): "low" | "optimal" | "high" {
	if (percent < 65) return "low";
	if (percent <= 85) return "optimal";
	return "high";
}

/**
 * Расчет статуса повторной явки (Recall): здоровый уровень стоматологии >= 70%.
 */
export function getRebookingStatus(percent: number): "critical" | "warning" | "healthy" {
	if (percent < 50) return "critical";
	if (percent < 70) return "warning";
	return "healthy";
}

/**
 * Генерация персонализированного сообщения WhatsApp для возврата пациента из когорты.
 * Строго First-Principles без псевдонаучного regex-парсинга заметок.
 */
export function generatePatientRecallWhatsAppMessage(
	patientName: string,
	doctorName: string,
	clinicName: string = "Стоматологическая клиника",
	monthsInactive: number = 6,
): string {
	const cleanPatient = patientName.trim() || "Уважаемый пациент";
	const cleanDoctor = doctorName.trim() || "лечащего врача";

	if (monthsInactive <= 3) {
		return `${cleanPatient}, добрый день! Напоминаем о плановом контрольном осмотре у ${cleanDoctor} в клинике «${clinicName}». Проверим состояние реставраций и эмали.`;
	}
	if (monthsInactive <= 6) {
		return `${cleanPatient}, здравствуйте! Прошло 6 месяцев после вашего завершающего лечения в «${clinicName}». Самое время пройти профилактическую гигиену Air-Flow у ${cleanDoctor} для сохранения гарантии.`;
	}
	return `${cleanPatient}, здравствуйте! Прошло более ${monthsInactive} месяцев с вашего последнего визита к ${cleanDoctor} в «${clinicName}». Приглашаем на годовой профосмотр и диагностику для ранней профилактики.`;
}

/**
 * Честное пустое состояние аналитики (Zero Operations / Empty State) без псевдонаучных чисел.
 */
export function createEmptyAnalyticsState(period: AnalyticsPeriod = "month"): ClinicAnalyticsSSOT {
	const periodLabel =
		ANALYTICS_PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "Текущий период";

	const methods: PaymentMethodItem[] = [
		{ id: "card", label: "Банковские карты", amountKopecks: 0, percent: 0, formatted: "0 ₽" },
		{ id: "sbp", label: "СБП QR-код", amountKopecks: 0, percent: 0, formatted: "0 ₽" },
		{ id: "cash", label: "Наличные (касса)", amountKopecks: 0, percent: 0, formatted: "0 ₽" },
		{ id: "deposit", label: "Аванс / Депозит", amountKopecks: 0, percent: 0, formatted: "0 ₽" },
	];

	return {
		period,
		periodLabel,
		revenueKopecks: 0,
		revenueFormatted: "0 ₽",
		averageCheckKopecks: 0,
		averageCheckFormatted: "0 ₽",
		chairOccupancyPercent: 0,
		chairOccupancyStatus: "low",
		occupiedMinutes: 0,
		availableMinutes: 0,
		totalChairsCount: 0,
		rebookingRatePercent: 0,
		rebookingStatus: "critical",
		totalVisitsCount: 0,
		completedVisitsCount: 0,
		noShowVisitsCount: 0,
		activeDoctorsCount: 0,
		paymentBreakdown: {
			cashKopecks: 0,
			cardDmsKopecks: 0,
			sbpKopecks: 0,
			depositKopecks: 0,
			totalKopecks: 0,
			methods,
		},
		serviceStructure: [],
		doctors: [],
		recallCohorts: [],
		isLiveApi: true,
		updatedAtIso: new Date().toISOString(),
		isEmpty: true,
	};
}

/**
 * Загрузка актуальных данных управленческой аналитики из реального API бэкенда Fastify (PostgreSQL 18).
 */
export async function fetchClinicAnalyticsSSOT(
	period: AnalyticsPeriod = "month",
	signal?: AbortSignal,
	customRange?: { from: string; to: string },
): Promise<ClinicAnalyticsSSOT> {
	try {
		const queryParams = new URLSearchParams();
		queryParams.set("period", period);
		if (customRange?.from) queryParams.set("from", customRange.from);
		if (customRange?.to) queryParams.set("to", customRange.to);

		const requestInit: RequestInit = {
			method: "GET",
			headers: { Accept: "application/json" },
			credentials: "same-origin",
		};
		if (signal) {
			requestInit.signal = signal;
		}

		// Запрос к каноническому эндпоинту Fastify
		const res = await fetch(`/api/v1/manager/reports/kpi?${queryParams.toString()}`, requestInit);

		if (!res.ok) {
			if (isDemoShowcaseMode()) {
				return createEmptyAnalyticsState(period);
			}
			throw new Error(`AnalyticsApiError: ${res.status} ${res.statusText}`);
		}

		const json = await res.json();
		const payload = json?.data;
		if (!payload || !payload.kpis || payload.isEmpty) {
			// [ANL-01] При живом ответе API без данных возвращаем честный пустой стейт без синтетики
			return createEmptyAnalyticsState(period);
		}

		const kpis = payload.kpis;
		const totalRevenueKop = Number(kpis.totalRevenueKopecks ?? 0);
		const completedVisits = Number(kpis.totalCompletedVisits ?? 0);
		const totalVisits = Number(kpis.totalAppointments ?? completedVisits);
		const noShows = Number(kpis.noShowVisitsCount ?? 0);
		const avgCheckKop = completedVisits > 0 ? Math.round(totalRevenueKop / completedVisits) : Number(kpis.averageCheckKopecks ?? 0);

		const pb = kpis.paymentBreakdown;
		const cashKop = pb ? Math.round(Number(pb.cashRub || 0) * 100) : 0;
		const cardKop = pb ? Math.round(Number(pb.cardDmsRub || 0) * 100) : 0;
		const sbpKop = pb ? Math.round(Number(pb.sbpRub || 0) * 100) : 0;
		const depositKop = pb ? Math.round(Number(pb.depositRub || 0) * 100) : 0;
		const sumKop = cashKop + cardKop + sbpKop + depositKop;

		const methods: PaymentMethodItem[] = [
			{
				id: "card",
				label: "Банковские карты",
				amountKopecks: cardKop,
				percent: sumKop > 0 ? Math.round((cardKop / sumKop) * 100) : 0,
				formatted: formatKopecksToRubles(cardKop),
			},
			{
				id: "sbp",
				label: "СБП QR-код",
				amountKopecks: sbpKop,
				percent: sumKop > 0 ? Math.round((sbpKop / sumKop) * 100) : 0,
				formatted: formatKopecksToRubles(sbpKop),
			},
			{
				id: "cash",
				label: "Наличные (касса)",
				amountKopecks: cashKop,
				percent: sumKop > 0 ? Math.round((cashKop / sumKop) * 100) : 0,
				formatted: formatKopecksToRubles(cashKop),
			},
			{
				id: "deposit",
				label: "Аванс / Депозит",
				amountKopecks: depositKop,
				percent: sumKop > 0 ? Math.round((depositKop / sumKop) * 100) : 0,
				formatted: formatKopecksToRubles(depositKop),
			},
		];

		const occPercent = Number(kpis.chairOccupancyRatePercent ?? 0);
		const periodLabel = ANALYTICS_PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "Текущий период";

		const rawDocs = Array.isArray(payload.topDoctors) ? payload.topDoctors : [];
		const doctors: DoctorPerformanceSSOT[] = rawDocs.map((d: any, idx: number) => {
			const docBilled = Number(d.billedRub || d.revenueRub || 0);
			const docKop = Math.round(docBilled * 100);
			const visits = Number(d.visits || d.visitsCount || 0);
			const avgKop = visits > 0 ? Math.round(docKop / visits) : 0;
			// [ANL-01] Ликвидация симуляции visits * 0.9: расчет строго по реальным часам в кресле из PostgreSQL 18
			const chairHours =
				typeof d.chairHours === "number" && !isNaN(d.chairHours)
					? Number(d.chairHours.toFixed(1))
					: typeof d.workedHours === "number" && !isNaN(d.workedHours)
						? Number(d.workedHours.toFixed(1))
						: typeof d.occupiedMinutes === "number" && !isNaN(d.occupiedMinutes)
							? Number((d.occupiedMinutes / 60).toFixed(1))
							: 0;

			return {
				id: String(d.id || d.doctorUserId || `doc-${idx + 1}`),
				name: String(d.name || d.fullName || `Врач ${idx + 1}`),
				specialty: String(d.specialty || "Стоматолог"),
				revenueKopecks: docKop,
				revenueFormatted: formatKopecksToRubles(docKop),
				visitsCount: visits,
				chairHours,
				averageCheckKopecks: avgKop,
				averageCheckFormatted: formatKopecksToRubles(avgKop),
				rebookingPercent: Number(d.rebookingPercent || 0),
			};
		});

		const rawProcs = Array.isArray(payload.topProcedures) ? payload.topProcedures : [];
		const totalProcCount = rawProcs.reduce((acc: number, p: any) => acc + Number(p.count || 0), 0);
		const serviceStructure: ServiceCategoryDistribution[] = rawProcs.map((p: any) => {
			const revKop = Math.round(Number(p.revenueRub || 0) * 100);
			const count = Number(p.count || 0);
			const sharePct = totalProcCount > 0 ? Math.round((count / totalProcCount) * 100) : 0;
			return {
				category: String(p.title || p.category || "Процедура"),
				count,
				revenueKopecks: revKop,
				sharePercent: sharePct,
				formattedRevenue: formatKopecksToRubles(revKop),
			};
		});

		const repeatPct = Number(kpis.repeatPatientsPercent || 0);
		const isEmpty = Boolean(payload.isEmpty) || (totalRevenueKop === 0 && totalVisits === 0);

		return {
			period,
			periodLabel,
			revenueKopecks: totalRevenueKop,
			revenueFormatted: formatKopecksToRubles(totalRevenueKop),
			averageCheckKopecks: avgCheckKop,
			averageCheckFormatted: formatKopecksToRubles(avgCheckKop),
			chairOccupancyPercent: occPercent,
			chairOccupancyStatus: getOccupancyStatus(occPercent),
			occupiedMinutes: Number(kpis.totalOccupiedMinutes ?? 0),
			availableMinutes: Number(kpis.totalAvailableMinutes ?? 0),
			totalChairsCount: Math.max(1, Number(kpis.totalChairsCount ?? 1)),
			rebookingRatePercent: repeatPct,
			rebookingStatus: getRebookingStatus(repeatPct),
			totalVisitsCount: totalVisits,
			completedVisitsCount: completedVisits,
			noShowVisitsCount: noShows,
			activeDoctorsCount: Math.max(0, Number(kpis.activeDoctorsCount ?? doctors.length)),
			paymentBreakdown: {
				cashKopecks: cashKop,
				cardDmsKopecks: cardKop,
				sbpKopecks: sbpKop,
				depositKopecks: depositKop,
				totalKopecks: sumKop,
				methods,
			},
			serviceStructure,
			doctors,
			recallCohorts: [],
			isLiveApi: true,
			updatedAtIso: payload.updatedAtIso || new Date().toISOString(),
			isEmpty,
		};
	} catch (err) {
		if (isDemoShowcaseMode()) {
			return createEmptyAnalyticsState(period);
		}
		throw err;
	}
}

/**
 * Экспорт финансового отчета в формате CSV с UTF-8 BOM для безупречного открытия в Excel.
 */
export function exportAnalyticsToCsv(data: ClinicAnalyticsSSOT): void {
	if (typeof window === "undefined" && typeof globalThis.document === "undefined") return;

	const lines: string[] = [
		`"DENTE CRM — УПРАВЛЕНЧЕСКАЯ АНАЛИТИКА И ФИНАНСОВЫЙ ОТЧЕТ"`,
		`"Период:","${data.periodLabel}"`,
		`"Дата выгрузки:","${new Date().toLocaleDateString("ru-RU")} ${new Date().toLocaleTimeString("ru-RU")}"`,
		`"Выручка кассы (₽):",${Math.round(data.revenueKopecks / 100)}`,
		`"Средний чек (₽):",${Math.round(data.averageCheckKopecks / 100)}`,
		`"Загрузка кресел (%):",${data.chairOccupancyPercent}`,
		`"Повторная явка пациентов (%):",${data.rebookingRatePercent}`,
		`"Всего визитов:",${data.totalVisitsCount}`,
		`"Завершенных приёмов:",${data.completedVisitsCount}`,
		`"Неявок (No-Show):",${data.noShowVisitsCount}`,
		"",
		`"СТРУКТУРА ОПЛАТ (КАССА)"`,
		`"Способ оплаты","Сумма (₽)","Доля (%)"`,
		...data.paymentBreakdown.methods.map(
			(m) => `"${m.label}",${Math.round(m.amountKopecks / 100)},${m.percent}`,
		),
		"",
		`"РЕЙТИНГ ВРАЧЕЙ КЛИНИКИ"`,
		`"Врач","Специальность","Выручка (₽)","Приёмов","Часов в кресле","Средний чек (₽)","Повторная запись (%)"`,
		...data.doctors.map(
			(d) =>
				`"${d.name}","${d.specialty}",${Math.round(d.revenueKopecks / 100)},${d.visitsCount},${d.chairHours},${Math.round(d.averageCheckKopecks / 100)},${d.rebookingPercent}`,
		),
	];

	const csvContent = `\uFEFF${lines.join("\r\n")}`;
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute(
		"download",
		`Dente_Analytics_${data.period}_${new Date().toISOString().slice(0, 10)}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
