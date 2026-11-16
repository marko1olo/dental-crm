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
// 4. ОПРЕДЕЛЕНИЕ ТИПА ЗВОНКА
// ============================================================================

export function determineTaskCallTypeForCandidate(cand: PatientRecallRecord | PatientRecallItem): string {
	const notes = (cand.clinicalNotes || "").toLowerCase();
	if (notes.includes("удалени") || notes.includes("самочувстви") || notes.includes("контроль")) return "learn_health";
	if (notes.includes("не начат") || notes.includes("план лечения")) return "medplan_not_started";
	if (notes.includes("не завершен") || notes.includes("не закончен")) return "medplan_not_finished";
	if (cand.status === "scheduled") return "appointment_confirmation";
	if (cand.status === "declined") return "appointment_refuse";
	return "preventive_inspection";
}
