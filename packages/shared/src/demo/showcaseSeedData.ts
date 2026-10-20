/**
 * packages/shared/src/demo/showcaseSeedData.ts
 *
 * DENTE Dental CRM — Exhibition Showcase Seed Data Generator.
 * (MANDATES: 8c, 8e, 8k, 8n, 8y, Order 1094n, FDI Federation Dentaire Internationale)
 *
 * Provides realistic, photo-ready, high-fidelity demonstration datasets for
 * marketing videos, screencasts, Telegram channels, and live exhibitions.
 */

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
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
} from "./demoConstants.js";

export interface ShowcaseDoctor {
	readonly id: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly shortName: string;
	readonly role: "doctor" | "owner" | "administrator";
	readonly specialization: string;
	readonly experienceYears: number;
	readonly avatarUrl: string;
	readonly color: string;
	readonly phone: string;
	readonly email: string;
}

export interface ShowcasePatient {
	readonly id: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly birthDate: string;
	readonly gender: "male" | "female";
	readonly balanceRub: number;
	readonly allergies: readonly string[];
	readonly somaticDiseases: readonly string[];
	readonly notes: string;
}

export interface ShowcaseEstimateItem {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly toothNumber?: number | null;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub: number;
	readonly totalRub: number;
}

export interface ShowcaseEstimate {
	readonly id: string;
	readonly token: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly title: string;
	readonly status: "pending" | "viewed" | "accepted" | "rejected";
	readonly createdAt: string;
	readonly expiresAt: string;
	readonly totalRub: number;
	readonly totalPriceRub?: number;
	readonly discountRub: number;
	readonly netTotalRub: number;
	readonly items: readonly ShowcaseEstimateItem[];
}

export interface ShowcasePrescriptionPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly categoryRu: string;
	readonly badgeRu: string;
	readonly medications: readonly {
		readonly tradeName: string;
		readonly activeSubstance: string;
		readonly latinRp: string;
		readonly form: string;
		readonly dosage: string;
		readonly quantity: string;
		readonly signa: string;
	}[];
}

export interface ShowcaseCopilotTask {
	readonly id: string;
	readonly type: "recall" | "pending_estimate" | "unscheduled_care";
	readonly priority: "high" | "normal";
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly title: string;
	readonly subtitle: string;
	readonly amountRub?: number;
	readonly dueDate: string;
	readonly suggestedAction: "call" | "whatsapp" | "book_slot";
}

/**
 * 1. Реалистичный штаб врачей клиники с профессиональными аватарами и специализациями
 */
export const SHOWCASE_DOCTORS: readonly ShowcaseDoctor[] = [
	{
		id: DEMO_DOCTOR_1_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Соколов Андрей Владимирович",
		shortName: "Соколов А. В.",
		role: "doctor",
		specialization: "Стоматолог-терапевт, эндодонтист",
		experienceYears: 14,
		avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
		color: "var(--teal, #0d9488)",
		phone: "+7 916 111-22-33",
		email: "sokolov@dente-clinic.ru",
	},
	{
		id: DEMO_DOCTOR_SURGEON_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Громов Кирилл Дмитриевич",
		shortName: "Громов К. Д.",
		role: "doctor",
		specialization: "Хирург-имплантолог, челюстно-лицевой хирург",
		experienceYears: 18,
		avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
		color: "var(--danger, #ef4444)",
		phone: "+7 916 333-44-55",
		email: "gromov@dente-clinic.ru",
	},
	{
		id: DEMO_DOCTOR_ORTHOPEDIST_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Орлов Артем Васильевич",
		shortName: "Орлов А. В.",
		role: "doctor",
		specialization: "Стоматолог-ортопед, гнатолог",
		experienceYears: 12,
		avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
		color: "var(--brand-accent, #6366f1)",
		phone: "+7 916 111-88-99",
		email: "orlov@dente-clinic.ru",
	},
	{
		id: DEMO_DOCTOR_2_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Морозова Елена Игоревна",
		shortName: "Морозова Е. И.",
		role: "doctor",
		specialization: "Стоматолог-ортодонт",
		experienceYears: 9,
		avatarUrl: "https://images.unsplash.com/photo-1594824813576-47b1c4e95d90?w=150&auto=format&fit=crop&q=80",
		color: "var(--accent, #8b5cf6)",
		phone: "+7 916 222-33-44",
		email: "morozova@dente-clinic.ru",
	},
	{
		id: DEMO_OWNER_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Воронов Михаил Сергеевич",
		shortName: "Воронов М. С.",
		role: "owner",
		specialization: "Главный врач клиники",
		experienceYears: 22,
		avatarUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80",
		color: "var(--gold, #f59e0b)",
		phone: "+7 916 444-55-66",
		email: "owner@dente-clinic.ru",
	},
];

