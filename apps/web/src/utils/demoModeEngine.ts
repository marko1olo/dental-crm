/**
 * demoModeEngine.ts
 *
 * Единый источник правды (SSOT) для строгого разграничения боевого (Production)
 * и демонстрационного (Demo / Showcase / Test-Drive) режимов.
 *
 * КЛИНИЧЕСКИЙ ИНВАРИАНТ (МАНДАТ 8c & МАНДАТ 8f & МАНДАТ 8y):
 * 1. Боевой режим (Production, isDemoMode === false):
 *    - Полная изоляция от синтетических данных.
 *    - Запрет автоматической подгрузки тестовых пациентов, фейковых расписаний,
 *      образцовых КТ (Захаров) и вымышленных услуг/сумм в договорах и чеках.
 *    - Честный EmptyState и Fail-Closed при ошибках сети или пустых таблицах.
 * 2. Демонстрационный режим (Showcase / Demo, isDemoMode === true):
 *    - Системная подгрузка эталонных клинических данных для тест-драйва и обучения.
 *    - Плотная сетка расписания с непрерывными блоками (1-3ч), эталонная картотека,
 *      полноценная 3D КЛКТ модель и сбалансированная финансовая аналитика.
 */

import type {
	Appointment,
	Patient,
	StaffRole,
	ExecutiveDashboardPayload,
	ExecutivePeriod,
	ExecutiveFunnelStage,
} from "@dental/shared";
import {
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	patientAdministrativeProfileSchema,
} from "@dental/shared";
import type { AnalyticsDashboardData } from "../pages/analyticsDoctorMetrics.js";

let _runtimeDemoOverride: boolean | null = null;

import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_CHAIR_3_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
	DEMO_STUDY_INSTANCE_UID,
} from "./demo/demoConstants.js";

export * from "./demo/demoConstants.js";
export * from "./demo/demoClinicalCases.js";
export * from "./demo/demoInteractiveSimulation.js";

export interface DemoStaffMember {
	id: string;
	organizationId: string;
	fullName: string;
	role: StaffRole;
	specialization: string;
	email: string;
	phone: string;
	active: boolean;
	color: string;
}

/**
 * Эталонный штат сотрудников для всех 5 клинических ролей в демо-режиме:
 * 1. Терапевт / Ортопед (Д-р Соколов А. В.)
 * 2. Ортодонт (Д-р Морозова Е. И.)
 * 3. Хирург-имплантолог (Д-р Громов К. Д.)
 * 4. Главврач / Владелец (Д-р Воронов М. С.)
 * 5. Старший администратор (Смирнова А. П.)
 */
export function getDemoShowcaseStaff(): DemoStaffMember[] {
	return [
		{
			id: DEMO_DOCTOR_1_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Соколов А. В.",
			role: "doctor",
			specialization: "Терапевт",
			email: "therapist@dente-demo.ru",
			phone: "+7 916 111-22-33",
			active: true,
			color: "var(--teal, #0d9488)",
		},
		{
			id: DEMO_DOCTOR_ORTHOPEDIST_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Орлов А. В.",
			role: "doctor",
			specialization: "Ортопед",
			email: "orthopedist@dente-demo.ru",
			phone: "+7 916 111-88-99",
			active: true,
			color: "var(--brand-accent, #6366f1)",
		},
		{
			id: DEMO_DOCTOR_2_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Морозова Е. И.",
			role: "doctor",
			specialization: "Ортодонт",
			email: "orthodontist@dente-demo.ru",
			phone: "+7 916 222-33-44",
			active: true,
			color: "var(--accent, #6366f1)",
		},
		{
			id: DEMO_DOCTOR_SURGEON_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Громов К. Д.",
			role: "doctor",
			specialization: "Хирург-имплантолог",
			email: "surgeon@dente-demo.ru",
			phone: "+7 916 333-44-55",
			active: true,
			color: "var(--danger, #ef4444)",
		},
		{
			id: DEMO_OWNER_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Воронов М. С.",
			role: "owner",
			specialization: "Главврач / Владелец",
			email: "owner@dente-demo.ru",
			phone: "+7 916 444-55-66",
			active: true,
			color: "var(--gold, #f59e0b)",
		},
		{
			id: DEMO_ADMIN_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Смирнова А. П.",
			role: "administrator",
			specialization: "Старший администратор",
			email: "admin@dente-demo.ru",
			phone: "+7 916 555-66-77",
			active: true,
			color: "var(--ok-fg, #10b981)",
		},
	];
}

/**
 * Ручное переключение демо-режима в рантайме (для переключателей в интерфейсе).
 */
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

