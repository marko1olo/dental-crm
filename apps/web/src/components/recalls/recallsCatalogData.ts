/**
 * apps/web/src/components/recalls/recallsCatalogData.ts
 *
 * SSOT Хаб профосмотров и клинических циклов вызова DENTE CRM (Мандаты 8b/8zi, 8e, 8n, 8x, 8y).
 * 5 клинических циклов: Профгигиена (6 мес), Контроль имплантов (3, 6, 12 мес),
 * Ортодонтия/ретенция (4 нед), Детская флюоризация (3 мес), Пародонтология (3-4 мес).
 * 4 рабочих статуса: «Пора приглашать», «Приглашение отправлено», «Записан на приём», «Отказ / Перенос».
 *
 * Консолидирует каталоги циклов (ранее recallCycleCatalogProphylaxis.ts, recallCycleCatalogOrtho.ts,
 * recallCycleCatalogData.ts, recallCyclePresetsConfig.ts) в единый SSOT-модуль.
 */

import { Clock, ShieldCheck, Sparkles, Users } from "lucide-react";
import type React from "react";
import type { RecallCycleDefinition, RecallCycleType } from "./recallCycleTypes.js";
import type { PatientRecallRecord, PatientRecallItem } from "./recallRecordTypes.js";
import {
	type CanonicalRecallWorkflowStatus,
	type RecallContactStatus,
	CANONICAL_RECALL_STATUS_CONFIG,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
} from "./recallCanonicalStatus.js";
import { mapRecallCandidateToRecord } from "./recallCandidateAdapter.js";

export type { RecallCycleDefinition, RecallCycleType, PatientRecallRecord, PatientRecallItem, CanonicalRecallWorkflowStatus, RecallContactStatus };
export { CANONICAL_RECALL_STATUS_CONFIG, toCanonicalRecallStatus, fromCanonicalRecallStatus, mapRecallCandidateToRecord };

// ============================================================================
// 1. КАТАЛОГИ КЛИНИЧЕСКИХ ЦИКЛОВ (PROPHYLAXIS, IMPLANTS, ORTHO, PERIO)
// ============================================================================

export const PROPHYLAXIS_RECALL_CYCLES: Readonly<Partial<Record<RecallCycleType, RecallCycleDefinition>>> = {
	standard_prophylaxis: {
		id: "standard_prophylaxis",
		title: "Плановый полугодовой осмотр и профессиональная гигиена",
		shortTitle: "Профгигиена 6 мес.",
		intervalUnit: "months",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 12],
		defaultIntervalMonths: 6,
		allowedIntervalsMonths: [6, 12],
		clinicalRationale: "Снятие зубных отложений (УЗ + Air-Flow), онкоскрининг и сохранение гарантийных обязательств.",
		targetProcedures: ["Комплексная профгигиена (Air-Flow + УЗ)", "Онкоскрининг слизистой", "Реминерализация эмали"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "success",
		estimatedAverageCheckRub: 6500,
	},
	periodontal_maintenance: {
		id: "periodontal_maintenance",
		title: "Поддерживающая пародонтальная терапия (SPT / Пародонтит)",
		shortTitle: "Пародонтология 3-4 мес.",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [3, 4],
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 4],
		clinicalRationale: "Хронический пародонтит, глубина карманов >= 4 мм, кровоточивость BOP. Поддерживающая гигиена.",
		targetProcedures: ["Пародонтальное картирование", "Поддесневой скейлинг", "Антисептическая обработка карманов"],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "warning",
		estimatedAverageCheckRub: 8500,
	},
	implant_monitoring: {
		id: "implant_monitoring",
		title: "Контрольный осмотр остеоинтеграции и имплантатов",
		shortTitle: "Импланты (1, 3, 6, 12 мес.)",
		intervalUnit: "milestone_sequence",
		defaultIntervalValue: 3,
		allowedIntervals: [1, 3, 6, 12],
		defaultIntervalMonths: 4,
		allowedIntervalsMonths: [4, 6],
		clinicalRationale: "Контроль остеоинтеграции и маргинальной кости по этапам 1, 3, 6, 12 месяцев. Профилактика периимплантита.",
		targetProcedures: ["Прицельный снимок / КЛКТ имплантатов", "Проверка окклюзии", "Гигиена супраструктур"],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "primary",
		estimatedAverageCheckRub: 9000,
	},
	pediatric_fluoridation: {
		id: "pediatric_fluoridation",
		title: "Детская профилактика, герметизация фиссур и минерализация",
		shortTitle: "Детская (3-6 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [3, 6],
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 6],
		clinicalRationale: "Несозревшая эмаль и герметизация фиссур у детей: реминерализация каждые 3–4 месяца.",
		targetProcedures: ["Окрашивание налета", "Урок гигиены", "Герметизация фиссур", "Фторирование эмали"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "accent",
		estimatedAverageCheckRub: 4200,
	},
	caries_high_risk: {
		id: "caries_high_risk",
		title: "Высокий кариесогенный риск (множественный кариес)",
		shortTitle: "Кариес-контроль (3 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [2, 3, 4],
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [2, 3, 4],
		clinicalRationale: "Активные очаги деминерализации эмали: 3-месячный цикл ремотерапии и ревизии пломб.",
		targetProcedures: ["Индексная оценка гигиены", "Глубокое фторирование", "Контроль краевого прилегания пломб"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "danger",
		estimatedAverageCheckRub: 5500,
	},
};

