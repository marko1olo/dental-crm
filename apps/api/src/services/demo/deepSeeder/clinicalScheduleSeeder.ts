/**
 * clinicalScheduleSeeder.ts — Clinical Appointments and Chair Duties Seeding (Layer 1).
 */

import { eq, sql } from "drizzle-orm";
import { appointments, communicationTasks, doctorShiftRosters } from "../../../db/schema.js";
import {
	type DbTx,
	DEMO_APPOINTMENT_1_ID,
	DEMO_APPOINTMENT_2_ID,
	DEMO_APPOINTMENT_3_ID,
	DEMO_APPOINTMENT_4_ID,
	DEMO_APPOINTMENT_5_ID,
	DEMO_APPOINTMENT_6_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "./types.js";

export interface SeedClinicalScheduleParams {
	readonly organizationId: string;
	readonly p0Id: string;
	readonly p1Id: string;
	readonly p2Id: string;
	readonly p3Id: string;
	readonly doctorUserId: string;
	readonly orthopedistUserId: string;
	readonly surgeonUserId: string;
	readonly primaryChairId: string;
	readonly chair2Id: string;
	readonly chair3Id: string;
}

/**
 * Засевает записи на приём в расписании клиники (сегодня и завтра) по креслам и врачам.
 * Также гарантирует наличие активных смен врачей (doctor_shift_rosters) на сегодня и завтра.
 */
export async function seedClinicalSchedule(
	tx: DbTx,
	params: SeedClinicalScheduleParams,
): Promise<Array<{ id: string }>> {
	const {
		organizationId,
		p0Id,
		p1Id,
		p2Id,
		p3Id,
		doctorUserId,
		orthopedistUserId,
		surgeonUserId,
		primaryChairId,
		chair2Id,
		chair3Id,
	} = params;

	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

	const now = new Date();
	const todayIso = now.toISOString().slice(0, 10);
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const tomorrowIso = tomorrow.toISOString().slice(0, 10);

	const today10 = new Date(now);
	today10.setHours(10, 0, 0, 0);
	const today1045 = new Date(today10.getTime() + 45 * 60 * 1000);

	const today1130 = new Date(now);
	today1130.setHours(11, 30, 0, 0);
	const today1230 = new Date(today1130.getTime() + 60 * 60 * 1000);

	const today1400 = new Date(now);
	today1400.setHours(14, 0, 0, 0);
	const today1500 = new Date(today1400.getTime() + 60 * 60 * 1000);

	const today1600 = new Date(now);
	today1600.setHours(16, 0, 0, 0);
	const today1730 = new Date(today1600.getTime() + 90 * 60 * 1000);

	const tomorrow10 = new Date(tomorrow);
	tomorrow10.setHours(10, 0, 0, 0);
	const tomorrow11 = new Date(tomorrow10.getTime() + 60 * 60 * 1000);

	const tomorrow12 = new Date(tomorrow);
	tomorrow12.setHours(12, 0, 0, 0);
	const tomorrow13 = new Date(tomorrow12.getTime() + 60 * 60 * 1000);

	// 1. Очищаем существующие демо-записи канонической демо-организации во избежание конфликта интервалов
	if (isCanonicalDemoOrg) {
		await tx.delete(communicationTasks).where(eq(communicationTasks.organizationId, organizationId));
		await tx.delete(appointments).where(eq(appointments.organizationId, organizationId));
	}

	// 2. Засеваем или обновляем визиты в расписании на сегодня и завтра
	const insertedAppointments = await tx
		.insert(appointments)
		.values([
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_1_ID } : {}),
				organizationId,
				patientId: p0Id,
				doctorUserId,
				chairId: primaryChairId,
				status: "in_treatment",
				startsAt: today10,
				endsAt: today1045,
				reason: "Эстетическая реставрация и эндодонтия",
				comment: "Коффердам, прицельный снимок после обтурации",
			},
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_2_ID } : {}),
				organizationId,
				patientId: p1Id,
				doctorUserId: orthopedistUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: today1130,
				endsAt: today1230,
				reason: "Примерка циркониевой коронки на винтовой фиксации",
				comment: "Проверить окклюзию и цвет A2 по шкале VITA",
			},
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_3_ID } : {}),
				organizationId,
				patientId: p2Id,
				doctorUserId,
				chairId: chair3Id,
				status: "planned",
				startsAt: today1400,
				endsAt: today1500,
				reason: "Комплексная профгигиена AirFlow и реминерализация",
				comment: "Чувствительность эмали в области шеек",
			},
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_4_ID } : {}),
				organizationId,
				patientId: p3Id,
				doctorUserId: surgeonUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: today1600,
				endsAt: today1730,
				reason: "Хирургическая имплантация Osstem TS III",
				comment: "Установка формирователя десны, анестезия Ubistesin 4%",
			},
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_5_ID } : {}),
				organizationId,
				patientId: p0Id,
				doctorUserId,
				chairId: primaryChairId,
				status: "planned",
				startsAt: tomorrow10,
				endsAt: tomorrow11,
				reason: "Обтурация корневых каналов гуттаперчей",
				comment: "Латеральная компакция, контрольная визиография",
			},
			{
				...(isCanonicalDemoOrg ? { id: DEMO_APPOINTMENT_6_ID } : {}),
				organizationId,
				patientId: p1Id,
				doctorUserId: orthopedistUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: tomorrow12,
				endsAt: tomorrow13,
				reason: "Постоянная фиксация мостовидного протеза",
				comment: "Адгезивный протокол, композитный цемент RelyX U200",
			},
		])
		.onConflictDoUpdate({
			target: appointments.id,
			set: {
				startsAt: sql`EXCLUDED.starts_at`,
				endsAt: sql`EXCLUDED.ends_at`,
				status: sql`EXCLUDED.status`,
				reason: sql`EXCLUDED.reason`,
				comment: sql`EXCLUDED.comment`,
				chairId: sql`EXCLUDED.chair_id`,
				doctorUserId: sql`EXCLUDED.doctor_user_id`,
			},
		})
		.returning({ id: appointments.id });

	// 2. Засеваем смены врачей на сегодня и завтра, чтобы сетка расписания была активна
	const shiftRows = [
		// Сегодня: терапевт
		{
			id: `shift-demo-doc1-${todayIso}`,
			organizationId,
			doctorId: doctorUserId,
			doctorName: "Д-р Соколов А. В.",
			cabinetId: "1",
			chairId: primaryChairId,
			dateIso: todayIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Терапевт",
		},
		// Сегодня: ортопед
		{
			id: `shift-demo-ortho-${todayIso}`,
			organizationId,
			doctorId: orthopedistUserId,
			doctorName: "Д-р Орлов А. В.",
			cabinetId: "2",
			chairId: chair2Id,
			dateIso: todayIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Ортопед",
		},
		// Сегодня: хирург
		{
			id: `shift-demo-surg-${todayIso}`,
			organizationId,
			doctorId: surgeonUserId,
			doctorName: "Д-р Громов К. Д.",
			cabinetId: "2",
			chairId: chair2Id,
			dateIso: todayIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Хирург-имплантолог",
		},
		// Сегодня: ортодонт
		{
			id: `shift-demo-orthodontist-${todayIso}`,
			organizationId,
			doctorId: DEMO_DOCTOR_2_ID,
			doctorName: "Д-р Морозова Е. И.",
			cabinetId: "3",
			chairId: chair3Id,
			dateIso: todayIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Ортодонт",
		},
		// Завтра: терапевт
		{
			id: `shift-demo-doc1-${tomorrowIso}`,
			organizationId,
			doctorId: doctorUserId,
			doctorName: "Д-р Соколов А. В.",
			cabinetId: "1",
			chairId: primaryChairId,
			dateIso: tomorrowIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Терапевт",
		},
		// Завтра: ортопед
		{
			id: `shift-demo-ortho-${tomorrowIso}`,
			organizationId,
			doctorId: orthopedistUserId,
			doctorName: "Д-р Орлов А. В.",
			cabinetId: "2",
			chairId: chair2Id,
			dateIso: tomorrowIso,
			startTime: "09:00",
			endTime: "21:00",
			role: "doctor",
			specialty: "Ортопед",
		},
	];

	await tx
		.insert(doctorShiftRosters)
		.values(shiftRows)
		.onConflictDoUpdate({
			target: doctorShiftRosters.id,
			set: {
				dateIso: sql`EXCLUDED.date_iso`,
				startTime: sql`EXCLUDED.start_time`,
				endTime: sql`EXCLUDED.end_time`,
				chairId: sql`EXCLUDED.chair_id`,
				cabinetId: sql`EXCLUDED.cabinet_id`,
			},
		});

	if (insertedAppointments.length === 0) {
		const existing = await tx
			.select({ id: appointments.id })
			.from(appointments)
			.where(eq(appointments.organizationId, organizationId));
		return existing;
	}

	return insertedAppointments;
}
