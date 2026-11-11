/**
 * apps/api/src/routes/portal/kiosk/kioskPatientLookupHandlers.ts
 *
 * Обработчики поиска пациента и приёма для терминала самообслуживания (Kiosk)
 * (Мандат 8n: Суверенитет соло-врача и малой клиники, 0 бюрократии, быстрый чекин).
 */

import { and, eq, gte, lt, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	organizations,
	patients,
	users,
} from "../../../db/schema.js";

export interface SelfCheckinBody {
	organizationId?: unknown;
	phoneLast4?: unknown;
	patientPhone?: unknown;
	patientId?: unknown;
	checkinCode?: unknown;
	signedConsents?: unknown;
	somaticProfile?: unknown;
	isEmergency?: unknown;
	emergencyChiefComplaint?: unknown;
	isFirstTime?: unknown;
	patientFullName?: unknown;
	kioskMode?: unknown;
}

export interface KioskPatientRecord {
	id: string;
	fullName: string | null;
	phone: string | null;
	organizationId: string;
}

export interface KioskAppointmentRecord {
	id: string;
	startsAt: Date;
	endsAt: Date;
	status: string;
	doctorUserId: string | null;
	chairId: string | null;
}

/**
 * 1. Определение организации (клиники) с изоляцией тенанта
 */
export async function resolveOrganizationId(rawOrgId: string): Promise<string | null> {
	let organizationId = rawOrgId;
	if (!organizationId) {
		const firstOrg = await withSuperuserBypass(async () => {
			const [org] = await db
				.select({ id: organizations.id })
				.from(organizations)
				.limit(1);
			return org;
		});
		if (firstOrg) {
			organizationId = firstOrg.id;
		}
	}
	return organizationId || null;
}

/**
 * 2. Поиск пациента: по patientId, полному телефону, последним 4 цифрам, либо экстренное создание
 */
export async function lookupPatient(
	organizationId: string,
	params: {
		rawPatientId: string;
		rawPhone: string;
		rawPhoneLast4: string;
		isEmergency: boolean;
		emergencyChiefComplaint: string;
		isFirstTime?: boolean;
		patientFullName?: string;
	},
): Promise<KioskPatientRecord | null> {
	return withTenantCtx(organizationId, async () => {
		const {
			rawPatientId,
			rawPhone,
			rawPhoneLast4,
			isEmergency,
			emergencyChiefComplaint,
			isFirstTime = false,
			patientFullName = "",
		} = params;
		let targetPatient: KioskPatientRecord | null = null;

		// Поиск по явному patientId
		if (rawPatientId) {
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(and(eq(patients.id, rawPatientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (p) targetPatient = p;
		}

		// Поиск по полному номеру телефона
		if (!targetPatient && rawPhone) {
			const phoneDigits = rawPhone.replace(/\D/g, "");
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						or(eq(patients.phone, rawPhone), eq(patients.phone, phoneDigits)),
					),
				)
				.limit(1);
			if (p) targetPatient = p;
		}

		// Поиск по 4 последним цифрам телефона
		if (!targetPatient && rawPhoneLast4.length === 4) {
			const candidates = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						sql`RIGHT(REGEXP_REPLACE(${patients.phone}, '\\D', '', 'g'), 4) = ${rawPhoneLast4}`,
					),
				)
				.limit(10);

			if (candidates.length === 1 && candidates[0]) {
				targetPatient = candidates[0];
			} else if (candidates.length > 1) {
				const now = new Date();
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

				for (const cand of candidates) {
					const [apt] = await db
						.select({ id: appointments.id })
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								eq(appointments.patientId, cand.id),
								gte(appointments.startsAt, startOfDay),
								lt(appointments.startsAt, endOfDay),
								notInArray(appointments.status, ["cancelled"]),
							),
						)
						.limit(1);
					if (apt) {
						targetPatient = cand;
						break;
					}
				}
				if (!targetPatient && candidates[0]) {
					targetPatient = candidates[0];
				}
			}
		}

		// Экстренный приём без найденного пациента — регистрация гостя
		if (!targetPatient && isEmergency) {
			const [newEmergencyPatient] = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: "Пациент Экстренный",
					phone: rawPhone || (rawPhoneLast4 ? `+7 (000) 000-${rawPhoneLast4}` : null),
					notes: `Саморегистрация через терминал: ${emergencyChiefComplaint}`,
				})
				.returning({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				});
			if (newEmergencyPatient) {
				targetPatient = newEmergencyPatient;
			}
		}

		// Первичный приём без найденного пациента — автоматическая регистрация карты первичного пациента
		if (!targetPatient && isFirstTime) {
			const resolvedName = patientFullName.trim() || "Первичный пациент";
			const [newFirstTimePatient] = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: resolvedName,
					phone: rawPhone || (rawPhoneLast4 ? `+7 (000) 000-${rawPhoneLast4}` : null),
					notes: "Саморегистрация через терминал: Первичный визит",
				})
				.returning({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				});
			if (newFirstTimePatient) {
				targetPatient = newFirstTimePatient;
			}
		}

		return targetPatient;
	});
}