export const ORTHO_AND_RESTORATIVE_CYCLES: Readonly<Partial<Record<RecallCycleType, RecallCycleDefinition>>> = {
	orthodontic_braces: {
		id: "orthodontic_braces",
		title: "Ортодонтический контроль: плановая активация брекет-системы",
		shortTitle: "Брекеты (каждые 4 нед.)",
		intervalUnit: "weeks",
		defaultIntervalValue: 4,
		allowedIntervals: [3, 4, 5],
		defaultIntervalMonths: 1,
		allowedIntervalsMonths: [1],
		clinicalRationale: "Плановая смена и активация дуг, замена лигатур и эластиков каждые 4 недели (28 дней).",
		targetProcedures: ["Смена ортодонтических дуг", "Активация пружин и эластиков", "Контроль гигиены у замков"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "info",
		estimatedAverageCheckRub: 6000,
	},
	orthodontic_aligners: {
		id: "orthodontic_aligners",
		title: "Ортодонтический контроль: ревизия элайнеров и сепарация",
		shortTitle: "Элайнеры (каждые 6-8 нед.)",
		intervalUnit: "weeks",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 8],
		defaultIntervalMonths: 2,
		allowedIntervalsMonths: [2],
		clinicalRationale: "Контроль трекинга элайнеров, аттачментов и выдача следующего комплекта капп каждые 6–8 недель.",
		targetProcedures: ["Оценка трекинга капп", "Проверка аттачментов", "Выдача комплекта элайнеров"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "accent",
		estimatedAverageCheckRub: 7500,
	},
	orthodontic_retention: {
		id: "orthodontic_retention",
		title: "Ортодонтический ретенционный контроль",
		shortTitle: "Ретенция (1, 3, 6, 12 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [1, 3, 6, 12],
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [1, 3, 6, 12],
		clinicalRationale: "Контроль фиксации несъемных ретейнеров и ретенционных капп после ортолечения.",
		targetProcedures: ["Осмотр фиксации ретейнера", "Контроль окклюзии", "Очистка ретейнера"],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "info",
		estimatedAverageCheckRub: 4500,
	},
	prosthetic_check: {
		id: "prosthetic_check",
		title: "Контрольный осмотр ортопедических конструкций",
		shortTitle: "Ортопедия (6-12 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 12],
		defaultIntervalMonths: 6,
		allowedIntervalsMonths: [6, 12],
		clinicalRationale: "Контроль окклюзии, краевого прилегания коронок/виниров и состояния десны.",
		targetProcedures: ["Окклюзионный анализ", "Ревизия прилегания коронок", "Полировка керамики"],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "primary",
		estimatedAverageCheckRub: 6000,
	},
	endodontic_check: {
		id: "endodontic_check",
		title: "Контрольный осмотр и рентгенография после эндодонтии",
		shortTitle: "Эндодонтия 1 мес.",
		intervalUnit: "months",
		defaultIntervalValue: 1,
		allowedIntervals: [1, 3, 6],
		defaultIntervalMonths: 1,
		allowedIntervalsMonths: [1, 3, 6],
		clinicalRationale: "Прицельный снимок через 1 месяц после пломбирования каналов для оценки кости.",
		targetProcedures: ["Прицельная визиография", "Перкуссия и пальпация", "Оценка краевого прилегания"],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "info",
		estimatedAverageCheckRub: 2500,
	},
};

export const RECALL_CYCLE_CATALOG: Readonly<Record<RecallCycleType, RecallCycleDefinition>> = {
	...(PROPHYLAXIS_RECALL_CYCLES as Record<RecallCycleType, RecallCycleDefinition>),
	...(ORTHO_AND_RESTORATIVE_CYCLES as Record<RecallCycleType, RecallCycleDefinition>),
};

// ============================================================================
// 2. ПРЕСЕТЫ И ФИЛЬТРЫ СЕГМЕНТНОГО ПЕРЕКЛЮЧАТЕЛЯ
// ============================================================================

export interface RecallCyclePresetItem {
	readonly id: RecallCycleType | "all";
	readonly testId: string;
	readonly title: string;
	readonly labelFull: string;
	readonly labelShort: string;
	readonly icon?: React.ComponentType<{ size?: number }> | undefined;
	readonly getCountKey: (counts?: Partial<Record<RecallCycleType | "all", number>>) => number | undefined;
}

export const RECALL_CYCLE_PRESETS: readonly RecallCyclePresetItem[] = [
	{
		id: "all",
		testId: "preset-all-urgent",
		title: "Все пациенты, подошедшие к сроку",
		labelFull: "Все (срочные)",
		labelShort: "Все (срочные)",
		getCountKey: (c) => c?.all,
	},
	{
		id: "standard_prophylaxis",
		testId: "preset-hygiene-6m",
		title: "Профгигиена через 6 мес.",
		labelFull: "Профгигиена через 6 мес.",
		labelShort: "Профгигиена (6м)",
		icon: ShieldCheck,
		getCountKey: (c) => c?.standard_prophylaxis,
	},
	{
		id: "implant_monitoring",
		testId: "preset-implants-1y",
		title: "Контроль имплантации (1 год)",
		labelFull: "Контроль имплантации (1 год)",
		labelShort: "Импланты (1г)",
		icon: Sparkles,
		getCountKey: (c) => c?.implant_monitoring,
	},
	{
		id: "orthodontic_braces",
		testId: "preset-ortho-1m",
		title: "Пациенты на плановую активацию брекетов (1 мес.)",
		labelFull: "Орто-активация (1 мес.)",
		labelShort: "Орто-активация (1м)",
		icon: Clock,
		getCountKey: (c) => c?.orthodontic_braces,
	},
	{
		id: "pediatric_fluoridation",
		testId: "preset-pediatric-3m",
		title: "Детский профилактический осмотр (3-4 мес.)",
		labelFull: "Детский осмотр (3-4 мес.)",
		labelShort: "Детский осмотр (3м)",
		icon: Users,
		getCountKey: (c) => c?.pediatric_fluoridation,
	},
];

// ============================================================================
// 3. ДЕМО-ВИТРИНА И ЗАПИСИ
// ============================================================================

export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallRecord[] = Object.freeze([]);

export const DEMO_SHOWCASE_CANDIDATES: readonly PatientRecallRecord[] = Object.freeze([
	{
		id: "cand-demo-hygiene", patientId: "pat-101", fullName: "Волкова Мария Сергеевна", phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis", lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01", daysOverdue: 24, urgencyStatus: "due_now", status: "due_now", attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.", historicalRevenueRub: 18500, visitsCount: 3, clinicalNotes: "Профгигиена ультразвук + AirFlow",
	},
	{
		id: "cand-demo-implant", patientId: "pat-102", fullName: "Соколов Андрей Владимирович", phone: "+7 (925) 987-65-43",
		cycleType: "implant_monitoring", lastVisitDate: "2025-10-15",
		dueDate: "2026-04-15", daysOverdue: 15, urgencyStatus: "overdue_30", status: "due_now", attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Смирнов А.В.", historicalRevenueRub: 145000, visitsCount: 5, clinicalNotes: "Имплантат 36 Osstem, рентген-контроль стабильности",
	},
	{
		id: "cand-demo-ortho", patientId: "pat-103", fullName: "Морозов Дмитрий Павлович", phone: "+7 (903) 444-55-66",
		cycleType: "orthodontic_adjustment", lastVisitDate: "2026-04-01",
		dueDate: "2026-04-29", daysOverdue: 0, urgencyStatus: "upcoming", status: "pending", attendingDoctorId: "doc-3",
		attendingDoctorName: "Д-р Орлова А.И.", historicalRevenueRub: 92000, visitsCount: 8, clinicalNotes: "Брекет-система Damon Q, замена дуги",
	},
	{
		id: "cand-demo-pediatric", patientId: "pat-104", fullName: "Иванова Алиса Максимовна", phone: "+7 (915) 333-22-11",
		cycleType: "pediatric_fluoridation", lastVisitDate: "2026-01-10",
		dueDate: "2026-04-10", daysOverdue: 8, urgencyStatus: "due_now", status: "due_now", attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.", historicalRevenueRub: 8400, visitsCount: 2, age: 7, clinicalNotes: "Глубокое фторирование эмали молочных зубов",
	},
	{
		id: "cand-demo-perio", patientId: "pat-105", fullName: "Белов Сергей Петрович", phone: "+7 (909) 777-88-99",
		cycleType: "periodontal_maintenance", lastVisitDate: "2026-01-20",
		dueDate: "2026-04-20", daysOverdue: 5, urgencyStatus: "due_now", status: "due_now", attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Смирнов А.В.", historicalRevenueRub: 34000, visitsCount: 4, clinicalNotes: "Пародонтит средней степени, глубина карманов до 4мм",
	},
]);


// ============================================================================
// 4. ТЕЛЕФОННЫЕ И ИМЕННЫЕ УТИЛИТЫ
// ============================================================================

export function cleanPhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	let digits = phone.replace(/\D/g, "");
	return digits.length === 11 && digits.startsWith("8") ? "7" + digits.slice(1) : digits;
}
export const sanitizePhoneNumber = cleanPhoneDigits;

