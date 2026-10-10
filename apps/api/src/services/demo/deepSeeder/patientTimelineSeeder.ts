/**
 * patientTimelineSeeder.ts — Patient Demographics, Tooth States, SOAP 043/u Diaries, and Treatment Plans (Layer 1).
 */

import { eq } from "drizzle-orm";
import {
	patients,
	toothStates,
	treatmentPlanStages,
	treatmentPlans,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import {
	type DbTx,
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "./types.js";

export interface DemoPatientsBundle {
	allPatients: Array<{ id: string; fullName: string }>;
	p0: { id: string; fullName: string };
	p1: { id: string; fullName: string };
	p2: { id: string; fullName: string };
	p3: { id: string; fullName: string };
}

/**
 * Инициализирует 4 демо-пациента клиники или возвращает существующие записи.
 */
export async function seedDemoPatients(
	tx: DbTx,
	organizationId: string,
): Promise<DemoPatientsBundle | null> {
	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

	const demoPatientsList = [
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_1_ID } : {}),
			organizationId,
			fullName: "Иванов Алексей Сергеевич",
			phone: "+7 (912) 345-67-89",
			birthDate: "1988-04-12",
			notes: "Первичный терапевтический осмотр, жалоба на чувствительность 1.6",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_2_ID } : {}),
			organizationId,
			fullName: "Смирнова Елена Викторовна",
			phone: "+7 (927) 876-54-32",
			birthDate: "1994-09-23",
			notes: "Ортопедический приём: коронка ZrO2 Prettau на зуб 11, заказ в ЗТЛ",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_3_ID } : {}),
			organizationId,
			fullName: "Кузнецов Дмитрий Павлович",
			phone: "+7 (903) 555-43-21",
			birthDate: "1979-11-05",
			notes: "Ортодонтическое лечение: элайнеры (капа 12 из 30), контроль аттачментов",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_4_ID } : {}),
			organizationId,
			fullName: "Морозова Анна Дмитриевна",
			phone: "+7 (987) 654-32-10",
			birthDate: "2001-02-18",
			notes: "Хирургический приём: имплантация Straumann BLX 4.5x10 в области 4.6",
			status: "active" as const,
		},
	];

	const insertedPatients = await tx
		.insert(patients)
		.values(demoPatientsList)
		.onConflictDoNothing()
		.returning({ id: patients.id, fullName: patients.fullName });

	const allPatients =
		insertedPatients.length >= 4
			? insertedPatients
			: await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(eq(patients.organizationId, organizationId))
					.limit(4);

	const [p0, p1, p2, p3] = allPatients;
	if (!p0 || !p1 || !p2 || !p3) {
		return null;
	}

	return { allPatients, p0, p1, p2, p3 };
}

/**
 * Засевает зубные формулы (одонтограммы) для пациентов кейсов терапии, ортопедии и хирургии.
 */
export async function seedPatientToothStates(
	tx: DbTx,
	organizationId: string,
	p0Id: string,
	p1Id: string,
	p3Id: string,
): Promise<void> {
	await tx
		.insert(toothStates)
		.values([
			// Пациент 1 (Терапия)
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 16,
				state: "caries",
				surfaces: ["M", "O", "D"],
				notes: "Глубокий кариес дентина (K02.1)",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 24,
				state: "filling",
				surfaces: ["O"],
				notes: "Световая пломба Ceram.x Spectra ST (Z96.5)",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 36,
				state: "pulpitis",
				surfaces: ["M", "O"],
				notes: "Острый необратимый пульпит (K04.0)",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 18,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 28,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 38,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0Id,
				toothNumber: 48,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			// Пациент 2 (Ортопедия)
			{
				organizationId,
				patientId: p1Id,
				toothNumber: 11,
				state: "crown",
				notes: "Коронка из диоксида циркония (ZrO2 Prettau), наряд ЗТЛ",
			},
			{
				organizationId,
				patientId: p1Id,
				toothNumber: 12,
				state: "filling",
				surfaces: ["V"],
				notes: "Керамический винир E.max",
			},
			{
				organizationId,
				patientId: p1Id,
				toothNumber: 21,
				state: "filling",
				surfaces: ["V"],
				notes: "Керамический винир E.max",
			},
			// Пациент 4 (Хирургия)
			{
				organizationId,
				patientId: p3Id,
				toothNumber: 46,
				state: "implant",
				notes: "Имплантат Straumann BLX 4.5x10, формирователь десны",
			},
		])
		.onConflictDoNothing();
}

