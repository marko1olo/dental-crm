/**
 * apps/api/src/routes/portal/kiosk/kioskPatientLookupHandlers.ts
 *
 * Обработчики поиска пациента и приёма для терминала самообслуживания (Kiosk)
 * (Мандат 8n: Суверенитет соло-врача и малой клиники, 0 бюрократии, быстрый чекин).
 */

import { and, eq, gte, lt, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	organizations,
	patients,
	users,
} from "../../../db/schema.js";

export const kioskCheckinSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный формат идентификатора клиники (UUID)").optional().nullable(),
		phoneLast4: z.string().regex(/^\d{4}$/, "Требуются 4 цифры").optional().nullable(),
		patientPhone: z.string().max(30).optional().nullable(),
		patientId: z.string().uuid("Некорректный идентификатор пациента").optional().nullable(),
		checkinCode: z.string().max(20).optional().nullable(),
		signedConsents: z.array(z.string()).optional().nullable(),
		somaticProfile: z.record(z.unknown()).optional().nullable(),
		isEmergency: z.boolean().optional().nullable(),
		emergencyChiefComplaint: z.string().max(500).optional().nullable(),
		isFirstTime: z.boolean().optional().nullable(),
		patientFullName: z.string().max(200).optional().nullable(),
		kioskMode: z.string().max(50).optional().nullable(),
	})
	.strict();

export type SelfCheckinBody = z.infer<typeof kioskCheckinSchema>;

export interface KioskPatientRecord {
	id: string;
	fullName: string | null;
	phone: string | null;
	organizationId: string;
	isVirtualGuest?: boolean;
}

export interface KioskAppointmentRecord {
	id: string;
	startsAt: Date;
	endsAt: Date;
	status: string;
	doctorUserId: string | null;
	chairId: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 1. Определение организации (клиники) с изоляцией тенанта
 */
export async function resolveOrganizationId(rawOrgId?: string | null): Promise<string | null> {
	const organizationId = rawOrgId?.trim() || "";
	if (!organizationId || !UUID_REGEX.test(organizationId)) {
		return null;
	}
	const [org] = await withSuperuserBypass(async (tx) => {
		return tx
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);
	});
	return org?.id ?? null;
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
	return withTenantCtx(organizationId, async (tx) => {
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
			const [p] = await tx
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
			const [p] = await tx
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

		// Поиск по 4 последним цифрам телефона (только если полный номер не был передан)
		if (!targetPatient && !rawPhone && rawPhoneLast4.length === 4) {
			const candidates = await tx
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
				const cand = candidates[0];
				const now = new Date();
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				const [apt] = await tx
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
				if (apt || isEmergency || isFirstTime) {
					targetPatient = cand;
				}
			} else if (candidates.length > 1) {
				const now = new Date();
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

				for (const cand of candidates) {
					const [apt] = await tx
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
			}
		}

		// Экстренный или первичный приём без найденного пациента:
		// Предотвращение спама в таблицу patients фантомных записей ("Пациент Экстренный").
		// Создается виртуальный талон гостя для оперативной очереди к стойке регистрации.
		if (!targetPatient && (isEmergency || isFirstTime)) {
			const guestName = isEmergency
				? "Экстренный посетитель"
				: (patientFullName.trim() || "Первичный посетитель");
			targetPatient = {
				id: `guest-${Date.now().toString(36)}`,
				fullName: guestName,
				phone: rawPhone || (rawPhoneLast4 ? `+7 (***) ***-${rawPhoneLast4}` : null),
				organizationId,
				isVirtualGuest: true,
			};
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
	return withTenantCtx(organizationId, async (tx) => {
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		const [apt] = await tx
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
 * 4. Создание экстренного слота приёма или оперативного талона очереди
 */
export async function createEmergencyAppointment(
	organizationId: string,
	patientId: string,
	emergencyChiefComplaint: string,
): Promise<KioskAppointmentRecord | null> {
	const now = new Date();
	const emergencyEnds = new Date(now.getTime() + 30 * 60 * 1000);
	const virtualId = `emg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

	// Для незарегистрированных посетителей формируем оперативный талон без спама в базу appointments
	if (patientId.startsWith("guest-")) {
		return {
			id: virtualId,
			startsAt: now,
			endsAt: emergencyEnds,
			status: "arrived",
			doctorUserId: null,
			chairId: null,
		};
	}

	let created: KioskAppointmentRecord | null = null;

	await withTenantCtx(organizationId, async (tx) => {
		const [createdAppt] = await tx
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
	const virtualId = `first-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

	// Для незарегистрированных посетителей формируем оперативный талон без спама в базу appointments
	if (patientId.startsWith("guest-")) {
		return {
			id: virtualId,
			startsAt: now,
			endsAt: firstTimeEnds,
			status: "arrived",
			doctorUserId: null,
			chairId: null,
		};
	}

	let created: KioskAppointmentRecord | null = null;

	await withTenantCtx(organizationId, async (tx) => {
		const [createdAppt] = await tx
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
	return withTenantCtx(organizationId, async (tx) => {
		let doctorName = doctorUserId ? "Дежурный врач-стоматолог" : "Дежурный врач";
		let cabinetName = chairId ? "Кабинет 1" : "Стойка регистрации";

		if (doctorUserId) {
			const [doc] = await tx
				.select({ fullName: users.fullName })
				.from(users)
				.where(and(eq(users.id, doctorUserId), eq(users.organizationId, organizationId)))
				.limit(1);
			if (doc?.fullName) {
				doctorName = doc.fullName;
			}
		}

		if (chairId) {
			const [chair] = await tx
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
