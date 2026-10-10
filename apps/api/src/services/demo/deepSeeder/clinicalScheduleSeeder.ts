/**
 * clinicalScheduleSeeder.ts — Clinical Appointments and Chair Duties Seeding (Layer 1).
 */

import { appointments } from "../../../db/schema.js";
import type { DbTx } from "./types.js";

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

	const now = new Date();
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

	const tomorrow10 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow10.setHours(10, 0, 0, 0);
	const tomorrow11 = new Date(tomorrow10.getTime() + 60 * 60 * 1000);

	const tomorrow12 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow12.setHours(12, 0, 0, 0);
	const tomorrow13 = new Date(tomorrow12.getTime() + 60 * 60 * 1000);

	const insertedAppointments = await tx
		.insert(appointments)
		.values([
			{
				organizationId,
				patientId: p0Id,
				doctorUserId,
				chairId: primaryChairId,
				status: "completed",
				startsAt: today10,
				endsAt: today1045,
				reason: "Эстетическая реставрация и эндодонтия",
				comment: "Коффердам, прицельный снимок после обтурации",
			},
			{
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
		.onConflictDoNothing()
		.returning({ id: appointments.id });

	return insertedAppointments;
}
