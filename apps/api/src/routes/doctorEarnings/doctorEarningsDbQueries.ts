/**
 * doctorEarningsDbQueries.ts — Чтение приемов, услуг, ЗТЛ и оплат врача из PostgreSQL.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	doctorCommissions,
	labOrders,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { DEFAULT_CATEGORY_COMMISSION_PERCENT, DOCTOR_SPECIALTY_PAYROLL_PRESETS } from "@dental/shared";

/** Карта соответствия идентификатора специальности и живого русского названия. */
const SPECIALTY_TITLE_BY_ID = new Map<string, string>(
	DOCTOR_SPECIALTY_PAYROLL_PRESETS.map((preset) => [preset.specialtyId, preset.titleRu]),
);

export async function fetchDoctorProfileAndRates(orgId: string, doctorId: string) {
	let doctorName = "Врач-стоматолог";
	let doctorSpecialty = "Врач-стоматолог";
	try {
		const docUser = await db
			.select({ fullName: users.fullName, specialties: users.specialties })
			.from(users)
			.where(eq(users.id, doctorId))
			.limit(1);
		if (docUser[0]?.fullName) doctorName = docUser[0].fullName;
		const specialties = docUser[0]?.specialties;
		if (Array.isArray(specialties)) {
			for (const specId of specialties) {
				const title = typeof specId === "string" ? SPECIALTY_TITLE_BY_ID.get(specId) : undefined;
				if (title) {
					doctorSpecialty = title;
					break;
				}
			}
		}
	} catch (dbError) {
		console.warn("Не удалось прочитать профиль врача, используется нейтральное имя:", dbError);
	}

	const categoryRates: Record<string, number> = { ...DEFAULT_CATEGORY_COMMISSION_PERCENT };
	try {
		const commRows = await db
			.select({ serviceCategory: doctorCommissions.serviceCategory, commissionPct: doctorCommissions.commissionPct })
			.from(doctorCommissions)
			.where(and(eq(doctorCommissions.organizationId, orgId), eq(doctorCommissions.userId, doctorId), eq(doctorCommissions.isActive, true)));
		for (const cr of commRows) {
			if (cr.serviceCategory && cr.commissionPct) {
				const num = parseFloat(String(cr.commissionPct));
				if (!Number.isNaN(num) && num > 0) categoryRates[cr.serviceCategory] = num;
			}
		}
	} catch (dbError) {
		console.warn("Не удалось прочитать ставки комиссий врача, применяются базовые ставки:", dbError);
	}
	return { doctorName, doctorSpecialty, categoryRates };
}

export async function fetchDoctorAppointmentsForPeriod(orgId: string, doctorId: string, fromDate: Date, toDate: Date) {
	try {
		const cardNumSql = sql<string>`coalesce(
			${patients.administrativeProfile}->>'cardNumber',
			${patients.administrativeProfile}->>'chartNumber',
			${patients.administrativeProfile}->>'medicalCardNumber',
			'К-' || substring(${appointments.id}::text, 1, 8)
		)`;
		return await db
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				patientName: patients.fullName,
				cardNumber: cardNumSql,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.where(and(eq(appointments.organizationId, orgId), eq(appointments.doctorUserId, doctorId), gte(appointments.startsAt, fromDate), lte(appointments.startsAt, toDate)))
			.orderBy(appointments.startsAt);
	} catch {
		return [];
	}
}

export async function fetchAppointmentsClinicalDetails(orgId: string, doctorId: string, fromDate: Date, toDate: Date, appointmentIds: string[]) {
	const visitsList = await db
		.select({ id: visits.id, appointmentId: visits.appointmentId, patientId: visits.patientId })
		.from(visits)
		.where(and(eq(visits.organizationId, orgId), inArray(visits.appointmentId, appointmentIds)));

	const visitIds = visitsList.map((v) => v.id);
	const appointmentToVisitMap = new Map<string, string>();
	for (const v of visitsList) {
		if (v.appointmentId) appointmentToVisitMap.set(v.appointmentId, v.id);
	}

	let dbTreatmentItems: any[] = [];
	if (visitIds.length > 0) {
		dbTreatmentItems = await db
			.select({
				id: treatmentItems.id,
				visitId: treatmentItems.visitId,
				title: treatmentItems.title,
				priceRub: treatmentItems.priceRub,
				quantity: treatmentItems.quantity,
				category: serviceCatalogItems.category,
				serviceCode: serviceCatalogItems.code,
			})
			.from(treatmentItems)
			.leftJoin(serviceCatalogItems, and(eq(treatmentItems.serviceId, serviceCatalogItems.id), eq(serviceCatalogItems.organizationId, orgId)))
			.where(and(eq(treatmentItems.organizationId, orgId), inArray(treatmentItems.visitId, visitIds)));
	}

	const dbLabOrders = await db
		.select({
			id: labOrders.id,
			patientId: labOrders.patientId,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			status: labOrders.status,
			priceRub: labOrders.priceRub,
			labCostRub: labOrders.labCostRub,
			isWarranty: labOrders.isWarranty,
			dueDate: labOrders.dueDate,
		})
		.from(labOrders)
		.where(and(eq(labOrders.organizationId, orgId), eq(labOrders.doctorId, doctorId), gte(labOrders.createdAt, fromDate), lte(labOrders.createdAt, toDate)));

	let dbPayments: any[] = [];
	if (visitIds.length > 0) {
		dbPayments = await db
			.select({ visitId: payments.visitId, amountRub: payments.amountRub, status: payments.status })
			.from(payments)
			.where(and(eq(payments.organizationId, orgId), inArray(payments.visitId, visitIds), eq(payments.status, "paid")));
	}

	return { appointmentToVisitMap, dbTreatmentItems, dbLabOrders, dbPayments };
}