/**
 * 2. Эталонные пациенты со стоматологическим анамнезом
 */
export const SHOWCASE_PATIENTS: readonly ShowcasePatient[] = [
	{
		id: DEMO_PATIENT_1_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Смирнова Анна Сергеевна",
		phone: "+7 916 234-56-78",
		birthDate: "1988-04-12",
		gender: "female",
		balanceRub: 15000,
		allergies: ["Лидокаин (отёк Квинке в анамнезе)", "Пенициллины (Амоксиклав — крапивница)"],
		somaticDiseases: ["Артериальная гипертензия 1 ст."],
		notes: "Первичный терапевтический осмотр, кариес 16, пломба 24, пульпит 36. ВНИМАНИЕ: Аллергия на Лидокаин!",
	},
	{
		id: DEMO_PATIENT_2_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Воронов Дмитрий Игоревич",
		phone: "+7 925 876-54-32",
		birthDate: "1979-09-25",
		gender: "male",
		balanceRub: -4500,
		allergies: ["Пенициллины"],
		somaticDiseases: ["Гипертоническая болезнь 1 ст."],
		notes: "Ортопедический приём: коронка ZrO2 Prettau на зуб 11, заказ в ЗТЛ.",
	},
	{
		id: DEMO_PATIENT_3_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Ковалева Елена Павловна",
		phone: "+7 903 555-44-33",
		birthDate: "1995-11-03",
		gender: "female",
		balanceRub: 35000,
		allergies: [],
		somaticDiseases: [],
		notes: "Ортодонтическое лечение: элайнеры Spark (капа 8 из 24), контроль аттачментов.",
	},
	{
		id: DEMO_PATIENT_4_ID,
		organizationId: DEMO_SHOWCASE_ORG_ID,
		fullName: "Кузнецов Михаил Викторович",
		phone: "+7 915 999-88-77",
		birthDate: "1965-06-18",
		gender: "male",
		balanceRub: 0,
		allergies: [],
		somaticDiseases: ["Сахарный диабет 2 типа (компенсированный, HbA1c 6.2%)"],
		notes: "Хирургический приём: имплантация Straumann BLX 4.5x10 в области 4.6.",
	},
];

/**
 * 3. Эталонная смета на имплантацию под ключ для демонстрации удаленного подписания
 */
export const SHOWCASE_IMPLANT_ESTIMATE: ShowcaseEstimate = {
	id: "01a00000-0000-0000-0005-000000000001",
	token: "straumann-blx-46-demo",
	patientId: DEMO_PATIENT_4_ID,
	patientName: "Кузнецов Михаил Викторович",
	doctorId: DEMO_DOCTOR_SURGEON_ID,
	doctorName: "Д-р Громов К. Д.",
	title: "Комплексная имплантация и протезирование зуба 4.6",
	status: "pending",
	createdAt: new Date().toISOString(),
	expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
	totalRub: 98000,
	totalPriceRub: 98000,
	discountRub: 8000,
	netTotalRub: 90000,
	items: [
		{
			id: "item-1",
			code: "A16.07.054",
			title: "Операция дентальной имплантации Straumann BLX (Швейцария)",
			toothNumber: 46,
			quantity: 1,
			priceRub: 55000,
			discountRub: 5000,
			totalRub: 50000,
		},
		{
			id: "item-2",
			code: "A16.07.054.001",
			title: "Установка формирователя десны Straumann",
			toothNumber: 46,
			quantity: 1,
			priceRub: 12000,
			discountRub: 1000,
			totalRub: 11000,
		},
		{
			id: "item-3",
			code: "A16.07.004",
			title: "Индивидуальный циркониевый абатмент на винтовой фиксации",
			toothNumber: 46,
			quantity: 1,
			priceRub: 14000,
			discountRub: 1000,
			totalRub: 13000,
		},
		{
			id: "item-4",
			code: "A16.07.004.002",
			title: "Коронка из диоксида циркония Prettau с нанесением керамики",
			toothNumber: 46,
			quantity: 1,
			priceRub: 17000,
			discountRub: 1000,
			totalRub: 16000,
		},
	],
};

