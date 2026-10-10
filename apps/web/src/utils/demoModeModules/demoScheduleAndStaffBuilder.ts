/**
 * demoScheduleAndStaffBuilder.ts
 *
 * Layer 2: Demo Showcase Schedule, Chairs and Staff Builder
 *
 * Формирует эталонный штат сотрудников для всех 5 клинических ролей
 * и непрерывную сетку приёмов на неделю (терапия, эндодонтия, ортодонтия, хирургия).
 */

import type { Appointment } from "@dental/shared";
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
} from "../demo/demoConstants.js";
import type { DemoStaffMember } from "./types.js";

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