export function extractPatientFirstName(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	return parts.length >= 2 && parts[1] ? parts[1] : parts[0] || "Пациент";
}
export const extractFirstName = extractPatientFirstName;

export function extractPolitePatientName(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	return parts.length >= 3 && parts[1] && parts[2] ? `${parts[1]} ${parts[2]}` : (parts.length >= 2 && parts[1] ? parts[1] : parts[0] || "Пациент");
}

// ============================================================================
// 5. ДАТЫ, ПЕРИОДЫ И ТРИГГЕРЫ
// ============================================================================

export function addMonthsSafe(dateStr: string, months: number): string {
	const parts = dateStr.slice(0, 10).split("-").map(Number);
	const y = parts[0] ?? 2026, m = parts[1] ?? 1, d = parts[2] ?? 1;
	const targetMonth = m - 1 + months, targetYear = y + Math.floor(targetMonth / 12);
	const normalizedMonth = ((targetMonth % 12) + 12) % 12;
	const maxDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
	return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(d, maxDay)).padStart(2, "0")}`;
}

export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	const day = p.getDate();
	p.setDate(1);
	p.setMonth(p.getMonth() + months);
	p.setDate(Math.min(day, new Date(p.getFullYear(), p.getMonth() + 1, 0).getDate()));
	return p;
}

export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	p.setDate(p.getDate() + weeks * 7);
	return p;
}

export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	p.setDate(p.getDate() + days);
	return p;
}

export function formatIsoDateOnly(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateDaysOverdue(dueDate: Date | string, referenceDate: Date | string = new Date()): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	return Math.floor((Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()) - Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())) / 86400000);
}

export function resolveUrgencyStatus(dueDate: Date | string, referenceDate: Date | string = new Date(), isCompleted = false): string {
	if (isCompleted) return "completed";
	const days = calculateDaysOverdue(dueDate, referenceDate);
	return days < 0 ? "upcoming" : days <= 29 ? "due_now" : days <= 89 ? "overdue_30" : "overdue_90";
}

export function calculateHygieneRecallTrigger(lastCleaningDate: Date | string, customMonths = 6) {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m", intervalMonths: months, nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate), mappedCycleType: "standard_prophylaxis" as RecallCycleType,
		title: "Плановый осмотр и профессиональная гигиена",
		clinicalRationale: "Профилактический осмотр и гигиена 1 раз в 6 месяцев для здоровья десен и гарантии.",
	};
}

export function calculateImplantProstheticRecallTrigger(surgeryOrProstheticDate: Date | string, customMonths = 12) {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(surgeryOrProstheticDate, months);
	return {
		triggerType: "implant_prosthetic_12m", intervalMonths: months, nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate), mappedCycleType: "implant_monitoring" as RecallCycleType,
		title: "Контрольный осмотр имплантации и коронок",
		clinicalRationale: "Ежегодный рентген-контроль и оценка стабильности остеоинтеграции по протоколам СтАР/ITI.",
	};
}

export function calculateOrthoActivationRecallTrigger(lastAdjustmentDate: Date | string, customWeeks = 4) {
	const weeks = customWeeks > 0 ? customWeeks : 4;
	const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
	return {
		triggerType: "ortho_activation_1m", intervalWeeks: weeks, intervalMonths: 1, nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate), mappedCycleType: "orthodontic_braces" as RecallCycleType,
		title: "Плановая активация аппаратуры",
		clinicalRationale: "Коррекция дуг брекет-системы или выдача очередной пары элайнеров каждые 4 недели.",
	};
}

export function calculatePediatricRecallTrigger(lastVisitDate: Date | string, intervalMonths: 3 | 4 = 3) {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m", intervalMonths: months, nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate), mappedCycleType: "pediatric_fluoridation" as RecallCycleType,
		title: `Детский профилактический осмотр (${months} мес.)`,
		clinicalRationale: "Мониторинг незрелой эмали и своевременная реминерализующая терапия у детей.",
	};
}

export function evaluateClinicalRecallTrigger(params: { lastVisitDate?: Date | string; isChildUnder14?: boolean; hasBraces?: boolean; hasImplants?: boolean }) {
	const lastDate = params.lastVisitDate ?? new Date();
	if (params.isChildUnder14) return calculatePediatricRecallTrigger(lastDate, 3);
	if (params.hasBraces) return calculateOrthoActivationRecallTrigger(lastDate);
	if (params.hasImplants) return calculateImplantProstheticRecallTrigger(lastDate);
	return calculateHygieneRecallTrigger(lastDate);
}

export function resolveCandidateTriggerType(cand: PatientRecallRecord): string {
	if (cand.age !== undefined && cand.age < 14) return "pediatric_3_4m";
	const ct = String(cand.cycleType || "");
	if (ct.includes("pediatric")) return "pediatric_3_4m";
	if (ct.includes("ortho")) return "ortho_activation_1m";
	if (ct.includes("implant") || ct.includes("prosthetic")) return "implant_prosthetic_12m";
	return "hygiene_6m";
}

// ============================================================================
// 6. СООБЩЕНИЯ (WHATSAPP, TELEGRAM, SMS)
// ============================================================================

export const buildWhatsAppUrl = (phone: string, text: string) => `https://wa.me/${cleanPhoneDigits(phone)}?text=${encodeURIComponent(text)}`;
export const buildTelegramUrl = (phone: string, text: string) => `https://t.me/+${cleanPhoneDigits(phone)}?text=${encodeURIComponent(text)}`;

