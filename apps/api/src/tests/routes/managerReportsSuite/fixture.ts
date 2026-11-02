import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../../db/schema.js";
import { registerReportRoutes } from "../../../routes/reports.js";
import { currentMonthPeriod } from "../../../services/reports/managerReports.js";
import { withFixtureTenant } from "../../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../../support/tenantTestApp.js";

export const ORG_ID = "dce70000-0000-4000-8000-000000000401";
export const CLINIC_ID = "dce70000-0000-4000-8000-000000000402";
export const DOCTOR_ID = "dce70000-0000-4000-8000-000000000403";
export const CHAIR_ID = "dce70000-0000-4000-8000-000000000404";
export const PATIENT_OLD = "dce70000-0000-4000-8000-000000000405";
export const PATIENT_NEW = "dce70000-0000-4000-8000-000000000406";
export const VISIT_ID = "dce70000-0000-4000-8000-000000000407";
export const APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000408";
export const ORG_HEADERS = { "x-organization-id": ORG_ID };

export function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

export function getReportDates() {
	const period = currentMonthPeriod();
	const inPeriod = new Date(period.from.getTime() + 12 * 60 * 60 * 1000);
	const longAgo = new Date(period.from.getTime() - 300 * 24 * 60 * 60 * 1000);
	return { period, inPeriod, longAgo };
}

export async function removeFixtureRows(): Promise<void> {
	await withFixtureTenant(ORG_ID, async () => {
		await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
		await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
		await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

export async function seedFixtureRows(inPeriod: Date, longAgo: Date): Promise<void> {
	await withFixtureTenant(ORG_ID, async () => {
		await db
			.insert(organizations)
			.values({ id: ORG_ID, name: "Клиника отчётов" })
			.onConflictDoNothing();
		await db
			.insert(clinics)
			.values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Главная",
				timezone: "Europe/Moscow",
			})
			.onConflictDoNothing();
		await db
			.insert(chairs)
			.values({
				id: CHAIR_ID,
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				name: "Кресло 1",
			})
			.onConflictDoNothing();
		await db
			.insert(users)
			.values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Петров Пётр Петрович",
				role: "doctor",
			})
			.onConflictDoNothing();
		await db
			.insert(patients)
			.values([
				{ id: PATIENT_OLD, organizationId: ORG_ID, fullName: "Старый Пациент Иванович" },
				{ id: PATIENT_NEW, organizationId: ORG_ID, fullName: "Новый Пациент Петрович" },
			])
			.onConflictDoNothing();

		await db
			.insert(appointments)
			.values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "completed",
					startsAt: longAgo,
					endsAt: new Date(longAgo.getTime() + 60 * 60_000),
				},
				{
					id: APPOINTMENT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "completed",
					startsAt: inPeriod,
					endsAt: new Date(inPeriod.getTime() + 90 * 60_000),
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "completed",
					startsAt: new Date(inPeriod.getTime() + 3 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 4 * 60 * 60_000),
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "cancelled",
					startsAt: new Date(inPeriod.getTime() + 6 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 7 * 60 * 60_000),
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "no_show",
					startsAt: new Date(inPeriod.getTime() + 8 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 9 * 60 * 60_000),
				},
			])
			.onConflictDoNothing();

		await db
			.insert(visits)
			.values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_OLD,
				appointmentId: APPOINTMENT_ID,
				status: "signed",
				createdAt: inPeriod,
			})
			.onConflictDoNothing();

		await db
			.insert(payments)
			.values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					visitId: VISIT_ID,
					amountRub: 10_000,
					status: "paid",
					paidAt: inPeriod,
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					amountRub: 50_000,
					status: "planned",
					paidAt: inPeriod,
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					amountRub: 7_000,
					status: "refunded",
					paidAt: inPeriod,
				},
			])
			.onConflictDoNothing();

		await db
			.insert(treatmentItems)
			.values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					visitId: VISIT_ID,
					title: "Лечение кариеса",
					quantity: "2",
					priceRub: 8_000,
					unitPriceRub: 8_000,
					discountRub: 2_000,
					status: "completed",
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					visitId: VISIT_ID,
					title: "Гигиена",
					quantity: "1",
					priceRub: 16_000,
					unitPriceRub: 16_000,
					discountRub: 0,
					status: "completed",
				},
			])
			.onConflictDoNothing();
	});
}

export interface ManagerReportsTestContext {
	app: FastifyInstance;
	databaseAvailable: boolean;
	originalEnv: NodeJS.ProcessEnv;
}

export async function setupReportsContext(): Promise<ManagerReportsTestContext> {
	const originalEnv = { ...process.env };
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
	process.env.NODE_ENV = "development";

	const app = createTenantTestApp();
	await registerReportRoutes(app);

	const { inPeriod, longAgo } = getReportDates();
	let databaseAvailable = true;

	try {
		await removeFixtureRows();
		await seedFixtureRows(inPeriod, longAgo);
	} catch (error) {
		if (!isMissingDatabase(error)) throw error;
		databaseAvailable = false;
	}

	return { app, databaseAvailable, originalEnv };
}

export async function teardownReportsContext(ctx: ManagerReportsTestContext): Promise<void> {
	if (ctx.databaseAvailable) {
		await removeFixtureRows();
	}
	await ctx.app.close();
	process.env = ctx.originalEnv;
}