/**
 * Главный канонический предикат: активен ли демо-режим.
 */
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

			// Автоматический демо-режим для страниц предварительного просмотра (*_preview.html)
			if (window.location?.pathname?.includes("preview")) {
				return true;
			}

			// Включение демо через search (?demo=true, ?demo=1, ?showcase=true, ?cbct=demo, ?cbct=1)
			if (
				search.includes("demo=true") ||
				search.includes("demo=1") ||
				search.includes("showcase=true") ||
				search.includes("showcase=1") ||
				search.includes("cbct=demo") ||
				search.includes("cbct=1") ||
				search.includes("cbct=true") ||
				search.includes("cbct")
			) {
				localStorage.setItem("dente_demo_showcase", "true");
				return true;
			}

			// Включение демо через hash (#demo, #/demo, #/schedule?demo=true, #cbct=demo)
			if (
				hash === "#demo" ||
				hash.startsWith("#demo") ||
				hash.startsWith("#/demo") ||
				hash.includes("demo=true") ||
				hash.includes("demo=1") ||
				hash.includes("showcase=true") ||
				hash.includes("cbct")
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
 * Канонический алиас для SSOT demoModeEngine.
 */
export const isDemoMode = isDemoShowcaseMode;

/**
 * Проверка, является ли организация/клиника демонстрационным тенантом.
 */
export function isDemoTenant(organizationId?: string | null): boolean {
	if (!organizationId || typeof organizationId !== "string") return false;
	const lower = organizationId.toLowerCase();
	return (
		lower === DEMO_SHOWCASE_ORG_ID ||
		lower.startsWith("01a00000-0000-0000-0000-") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("sample_") ||
		lower.startsWith("test_org")
	);
}

/**
 * Проверка, является ли идентификатор пациента демонстрационным / тестовым образцом.
 */
export function isDemoPatientId(patientId?: string | null): boolean {
	if (!patientId || typeof patientId !== "string") return false;
	const lower = patientId.toLowerCase();
	return (
		lower.startsWith("sample_") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("01a00000-0000-0000-0000-") ||
		lower.startsWith("pat-88") ||
		lower.includes("test_patient") ||
		lower === "active_patient"
	);
}

/**
 * Проверка, является ли UID исследования демонстрационным (например, KaVo OP300 Захаров).
 */
export function isDemoStudyInstanceUid(studyUid?: string | null): boolean {
	if (!studyUid || typeof studyUid !== "string") return false;
	const lower = studyUid.toLowerCase();
	return (
		lower === DEMO_STUDY_INSTANCE_UID.toLowerCase() ||
		lower.includes(".demo.") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("sample_") ||
		lower.includes("zakharov") ||
		lower.includes("kavo-demo")
	);
}

/**
 * Карантин демо-данных: возвращает демо-данные ТОЛЬКО если система находится в демо-режиме
 * или условие condition === true. В противном случае строго возвращает боевые данные.
 */
export function quarantineDemoData<T>(prodData: T, demoFallback: () => T, condition?: boolean): T {
	const shouldApplyDemo = typeof condition === "boolean" ? condition : isDemoShowcaseMode();
	if (shouldApplyDemo) {
		return demoFallback();
	}
	return prodData;
}

/**
 * Утверждение чистоты боевого режима (Production Purity Invariant).
 * Проверяет, что демо-идентификаторы не протекли в боевой контекст.
 */
export function assertProductionPurity(context: string, payload: unknown): void {
	if (isDemoShowcaseMode()) {
		return; // В демо-режиме наличие демо-данных легитимно
	}

	if (!payload) return;

	const str = typeof payload === "string" ? payload : JSON.stringify(payload);
	if (str.includes(DEMO_SHOWCASE_ORG_ID)) {
		throw new Error(
			`[PRODUCTION PURITY VIOLATION in ${context}]: Demo organization ID leaked into production context.`,
		);
	}
}

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
			notes: "ВНИМАНИЕ: Аллергия на пенициллиновый ряд (Амоксиклав)! Анамнез: артериальная гипертензия 1 ст. АД под контролем (125/80).",
			allergies: "Аллергия на пенициллины (Амоксиклав)",
			somaticNotes: "Артериальная гипертензия 1 ст.",
			status: "active",
			balanceRub: 15000,
			administrativeProfile: patientAdministrativeProfileSchema.parse({
				preferredAppointmentWeekdays: [1, 3, 5],
				preferredAppointmentStart: "09:00",
				preferredAppointmentEnd: "14:00",
				preferredAppointmentNote: "Утреннее время. ВНИМАНИЕ: Аллергия на пенициллины. Артериальная гипертензия 1 ст.",
				loyaltyTier: "silver",
				orthodonticProgress: null,
			}) as any,
			createdAt: "2026-01-15T09:00:00.000Z",
			updatedAt: "2026-09-28T08:00:00.000Z",
		} as any,
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
			administrativeProfile: patientAdministrativeProfileSchema.parse({
				preferredAppointmentWeekdays: [2, 4],
				preferredAppointmentStart: "11:00",
				preferredAppointmentEnd: "16:00",
				preferredAppointmentNote: "ВНИМАНИЕ: Аллергия на пенициллины. Сложная эндодонтия зуба 36 под микроскопом.",
				loyaltyTier: "standard",
				orthodonticProgress: null,
			}) as any,
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
			administrativeProfile: patientAdministrativeProfileSchema.parse({
				preferredAppointmentWeekdays: [3, 6],
				preferredAppointmentStart: "14:00",
				preferredAppointmentEnd: "19:00",
				preferredAppointmentNote: "Элайнеры Spark, этап 8/24. Выдача следующего комплекта капп.",
				loyaltyTier: "gold",
				orthodonticProgress: JSON.stringify({
					currentAligner: 8,
					totalAligners: 24,
					startDate: "2026-01-15",
				}),
			}) as any,
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
			administrativeProfile: patientAdministrativeProfileSchema.parse({
				preferredAppointmentWeekdays: [2, 5],
				preferredAppointmentStart: "15:00",
				preferredAppointmentEnd: "18:00",
				preferredAppointmentNote: "Хирургическая консультация и планирование имплантации Straumann BLX по КЛКТ.",
				loyaltyTier: "platinum",
				orthodonticProgress: null,
			}) as any,
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
 * Образцовая витринная операционная аналитика клиники.
 */
