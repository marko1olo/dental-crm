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

import type { Appointment, Patient } from "@dental/shared";

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