/**
 * 4. Рецептурные комплекты по Приказу Минздрава 1094н
 */
export const SHOWCASE_PRESCRIPTION_PRESET: ShowcasePrescriptionPreset = {
	id: "post_extraction_implant",
	titleRu: "Комплект после удаления / имплантации",
	categoryRu: "Хирургический протокол",
	badgeRu: "Хирургия / 1-клик",
	medications: [
		{
			tradeName: "Амоксиклав (875+125 мг)",
			activeSubstance: "Амоксициллин + Клавулановая кислота",
			latinRp: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg N. 14",
			form: "таблетки диспергируемые",
			dosage: "875/125 мг",
			quantity: "N. 14",
			signa: "По 1 таблетке 2 раза в сутки во время еды в течение 7 дней.",
		},
		{
			tradeName: "Нимесил (100 мг)",
			activeSubstance: "Нимесулид",
			latinRp: "Rp.: Gran. Nimesulidi 100 mg N. 9",
			form: "гранулы для суспензии",
			dosage: "100 мг",
			quantity: "N. 9",
			signa: "По 1 пакетику 2 раза в день после еды при болях, курс до 4 дней.",
		},
		{
			tradeName: "Хлоргексидин 0.05%",
			activeSubstance: "Хлоргексидина биглюконат",
			latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
			form: "раствор для местного применения",
			dosage: "0.05%",
			quantity: "1 флакон",
			signa: "Ротовые ванночки по 1 минуте 3 раза в день после чистки зубов.",
		},
	],
};

/**
 * 5. Оперативные задачи смены для шторки DENTA Copilot
 */
export const SHOWCASE_COPILOT_TASKS: readonly ShowcaseCopilotTask[] = [
	{
		id: "task-rec-1",
		type: "recall",
		priority: "high",
		patientId: DEMO_PATIENT_1_ID,
		patientName: "Смирнова Анна Сергеевна",
		patientPhone: "+7 916 234-56-78",
		doctorId: DEMO_DOCTOR_1_ID,
		doctorName: "Д-р Соколов А. В.",
		title: "Просрочен плановый осмотр и гигиена (прошло 6 мес)",
		subtitle: "Последний визит был 12 октября 2025 г.",
		dueDate: "Сегодня",
		suggestedAction: "whatsapp",
	},
	{
		id: "task-est-1",
		type: "pending_estimate",
		priority: "high",
		patientId: DEMO_PATIENT_4_ID,
		patientName: "Кузнецов Михаил Викторович",
		patientPhone: "+7 915 999-88-77",
		doctorId: DEMO_DOCTOR_SURGEON_ID,
		doctorName: "Д-р Громов К. Д.",
		title: "Смета на имплантацию ожидает решения (98 000 ₽)",
		subtitle: "Отправлена 3 дня назад, просмотрена пациентом",
		amountRub: 98000,
		dueDate: "В работе",
		suggestedAction: "call",
	},
	{
		id: "task-rec-2",
		type: "recall",
		priority: "normal",
		patientId: DEMO_PATIENT_3_ID,
		patientName: "Ковалева Елена Павловна",
		patientPhone: "+7 903 555-44-33",
		doctorId: DEMO_DOCTOR_2_ID,
		doctorName: "Д-р Морозова Е. И.",
		title: "Ортодонтический контроль элайнеров Spark (капа 8/24)",
		subtitle: "Контроль динамики перемещения и выдача следующего комплекта капп",
		dueDate: "Завтра, 14:00",
		suggestedAction: "book_slot",
	},
];