export function generatePdnProtectedRecallMessage(cand: PatientRecallRecord | PatientRecallItem, options?: { clinicName?: string }): string {
	return `Здравствуйте, ${extractPolitePatientName(cand.fullName)}! В клинике ${options?.clinicName || "Стоматология ДЕНТЕ"} подошел срок контрольного осмотра. Доктор рекомендует выбрать удобное время для визита. Записаться: +7 (495) 000-00-00.`;
}

export function generateWhatsAppRecallMessage(cand: PatientRecallRecord | PatientRecallItem, options?: { clinicName?: string; baseUrl?: string }): string {
	const clinic = options?.clinicName || "Стоматология ДЕНТЕ";
	const firstName = extractFirstName(cand.fullName);
	const category = "category" in cand ? cand.category : undefined;
	const cycleType = "cycleType" in cand ? cand.cycleType : undefined;
	const ct = String(cycleType || category || "");
	const purpose = (category === "implants" || ct.includes("implant"))
		? "на контрольный осмотр имплантатов"
		: (category === "orthodontics" || ct.includes("ortho"))
		? "на ортодонтический контроль и ревизию ретейнеров"
		: ct.includes("pediatric")
		? "на детский профилактический осмотр"
		: ct.includes("perio")
		? "на пародонтологический осмотр"
		: "на плановый профилактический осмотр";
	const docPart = cand.attendingDoctorName ? ` Ваш лечащий врач ${cand.attendingDoctorName} рекомендует сохранить здоровье улыбки.` : " Доктор рекомендует сохранить здоровье улыбки.";
	const visitPart = cand.lastVisitDate ? ` Дата прошлого визита: ${cand.lastVisitDate}.` : "";
	return `Здравствуйте, ${firstName}! Напоминаем, что подошел срок записаться в ${clinic} ${purpose}.${docPart}${visitPart} Запись: ${options?.baseUrl || "https://dente.clinic/b"}/${cand.patientId || "pat"}`;
}