export function getDemoDashboardAnalytics(
	_dateRange?: string,
): AnalyticsDashboardData {
	return {
		kpis: {
			totalPatients: 218,
			totalRevenue: 2450000,
			totalAppointments: 395,
			avgRevenuePerPatient: 11238,
			cashRevenue: 650000,
			cardRevenue: 1450000,
			cashlessRevenue: 250000,
			advanceRevenue: 100000,
			sbpRevenue: 0,
			bankTransferRevenue: 0,
			insuranceRevenue: 0,
			bonusRevenue: 0,
			averageCheck: 6200,
			primaryPatientsCount: 98,
			repeatPatientsCount: 297,
			chairOccupancyRatePercent: 78,
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
				value: 76,
				occupiedMinutes: 9120,
				availableMinutes: 12000,
				utilizationPercent: 76,
				fill: "var(--accent, #6366f1)",
			},
			{
				chairId: DEMO_CHAIR_3_ID,
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
				name: "Д-р Соколов А. В. (Терапевт)",
				revenue: 860000,
				appointmentsCount: 138,
				avgTicketRub: 6232,
				workedHours: 154,
				hourlyRevenueRub: 5584,
				margin: 645000,
				completionRate: 96,
				services804nCount: 184,
				labOrdersCount: 0,
				labOrdersCostRub: 0,
				doctorPayrollRub: 215000,
				clinicMarginRub: 645000,
			},
			{
				doctorId: DEMO_DOCTOR_ORTHOPEDIST_ID,
				name: "Д-р Орлов А. В. (Ортопед)",
				revenue: 750000,
				appointmentsCount: 42,
				avgTicketRub: 17857,
				workedHours: 120,
				hourlyRevenueRub: 6250,
				margin: 380000,
				completionRate: 94,
				services804nCount: 56,
				labOrdersCount: 22,
				labOrdersCostRub: 220000,
				doctorPayrollRub: 150000,
				clinicMarginRub: 380000,
			},
			{
				doctorId: DEMO_DOCTOR_SURGEON_ID,
				name: "Д-р Громов К. Д. (Хирург-имплантолог)",
				revenue: 420000,
				appointmentsCount: 28,
				avgTicketRub: 15000,
				workedHours: 64,
				hourlyRevenueRub: 6562,
				margin: 327600,
				completionRate: 92,
				services804nCount: 38,
				labOrdersCount: 8,
				labOrdersCostRub: 45000,
				doctorPayrollRub: 92400,
				clinicMarginRub: 282600,
			},
			{
				doctorId: DEMO_DOCTOR_2_ID,
				name: "Д-р Морозова Е. И. (Ортодонт)",
				revenue: 300000,
				appointmentsCount: 64,
				avgTicketRub: 4688,
				workedHours: 96,
				hourlyRevenueRub: 3125,
				margin: 234000,
				completionRate: 95,
				services804nCount: 72,
				labOrdersCount: 6,
				labOrdersCostRub: 35000,
				doctorPayrollRub: 66000,
				clinicMarginRub: 199000,
			},
			{
				doctorId: DEMO_OWNER_ID,
				name: "Д-р Воронов М. С. (Главврач / Владелец)",
				revenue: 120000,
				appointmentsCount: 20,
				avgTicketRub: 6000,
				workedHours: 48,
				hourlyRevenueRub: 2500,
				margin: 0,
				completionRate: 90,
				services804nCount: 25,
				labOrdersCount: 0,
				labOrdersCostRub: 0,
				doctorPayrollRub: 120000,
				clinicMarginRub: 0,
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