/**
 * 3. Поиск сегодняшнего приёма пациента
 */
export async function lookupTodayAppointment(
	organizationId: string,
	patientId: string,
): Promise<KioskAppointmentRecord | null> {
	return withTenantCtx(organizationId, async () => {
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		const [apt] = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.patientId, patientId),
					gte(appointments.startsAt, startOfDay),
					lt(appointments.startsAt, endOfDay),
					notInArray(appointments.status, ["cancelled"]),
				),
			)
			.orderBy(appointments.startsAt)
			.limit(1);

		return apt || null;
	});
}

/**
 * 4. Создание экстренного слота приёма
 */
export async function createEmergencyAppointment(
	organizationId: string,
	patientId: string,
	emergencyChiefComplaint: string,
): Promise<KioskAppointmentRecord | null> {
	const now = new Date();
	const emergencyEnds = new Date(now.getTime() + 30 * 60 * 1000);
	let created: KioskAppointmentRecord | null = null;

	await withTenantCtx(organizationId, async () => {
		const [createdAppt] = await db
			.insert(appointments)
			.values({
				organizationId,
				patientId,
				status: "arrived",
				startsAt: now,
				endsAt: emergencyEnds,
				comment: `⚡ ОСТРАЯ БОЛЬ (Экстренный приём с терминала): ${emergencyChiefComplaint}`,
			})
			.returning({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
			});
		if (createdAppt) {
			created = createdAppt;
		}
	});

	return created;
}

/**
 * 4a. Создание первичного слота приёма (для первичных пациентов без предварительной записи)
 */
export async function createFirstTimeAppointment(
	organizationId: string,
	patientId: string,
	patientFullName?: string,
): Promise<KioskAppointmentRecord | null> {
	const now = new Date();
	const firstTimeEnds = new Date(now.getTime() + 30 * 60 * 1000);
	let created: KioskAppointmentRecord | null = null;

	await withTenantCtx(organizationId, async () => {
		const [createdAppt] = await db
			.insert(appointments)
			.values({
				organizationId,
				patientId,
				status: "arrived",
				startsAt: now,
				endsAt: firstTimeEnds,
				comment: `🆕 ПЕРВИЧНЫЙ ПРИЁМ (Терминал самообслуживания): ${patientFullName || "Первичный визит"}`,
			})
			.returning({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
			});
		if (createdAppt) {
			created = createdAppt;
		}
	});

	return created;
}

/**
 * 5. Разрешение имени врача и кабинета/кресла
 */
export async function getDoctorAndCabinetInfo(
	organizationId: string,
	doctorUserId: string | null,
	chairId: string | null,
): Promise<{ doctorName: string; cabinetName: string }> {
	return withTenantCtx(organizationId, async () => {
		let doctorName = "Дежурный врач-стоматолог";
		let cabinetName = "Кабинет 1";

		if (doctorUserId) {
			const [doc] = await db
				.select({ fullName: users.fullName })
				.from(users)
				.where(and(eq(users.id, doctorUserId), eq(users.organizationId, organizationId)))
				.limit(1);
			if (doc?.fullName) {
				doctorName = doc.fullName;
			}
		}

		if (chairId) {
			const [chair] = await db
				.select({ name: chairs.name })
				.from(chairs)
				.where(and(eq(chairs.id, chairId), eq(chairs.organizationId, organizationId)))
				.limit(1);
			if (chair?.name) {
				cabinetName = chair.name;
			}
		}

		return { doctorName, cabinetName };
	});
}