export function generateTelegramRecallMessage(cand: PatientRecallRecord | PatientRecallItem, options?: { clinicName?: string; baseUrl?: string }): string {
	const clinic = options?.clinicName || "Стоматология ДЕНТЕ";
	const firstName = extractFirstName(cand.fullName);
	const category = "category" in cand ? cand.category : undefined;
	const cycleType = "cycleType" in cand ? cand.cycleType : undefined;
	const ct = String(cycleType || category || "");
	const purpose = (category === "implants" || ct.includes("implant"))
		? "на контрольный осмотр имплантатов"
		: (category === "orthodontics" || ct.includes("ortho"))
		? "на ортодонтический контроль и ревизию ретейнеров"
		: ct.includes("pediatric")
		? "на детский профилактический осмотр"
		: "на плановый профилактический осмотр";
	const docPart = cand.attendingDoctorName ? ` Врач: ${cand.attendingDoctorName}.` : "";
	return `Здравствуйте, ${firstName}! В клинике ${clinic} подошел срок записаться ${purpose}.${docPart} Запись: ${options?.baseUrl || "https://dente.clinic/b"}/${cand.patientId || "pat"}`;
}

export function generateSmsRecallMessage(cand: PatientRecallRecord | PatientRecallItem, options?: { clinicName?: string; baseUrl?: string }): string {
	return `${extractFirstName(cand.fullName)}, прошло 6 мес с визита в ${options?.clinicName || "ДЕНТЕ"}. Запись: ${options?.baseUrl || "https://dente.clinic/b"}/${cand.patientId || "pat"}`;
}

