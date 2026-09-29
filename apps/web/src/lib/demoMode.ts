/**
 * demoMode.ts
 *
 * Единый источник правды для определения демонстрационного режима (Demo / Showcase / E2E Proofs).
 *
 * КЛИНИЧЕСКИЙ ИНВАРИАНТ (МАНДАТ 8y):
 * 1. В боевом режиме (Production, без ?demo=true) реальные пациенты и клиника КАТЕГОРИЧЕСКИ НЕ ДОЛЖНЫ
 *    получать синтетические данные, чужие зубы, фейковые снимки или выдуманную сетку приёмов.
 *    Интерфейс строго отображает реальные данные PostgreSQL 18, а для новой чистой клиники —
 *    честные информативные EmptyState (Fail-Closed Invariant).
 * 2. В демонстрационном режиме (Showcase: ?demo=true, #demo, showcase=true или localStorage)
 *    система системно подгружает витринные эталонные данные: плотную сетку приёмов (с непрерывным
 *    блоком 1-3ч), картотеку образцовых пациентов, 3 варианта плана лечения и снимки.
 */

import type {
	Appointment,
	Patient,
	ExecutiveDashboardPayload,
	ExecutivePeriod,
	ExecutiveFunnelStage,
} from "@dental/shared";
import {
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";
import type { AnalyticsDashboardData } from "../pages/analyticsDoctorMetrics.js";

let _runtimeDemoOverride: boolean | null = null;

export function setRuntimeDemoMode(enabled: boolean | null): void {
	_runtimeDemoOverride = enabled;
	if (typeof window !== "undefined") {
		try {
			if (enabled === true) {
				localStorage.setItem("dente_demo_showcase", "true");
			} else if (enabled === false) {
				localStorage.removeItem("dente_demo_showcase");
			}
		} catch {
			// restricted storage
		}
	}
}

export function enableDemoShowcaseMode(): void {
	setRuntimeDemoMode(true);
}

export function disableDemoShowcaseMode(): void {
	setRuntimeDemoMode(false);
}

export function isDemoShowcaseMode(explicitOverride?: boolean): boolean {
	if (typeof explicitOverride === "boolean") return explicitOverride;
	if (typeof _runtimeDemoOverride === "boolean") return _runtimeDemoOverride;

	if (typeof window !== "undefined") {
		try {
			const search = window.location?.search || "";
			const hash = window.location?.hash || "";

			// Явное отключение демо через параметр URL
			if (search.includes("demo=false") || hash.includes("demo=false") || search.includes("showcase=false")) {
				_runtimeDemoOverride = false;
				localStorage.removeItem("dente_demo_showcase");
				return false;
			}

			// Включение демо через search (?demo=true, ?demo=1, ?showcase=true)
			if (
				search.includes("demo=true") ||
				search.includes("demo=1") ||
				search.includes("showcase=true") ||
				search.includes("showcase=1")
			) {
				localStorage.setItem("dente_demo_showcase", "true");
				return true;
			}

			// Включение демо через hash (#demo, #/demo, #/schedule?demo=true)
			if (
				hash === "#demo" ||
				hash.startsWith("#demo") ||
				hash.startsWith("#/demo") ||
				hash.includes("demo=true") ||
				hash.includes("demo=1") ||
				hash.includes("showcase=true")
			) {
				localStorage.setItem("dente_demo_showcase", "true");
				return true;
			}

			// Проверка сохранённого состояния в localStorage
			if (localStorage.getItem("dente_demo_showcase") === "true") {
				return true;
			}
		} catch {
			// SSR or restricted storage
		}
	}

	if (typeof process !== "undefined" && process.env) {
		if (
			process.env.IS_DEMO_SHOWCASE === "true" ||
			process.env.VITE_DEMO_SHOWCASE === "true" ||
			process.env.VITE_DEMO_MODE === "true"
		) {
			return true;
		}
	}

	if (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env) {
		const env = (import.meta as unknown as { env: Record<string, string> }).env;
		if (
			env.IS_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_MODE === "true" ||
			env.MODE === "demo"
		) {
			return true;
		}
	}

	return false;
}

/**
 * Проверка, является ли идентификатор пациента демонстрационным / тестовым образцом.
 */
export function isDemoPatientId(patientId?: string | null): boolean {
	if (!patientId) return false;
	const lower = patientId.toLowerCase();
	return (
		lower.startsWith("sample_") ||
		lower.startsWith("demo_") ||
		lower.startsWith("01a00000-0000-0000-0000-") ||
		lower.startsWith("pat-88") ||
		lower.includes("test_patient") ||
		lower === "active_patient"
	);
}

export const DEMO_SHOWCASE_ORG_ID = "01a00000-0000-0000-0000-000000000000";
export const DEMO_CHAIR_1_ID = "01a00000-0000-0000-0002-000000000001";
export const DEMO_CHAIR_2_ID = "01a00000-0000-0000-0002-000000000002";
export const DEMO_DOCTOR_1_ID = "01a00000-0000-0000-0003-000000000001";
export const DEMO_DOCTOR_2_ID = "01a00000-0000-0000-0003-000000000002";

/**
 * Образцовая витринная картотека пациентов для демонстрационного режима.
 */
export function getDemoShowcasePatients(): Patient[] {
	return [
		{
			id: "01a00000-0000-0000-0000-000000000001",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Смирнова Анна Сергеевна",
			birthDate: "1988-04-12",
			gender: "female",
			phone: "+7 916 234-56-78",
			email: "smirnova.anna@example.com",
			notes: "Соматический статус: Соматически здорова. Без хронических патологий. Аллергоанамнез не отягощен. Переносимость местных анестетиков артикаинового ряда хорошая.",
			status: "active",
			balanceRub: 15000,
			administrativeProfile: null,
			createdAt: "2026-01-15T09:00:00.000Z",
			updatedAt: "2026-09-28T08:00:00.000Z",
		},
		{
			id: "01a00000-0000-0000-0000-000000000002",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Воронов Дмитрий Игоревич",
			birthDate: "1979-09-25",
			gender: "male",
			phone: "+7 925 876-54-32",
			email: "voronov.dmitry@example.com",
			notes: "ВНИМАНИЕ: Аллергия на пенициллиновый ряд! Анамнез: гипертоническая болезнь 1 ст. АД под контролем (125/80).",
			status: "active",
			balanceRub: -4500,
			administrativeProfile: null,
			createdAt: "2026-02-10T11:30:00.000Z",
			updatedAt: "2026-09-28T09:30:00.000Z",
		},
		{
			id: "01a00000-0000-0000-0000-000000000003",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Ковалева Елена Павловна",
			birthDate: "1995-11-03",
			gender: "female",
			phone: "+7 903 555-44-33",
			email: "kovaleva.elena@example.com",
			notes: "Соматически здорова. Проходит ортодонтическое лечение (элайнеры Spark, этап 8/24).",
			status: "active",
			balanceRub: 35000,
			administrativeProfile: null,
			createdAt: "2026-03-01T14:15:00.000Z",
			updatedAt: "2026-09-28T10:00:00.000Z",
		},
		{
			id: "01a00000-0000-0000-0000-000000000004",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Кузнецов Михаил Викторович",
			birthDate: "1965-06-18",
			gender: "male",
			phone: "+7 915 999-88-77",
			email: "kuznetsov.m@example.com",
			notes: "Сахарный диабет 2 типа, компенсированный (HbA1c 6.2%). Согласован хирургический протокол имплантации Straumann BLX.",
			status: "active",
			balanceRub: 0,
			administrativeProfile: null,
			createdAt: "2026-04-12T16:00:00.000Z",
			updatedAt: "2026-09-28T11:00:00.000Z",
		},
	];
}

/**
 * Образцовая плотная сетка приёмов для демонстрационного режима расписания:
 * - 09:00 - 10:30 (90 мин): Завершенный приём (Терапия, кариес 46)
 * - 11:00 - 13:00 (120 мин): Активный приём IN_TREATMENT (Непрерывный блок: эндодонтия 36)
 * - 14:00 - 15:00 (60 мин): Запланированный приём (Консультация ортопеда)
 * - 15:30 - 17:00 (90 мин): Запланированный приём (Профгигиена AirFlow)
 */
export function getDemoShowcaseAppointments(baseDateIso?: string): Appointment[] {
	const today = baseDateIso || new Date().toISOString().slice(0, 10);

	return [
		{
			id: "01a00000-0000-0000-0001-000000000001",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: "01a00000-0000-0000-0000-000000000001",
			doctorUserId: DEMO_DOCTOR_1_ID,
			chairId: DEMO_CHAIR_1_ID,
			status: "completed",
			startsAt: `${today}T09:00:00.000Z`,
			endsAt: `${today}T10:30:00.000Z`,
			reason: "Терапия: лечение глубокого кариеса зуба 46, реставрация световой композит",
			comment: "Приём успешно завершён, пациент направлен на гигиену",
		},
		{
			id: "01a00000-0000-0000-0001-000000000002",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: "01a00000-0000-0000-0000-000000000002",
			doctorUserId: DEMO_DOCTOR_1_ID,
			chairId: DEMO_CHAIR_1_ID,
			status: "in_treatment",
			startsAt: `${today}T11:00:00.000Z`,
			endsAt: `${today}T13:00:00.000Z`,
			reason: "Эндодонтия под микроскопом: распломбировка и обтурация 3 каналов зуба 36",
			comment: "Длительный непрерывный приём (2 часа), коффердам наложен",
		},
		{
			id: "01a00000-0000-0000-0001-000000000003",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: "01a00000-0000-0000-0000-000000000003",
			doctorUserId: DEMO_DOCTOR_2_ID,
			chairId: DEMO_CHAIR_2_ID,
			status: "planned",
			startsAt: `${today}T14:00:00.000Z`,
			endsAt: `${today}T15:00:00.000Z`,
			reason: "Контрольный осмотр ортодонта, выдача следующего сета элайнеров",
			comment: "Пациент подтвердил визит через Telegram-бота",
		},
		{
			id: "01a00000-0000-0000-0001-000000000004",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: "01a00000-0000-0000-0000-000000000004",
			doctorUserId: DEMO_DOCTOR_2_ID,
			chairId: DEMO_CHAIR_2_ID,
			status: "planned",
			startsAt: `${today}T15:30:00.000Z`,
			endsAt: `${today}T17:00:00.000Z`,
			reason: "Хирургическая консультация: планирование дентальной имплантации по КЛКТ",
			comment: "Прикреплен 3D-снимок КЛКТ (KaVo OP300)",
		},
	];
}

/**
 * Образцовая витринная сквозная аналитика руководителя (генерального директора).
 * Включает 5 профильных отделений, 8-этапную воронку первичных пациентов,
 * 77% загрузку кресел и честную unit-экономику (LTV/CAC).
 */
export function getDemoExecutiveAnalytics(
	period: ExecutivePeriod = "month",
): ExecutiveDashboardPayload {
	const rawStages = [
		{ stage: "lead" as ExecutiveFunnelStage, count: 120 },
		{ stage: "consultation_booking" as ExecutiveFunnelStage, count: 98 },
		{ stage: "attended" as ExecutiveFunnelStage, count: 88 },
		{ stage: "ai_examination" as ExecutiveFunnelStage, count: 82, isAiAssisted: true },
		{ stage: "plan_presentation" as ExecutiveFunnelStage, count: 78, totalVolumeKopecks: 1240000000 },
		{ stage: "plan_approved" as ExecutiveFunnelStage, count: 56, totalVolumeKopecks: 820000000 },
		{ stage: "treatment_started" as ExecutiveFunnelStage, count: 48, totalVolumeKopecks: 680000000 },
		{ stage: "sanitation_completed" as ExecutiveFunnelStage, count: 38 },
	];

	const totalMarketingSpendKopecks = 32000000;
	const funnelStages = calculateExecutiveFunnel(rawStages, totalMarketingSpendKopecks);

	const rawDepts = [
		{
			departmentKey: "therapy" as const,
			planRevenueKopecks: 150000000,
			factRevenueKopecks: 158000000,
			completedVisitsCount: 142,
			uniquePatientsCount: 110,
		},
		{
			departmentKey: "orthopedics" as const,
			planRevenueKopecks: 160000000,
			factRevenueKopecks: 152000000,
			completedVisitsCount: 48,
			uniquePatientsCount: 36,
		},
		{
			departmentKey: "surgery_implantation" as const,
			planRevenueKopecks: 110000000,
			factRevenueKopecks: 105000000,
			completedVisitsCount: 38,
			uniquePatientsCount: 30,
		},
		{
			departmentKey: "orthodontics" as const,
			planRevenueKopecks: 55000000,
			factRevenueKopecks: 51000000,
			completedVisitsCount: 28,
			uniquePatientsCount: 24,
		},
		{
			departmentKey: "pediatric" as const,
			planRevenueKopecks: 25000000,
			factRevenueKopecks: 19000000,
			completedVisitsCount: 22,
			uniquePatientsCount: 18,
		},
	];

	const departments = calculateDepartmentBreakdown(rawDepts);

	const kpis = calculateExecutiveKpisSummary({
		period,
		totalRevenueKopecks: 485000000,
		totalRevenuePlanKopecks: 500000000,
		primaryRevenueKopecks: 145500000,
		repeatRevenueKopecks: 339500000,
		primaryPatientsCount: 48,
		repeatPatientsCount: 170,
		totalMarketingSpendKopecks,
		historicalCohortLtvKopecks: 14500000,
		totalOccupiedMinutes: 27720,
		totalAvailableMinutes: 36000,
		totalChairsCount: 3,
		totalLeadsCount: 120,
		aiExaminedLeadsCount: 82,
		totalSanitationCount: 38,
		totalCompletedVisits: 278,
		activeDoctorsCount: 5,
		cancelledVisitsCount: 12,
		noShowVisitsCount: 4,
	});

	const now = new Date();
	return {
		kpis,
		funnelStages,
		departments,
		period,
		dateRangeStartIso: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
		dateRangeEndIso: now.toISOString(),
		updatedAtIso: now.toISOString(),
		isEmpty: false,
	};
}

/**
 * Образцовая витринная операционная аналитика клиники (графики Recharts, врачи, кресла).
 */
export function getDemoDashboardAnalytics(
	_dateRange?: string,
): AnalyticsDashboardData {
	return {
		kpis: {
			totalPatients: 218,
			totalRevenue: 4850000,
			totalAppointments: 278,
			avgRevenuePerPatient: 22247,
			cashRevenue: 1200000,
			cardRevenue: 2850000,
			cashlessRevenue: 600000,
			advanceRevenue: 200000,
			sbpRevenue: 0,
			bankTransferRevenue: 0,
			insuranceRevenue: 0,
			bonusRevenue: 0,
			averageCheck: 17446,
			primaryPatientsCount: 48,
			repeatPatientsCount: 170,
			chairOccupancyRatePercent: 77,
		},
		cohortLtvJson: [
			{ cohort: "2025-Q1", "Month 12": 138000 },
			{ cohort: "2025-Q2", "Month 12": 142000 },
			{ cohort: "2025-Q3", "Month 12": 149000 },
			{ cohort: "2025-Q4", "Month 12": 154000 },
		],
		planFunnelJson: [
			{ name: "Консультация", value: 98, fill: "var(--teal, #0d9488)" },
			{ name: "Диагностика Diagnocat", value: 82, fill: "var(--brand-300, #0d9488)" },
			{ name: "Презентация плана", value: 78, fill: "var(--accent, #6366f1)" },
			{ name: "Согласовано", value: 56, fill: "var(--ok-fg, #10b981)" },
			{ name: "Начато лечение", value: 48, fill: "var(--brand-accent, #0ea5e9)" },
			{ name: "Санирован", value: 38, fill: "var(--gold, #f59e0b)" },
		],
		chairUtilizationJson: [
			{
				chairId: DEMO_CHAIR_1_ID,
				name: "Кресло 1 (Терапия/Хирургия)",
				value: 82,
				occupiedMinutes: 9840,
				availableMinutes: 12000,
				utilizationPercent: 82,
				fill: "var(--teal, #0d9488)",
			},
			{
				chairId: DEMO_CHAIR_2_ID,
				name: "Кресло 2 (Ортопедия/Ортодонтия)",
				value: 75,
				occupiedMinutes: 9000,
				availableMinutes: 12000,
				utilizationPercent: 75,
				fill: "var(--accent, #6366f1)",
			},
			{
				chairId: "01a00000-0000-0002-0000-000000000003",
				name: "Кресло 3 (Детство/Гигиена)",
				value: 74,
				occupiedMinutes: 8880,
				availableMinutes: 12000,
				utilizationPercent: 74,
				fill: "var(--ok-fg, #10b981)",
			},
		],
		doctorProfitabilityJson: [
			{
				doctorId: DEMO_DOCTOR_1_ID,
				name: "Смирнов А.В. (Ортопедия / Хирургия)",
				revenue: 2570000,
				appointmentsCount: 86,
				avgTicketRub: 29883,
				workedHours: 154,
				hourlyRevenueRub: 16688,
				margin: 1240000,
				completionRate: 94,
				services804nCount: 112,
				labOrdersCount: 28,
				labOrdersCostRub: 480000,
				doctorPayrollRub: 642500,
				clinicMarginRub: 1447500,
			},
			{
				doctorId: DEMO_DOCTOR_2_ID,
				name: "Иванова М.С. (Терапия / Эндодонтия)",
				revenue: 1580000,
				appointmentsCount: 142,
				avgTicketRub: 11126,
				workedHours: 160,
				hourlyRevenueRub: 9875,
				margin: 890000,
				completionRate: 91,
				services804nCount: 184,
				labOrdersCount: 4,
				labOrdersCostRub: 25000,
				doctorPayrollRub: 395000,
				clinicMarginRub: 1160000,
			},
			{
				doctorId: "01a00000-0000-0003-0000-000000000003",
				name: "Петров К.Д. (Ортодонтия)",
				revenue: 510000,
				appointmentsCount: 28,
				avgTicketRub: 18214,
				workedHours: 64,
				hourlyRevenueRub: 7968,
				margin: 280000,
				completionRate: 89,
				services804nCount: 42,
				labOrdersCount: 14,
				labOrdersCostRub: 110000,
				doctorPayrollRub: 127500,
				clinicMarginRub: 272500,
			},
			{
				doctorId: "01a00000-0000-0003-0000-000000000004",
				name: "Сидорова О.Н. (Детская стоматология)",
				revenue: 190000,
				appointmentsCount: 22,
				avgTicketRub: 8636,
				workedHours: 48,
				hourlyRevenueRub: 3958,
				margin: 95000,
				completionRate: 86,
				services804nCount: 35,
				labOrdersCount: 0,
				labOrdersCostRub: 0,
				doctorPayrollRub: 47500,
				clinicMarginRub: 142500,
			},
		],
		tierAcceptance: {
			totalConsultations: 98,
			consultationToPlanConversionPercent: 79.6,
			totalPlansCount: 78,
			acceptedPlansCount: 56,
			overallAcceptancePercent: 71.8,
			tiers: [
				{
					tier: "optimum",
					label: "Оптимальный (Комплексный)",
					totalPlans: 42,
					acceptedPlans: 34,
					acceptanceRatePercent: 81,
					totalRub: 4420000,
				},
				{
					tier: "premium",
					label: "Премиум (All-on-4 / Керамика)",
					totalPlans: 18,
					acceptedPlans: 11,
					acceptanceRatePercent: 61.1,
					totalRub: 2970000,
				},
				{
					tier: "basic",
					label: "Базовый (Купирование)",
					totalPlans: 18,
					acceptedPlans: 11,
					acceptanceRatePercent: 61.1,
					totalRub: 810000,
				},
			],
		},
		noShowHeatmap: {
			totalCancelled: 12,
			totalNoShow: 4,
			peakDay: "Среда",
			peakHour: 18,
			cells: [
				{ dayOfWeek: 1, dayName: "Пн", hour: 10, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
				{ dayOfWeek: 2, dayName: "Вт", hour: 14, cancelledCount: 2, noShowCount: 1, totalLost: 3 },
				{ dayOfWeek: 3, dayName: "Ср", hour: 18, cancelledCount: 4, noShowCount: 2, totalLost: 6 },
				{ dayOfWeek: 4, dayName: "Чт", hour: 11, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
				{ dayOfWeek: 5, dayName: "Пт", hour: 16, cancelledCount: 3, noShowCount: 1, totalLost: 4 },
				{ dayOfWeek: 6, dayName: "Сб", hour: 12, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
			],
		},
		isEmpty: false,
	};
}
