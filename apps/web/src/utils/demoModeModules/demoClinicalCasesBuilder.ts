/**
 * demoClinicalCasesBuilder.ts
 *
 * Layer 2: Demo Showcase Clinical Cases and Patients Registry Builder
 *
 * Формирует эталонную клиническую картотеку пациентов (форма 043/у)
 * с анамнезом, аллергиями, соматическим статусом и реестр демонстрационных лидов.
 */

import type { Patient } from "@dental/shared";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { DEMO_SHOWCASE_ORG_ID } from "../demo/demoConstants.js";

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
 * Образцовый реестр демонстрационных лидов CRM.
 */
export function getDemoShowcaseLeads() {
	const freshIso = new Date(Date.now() - 3 * 60_000).toISOString();
	return [
		{
			id: "demo-lead-1",
			name: "Белова Марина Сергеевна",
			phone: "+7 (916) 440-18-92",
			source: "Яндекс.Директ",
			status: "new" as const,
			expectedRevenue: "145000",
			notes: "Консультация по имплантации в области 36, 37 зубов, есть КЛКТ",
			clinicalTags: ["Имплантация", "КЛКТ"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-2",
			name: "Ковалёв Денис Игоревич",
			phone: "+7 (925) 712-30-45",
			source: "2ГИС",
			status: "new" as const,
			expectedRevenue: "18500",
			notes: "Чувствительность на холодное, зуб 25, просит окно на вечер",
			clinicalTags: ["Терапия"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-3",
			name: "Романова Алина Викторовна",
			phone: "+7 (903) 558-91-14",
			source: "ПроДокторов",
			status: "contacted" as const,
			expectedRevenue: "220000",
			notes: "Эстетическая реабилитация (виниры E.max в зоне улыбки), согласует дату",
			clinicalTags: ["Ортопедия E.max"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-4",
			name: "Захаров Павел Андреевич",
			phone: "+7 (985) 304-77-61",
			source: "Сайт / SEO",
			status: "contacted" as const,
			expectedRevenue: "42000",
			notes: "Удаление ретинированного 48 зуба + седация",
			clinicalTags: ["Хирургия"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-5",
			name: "Ларионова Ольга Николаевна",
			phone: "+7 (915) 882-09-33",
			source: "Рекомендации",
			status: "consult_booked" as const,
			expectedRevenue: "180000",
			notes: "Записана к д-ру Орлову А. В. на комплексную консультацию и фотопротокол",
			clinicalTags: ["Тотальное протезирование"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-6",
			name: "Сафонов Тимур Русланович",
			phone: "+7 (926) 619-42-80",
			source: "Яндекс.Директ",
			status: "consult_booked" as const,
			expectedRevenue: "95000",
			notes: "Консультация ортодонта (элайнеры), направлен на ОПТГ",
			clinicalTags: ["Ортодонтия"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-7",
			name: "Крылова Екатерина Дмитриевна",
			phone: "+7 (905) 231-64-19",
			source: "ПроДокторов",
			status: "showed_up" as const,
			expectedRevenue: "310000",
			notes: "План лечения согласован (2 имплантата Straumann + коронки ZrO2), внесён аванс",
			clinicalTags: ["Имплантация", "План согласован"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
		{
			id: "demo-lead-8",
			name: "Мельников Артём Олегович",
			phone: "+7 (916) 904-11-58",
			source: "2ГИС",
			status: "showed_up" as const,
			expectedRevenue: "28500",
			notes: "Проведена профгигиена AirFlow и лечение кариеса 16 зуба",
			clinicalTags: ["Санация"],
			createdAt: freshIso,
			stageEnteredAt: freshIso,
		},
	];
}