export function buildRecallMessageContent(cand: PatientRecallRecord | PatientRecallItem, channel: "whatsapp" | "telegram" | "sms", clinicName = "ДЕНТЕ"): string {
	if (channel === "sms") return generateSmsRecallMessage(cand, { clinicName });
	if (channel === "telegram") return generateTelegramRecallMessage(cand, { clinicName });
	return generateWhatsAppRecallMessage(cand, { clinicName });
}

// ============================================================================
// 7. СЕГМЕНТАЦИЯ SMS (GSM-7 / UCS-2)
// ============================================================================

export interface SmsSegmentCalculation {
	characterCount: number; segmentCount: number; encoding: "GSM-7" | "UCS-2";
	charsPerSegment: number; remainingInCurrentSegment: number; maxCharsInCurrentSegment: number; isMultipart: boolean;
}

export function calculateSmsSegments(text: string): SmsSegmentCalculation {
	const len = text.length;
	const isCyrillic = /[а-яёА-ЯЁ]/i.test(text);
	const encoding = isCyrillic ? "UCS-2" : "GSM-7";
	if (len === 0) return { characterCount: 0, segmentCount: 0, encoding, charsPerSegment: isCyrillic ? 70 : 160, remainingInCurrentSegment: isCyrillic ? 70 : 160, maxCharsInCurrentSegment: isCyrillic ? 70 : 160, isMultipart: false };
	if (!isCyrillic) {
		if (len <= 160) return { characterCount: len, segmentCount: 1, encoding: "GSM-7", charsPerSegment: 160, remainingInCurrentSegment: 160 - len, maxCharsInCurrentSegment: 160, isMultipart: false };
		const segmentCount = Math.ceil(len / 153);
		return { characterCount: len, segmentCount, encoding: "GSM-7", charsPerSegment: 153, remainingInCurrentSegment: segmentCount * 153 - len, maxCharsInCurrentSegment: segmentCount * 153, isMultipart: true };
	}
	if (len <= 70) return { characterCount: len, segmentCount: 1, encoding: "UCS-2", charsPerSegment: 70, remainingInCurrentSegment: 70 - len, maxCharsInCurrentSegment: 70, isMultipart: false };
	const segmentCount = Math.ceil(len / 67);
	return { characterCount: len, segmentCount, encoding: "UCS-2", charsPerSegment: 67, remainingInCurrentSegment: segmentCount * 67 - len, maxCharsInCurrentSegment: segmentCount * 67, isMultipart: true };
}