/**
 * Засевает завершенный визит и медицинский дневник Форма 043/у (SOAP-протокол).
 */
export async function seedPatientVisitAndDiary(
	tx: DbTx,
	organizationId: string,
	p0Id: string,
	appointmentId: string,
	doctorUserId: string,
): Promise<string | undefined> {
	const [createdVisit] = await tx
		.insert(visits)
		.values({
			organizationId,
			patientId: p0Id,
			appointmentId,
			status: "signed",
		})
		.onConflictDoNothing()
		.returning({ id: visits.id });

	if (!createdVisit) {
		return undefined;
	}

	await tx
		.insert(visitDiaries)
		.values({
			organizationId,
			visitId: createdVisit.id,
			patientId: p0Id,
			doctorId: doctorUserId,
			authorId: doctorUserId,
			anamnesis:
				"Пациент обратился с жалобами на кратковременные боли от сладкого и холодного в области зуба 1.6. " +
				"Полость заметил около 2 месяцев назад. Аллергоанамнез не отягощен, соматически здоров.",
			statusLocalis:
				"На окклюзионной и контактных поверхностях зуба 1.6 глубокая кариозная полость, " +
				"выполненная размягченным дентином. Зондирование дна чувствительно. Термопроба положительна, кратковременна. " +
				"Перкуссия безболезненна. Слизистая в норме.",
			diagnosisIcd10: "K02.1 Кариес дентина",
			diagnosisTooth: "16",
			treatmentDescription:
				"Инфильтрационная анестезия Sol. Articaini 4% 1.7 мл. Изоляция системой коффердам. " +
				"Препарирование полости зуба 1.6, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. " +
				"Лечебная подкладка МТА, изолирующая прокладка СИЦ. Адгезивный протокол OptiBond FL. " +
				"Послойная анатомическая реставрация композитом Ceram.x Spectra ST A2, A3. Полировка Sof-Lex.",
			content:
				"Первичный прием врача-стоматолога терапевта. Успешное терапевтическое лечение глубокого кариеса зуба 1.6.",
			isLocked: true,
			lockedAt: new Date(),
			lockedByUserId: doctorUserId,
		})
		.onConflictDoNothing();

	return createdVisit.id;
}

/**
 * Засевает утвержденный комплексный план санации полости рта и его этапы.
 */
export async function seedPatientTreatmentPlan(
	tx: DbTx,
	organizationId: string,
	p0: { id: string; fullName: string },
	doctorUserId: string,
): Promise<string | undefined> {
	const [createdPlan] = await tx
		.insert(treatmentPlans)
		.values({
			organizationId,
			patientId: p0.id,
			doctorId: doctorUserId,
			title: "Комплексный план санации полости рта",
			name: "Комплексный план санации полости рта",
			status: "Active",
			totalPriceRub: "18500.00",
			totalPrice: "18500.00",
			approvedAt: new Date(),
		})
		.onConflictDoNothing()
		.returning({ id: treatmentPlans.id, title: treatmentPlans.title });

	if (createdPlan) {
		await tx
			.insert(treatmentPlanStages)
			.values({
				organizationId,
				patientName: p0.fullName,
				planTitle: createdPlan.title,
				stageOrder: 1,
				stageName: "Терапевтическая санация (лечение кариеса 1.6 и пульпита 3.6)",
				completionPercentage: 50,
				autoArchived: false,
			})
			.onConflictDoNothing();
		return createdPlan.id;
	}

	return undefined;
}
