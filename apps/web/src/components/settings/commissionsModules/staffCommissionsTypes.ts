/**
 * staffCommissionsTypes.ts
 *
 * Канонические типы, бенчмарки и утилиты для системы комиссий персонала DENTE.
 * Отраслевые стандарты стоматологической отрасли РФ/СНГ:
 * - Терапия: 20–30% (базовый 25%)
 * - Хирургия / Имплантология: 25–35% (базовый 28%)
 * - Ортопедия: 20–25% (базовый 22%, 100% вычет ЗТЛ)
 * - Ортодонтия: 20–25% (базовый 20%)
 * - Детская стоматология: 25–30% (базовый 25%)
 * - Профгигиена / Пародонтология: 30–40% (базовый 30%)
 * - Ассистент: почасовая (400–600 ₽/час) или за визит (350–500 ₽/визит)
 * - Куратор планов лечения: процент с оплаченного плана (1.5–3%)
 *
 * Инварианты:
 * - Все финансовые расчеты строго детерминированы.
 * - Чистые стили без хардкода цветов (CSS-токены var(--paper), var(--ink)).
 */

export interface CommissionRate {
	readonly userId: string;
	readonly commissionPct: string;
	readonly materialCostDeductionPct: string;
	readonly labCostDeductionPct: string;
	readonly effectiveFrom: string;
}

export interface StaffMemberLite {
	readonly id?: string;
	readonly fullName?: string;
	readonly role?: string;
	readonly active?: boolean;
	readonly specialty?: string;
}

export type LoadState =
	| { readonly kind: "idle" }
	| { readonly kind: "loading" }
	| { readonly kind: "ready"; readonly rates: readonly CommissionRate[] }
	| { readonly kind: "failed"; readonly message: string };

export type SaveState =
	| { readonly kind: "idle" }
	| { readonly kind: "saving"; readonly userId: string }
	| { readonly kind: "failed"; readonly message: string };

export interface DoctorSpecialtyBenchmark {
	readonly id: string;
	readonly specialtyName: string;
	readonly minRatePct: number;
	readonly maxRatePct: number;
	readonly defaultRatePct: number;
	readonly labDeductionDefaultPct: number;
	readonly materialDeductionDefaultPct: number;
	readonly description: string;
}

export const DOCTOR_SPECIALTY_BENCHMARKS: readonly DoctorSpecialtyBenchmark[] = [
	{
		id: "therapy",
		specialtyName: "Терапевтическая стоматология",
		minRatePct: 20,
		maxRatePct: 30,
		defaultRatePct: 25,
		labDeductionDefaultPct: 0,
		materialDeductionDefaultPct: 0,
		description: "Лечение кариеса, эндодонтия и реставрации. Расходники списываются за счёт клиники.",
	},
	{
		id: "surgery",
		specialtyName: "Хирургия и имплантология",
		minRatePct: 25,
		maxRatePct: 35,
		defaultRatePct: 28,
		labDeductionDefaultPct: 0,
		materialDeductionDefaultPct: 0,
		description: "Удаление зубов, синус-лифтинг и имплантация. Титан и мембраны списываются клиникой.",
	},
	{
		id: "orthopedics",
		specialtyName: "Ортопедическая стоматология",
		minRatePct: 20,
		maxRatePct: 25,
		defaultRatePct: 22,
		labDeductionDefaultPct: 100,
		materialDeductionDefaultPct: 0,
		description: "Коронки, виниры и протезы. 100% вычет заказ-нарядов ЗТЛ из базы гонорара врача.",
	},
	{
		id: "orthodontics",
		specialtyName: "Ортодонтия (брекеты и элайнеры)",
		minRatePct: 20,
		maxRatePct: 25,
		defaultRatePct: 20,
		labDeductionDefaultPct: 100,
		materialDeductionDefaultPct: 0,
		description: "Длительное ведение прикуса. Стоимость сетапов элайнеров вычитается из базы расчета.",
	},
	{
		id: "pediatric",
		specialtyName: "Детская стоматология",
		minRatePct: 25,
		maxRatePct: 30,
		defaultRatePct: 25,
		labDeductionDefaultPct: 0,
		materialDeductionDefaultPct: 0,
		description: "Психологическая адаптация и лечение молочных зубов с коффердамом.",
	},
	{
		id: "hygiene",
		specialtyName: "Профгигиена и пародонтология",
		minRatePct: 30,
		maxRatePct: 40,
		defaultRatePct: 30,
		labDeductionDefaultPct: 0,
		materialDeductionDefaultPct: 0,
		description: "Ультразвуковой скейлинг, Air-Flow и Vector-терапия. Высокая маржинальность услуги.",
	},
];

export interface StaffRoleBenchmark {
	readonly roleKey: string;
	readonly title: string;
	readonly payModel: string;
	readonly typicalRate: string;
	readonly note: string;
}

export const STAFF_ROLE_BENCHMARKS: readonly StaffRoleBenchmark[] = [
	{
		roleKey: "doctor",
		title: "Врач-стоматолог",
		payModel: "Сдельная (% от кассы)",
		typicalRate: "20% – 35%",
		note: "За вычетом заказ-нарядов зуботехнической лаборатории (ЗТЛ)",
	},
	{
		roleKey: "assistant",
		title: "Ассистент врача",
		payModel: "Почасовая / За визит",
		typicalRate: "450–600 ₽/ч или 400 ₽/визит",
		note: "Фиксируется в графике смен или чекауте визита",
	},
	{
		roleKey: "treatment_coordinator",
		title: "Куратор лечения",
		payModel: "% от оплаченного плана",
		typicalRate: "1.5% – 3.0%",
		note: "Стимулирует комплексную презентацию и доходимость планов",
	},
	{
		roleKey: "receptionist",
		title: "Администратор клиники",
		payModel: "Оклад + KPI конверсии",
		typicalRate: "35 000–55 000 ₽ + 2–5%",
		note: "Премия за первичную запись и отсутствие пропущенных звонков",
	},
];

/** Преобразует ответ сервера в текст ошибки */
export function serverMessageOf(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const record = payload as { message?: unknown };
	if (typeof record.message === "string" && record.message.trim()) {
		return record.message.trim();
	}
	return null;
}

/** Валидирует и нормализует ввод процента (0..100) */
export function parseCommissionInput(raw: string): number | null {
	const normalized = raw.trim().replace(",", ".");
	if (!normalized) return null;
	const n = Number(normalized);
	if (!Number.isFinite(n) || n < 0 || n > 100) return null;
	return Math.round(n * 100) / 100;
}

/** Форматирует процент для отображения */
export function percentLabel(pct: string | number): string {
	const n = typeof pct === "number" ? pct : Number(pct);
	if (!Number.isFinite(n)) return String(pct);
	return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;
}

/** Форматирует дату начала действия ставки */
export function formatEffectiveFrom(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

/** Проверяет, является ли роль клинической (врач, главврач, владелец) */
export function isDoctorLikeRole(role: string): boolean {
	return role === "doctor" || role === "owner" || role === "head_doctor";
}