export function formatSmsSummary(calc: SmsSegmentCalculation): string {
	return calc.characterCount === 0 ? "0 символов • 0 SMS" : `${calc.characterCount} симв., ${calc.segmentCount} SMS (${calc.encoding})`;
}

// ============================================================================
// 8. АДАПТЕРЫ И ВЫЗОВЫ API
// ============================================================================


export async function sendRecallCandidateInvite(params: { patientId: string; channel: string; body: string }, headers?: Record<string, string>): Promise<{ ok: boolean; outboxId?: string; duplicate?: boolean; message: string }> {
	const res = await fetch("/api/recalls/invite", { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(params) });
	return res.ok ? res.json() : { ok: false, message: `Ошибка: HTTP ${res.status}` };
}

export async function updateRecallCandidateStatus(patientId: string, status: string, headers?: Record<string, string>): Promise<{ ok: boolean }> {
	const res = await fetch(`/api/patients/recall-candidates/${patientId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify({ status }) });
	return { ok: res.ok };
}

export function determineTaskCallTypeForCandidate(cand: PatientRecallRecord | PatientRecallItem): string {
	const notes = (cand.clinicalNotes || "").toLowerCase();
	if (notes.includes("удалени") || notes.includes("самочувстви") || notes.includes("контроль")) return "learn_health";
	if (notes.includes("не начат") || notes.includes("план лечения")) return "medplan_not_started";
	if (notes.includes("не завершен") || notes.includes("не закончен")) return "medplan_not_finished";
	if (cand.status === "scheduled") return "appointment_confirmation";
	if (cand.status === "declined") return "appointment_refuse";
	return "preventive_inspection";
}
