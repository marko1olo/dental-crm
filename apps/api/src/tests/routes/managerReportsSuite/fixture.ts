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
import { authTokenSecret } from "../../../security/authSecret.js";
import { signToken } from "../../../utils/cryptoHelper.js";

export function getTenantConfig(suffix = "0401") {
	const orgId = `dce70000-0000-4000-8000-00000000${suffix}`;
	const clinicId = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}2`;
	const doctorId = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}3`;
	const chairId = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}4`;
	const patientOld = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}5`;
	const patientNew = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}6`;
	const visitId = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}7`;
	const appointmentId = `dce70000-0000-4000-8000-00000000${suffix.slice(0, 3)}8`;
	return {
		orgId,
		clinicId,
		doctorId,
		chairId,
		patientOld,
		patientNew,
		visitId,
		appointmentId,
	};
}

const defaultCfg = getTenantConfig("0401");
export const ORG_ID = defaultCfg.orgId;
export const CLINIC_ID = defaultCfg.clinicId;
export const DOCTOR_ID = defaultCfg.doctorId;
export const CHAIR_ID = defaultCfg.chairId;
export const PATIENT_OLD = defaultCfg.patientOld;
export const PATIENT_NEW = defaultCfg.patientNew;
export const VISIT_ID = defaultCfg.visitId;
export const APPOINTMENT_ID = defaultCfg.appointmentId;
export let ORG_HEADERS: Record<string, string> = { "x-organization-id": ORG_ID };

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

export async function removeFixtureRows(cfg = defaultCfg): Promise<void> {
	await withFixtureTenant(cfg.orgId, async () => {
		await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, cfg.orgId));
		await db.delete(payments).where(eq(payments.organizationId, cfg.orgId));
		await db.delete(visits).where(eq(visits.organizationId, cfg.orgId));
		await db.delete(appointments).where(eq(appointments.organizationId, cfg.orgId));
		await db.delete(patients).where(eq(patients.organizationId, cfg.orgId));
		await db.delete(chairs).where(eq(chairs.organizationId, cfg.orgId));
		await db.delete(users).where(eq(users.organizationId, cfg.orgId));
		await db.delete(clinics).where(eq(clinics.organizationId, cfg.orgId));
		await db.delete(organizations).where(eq(organizations.id, cfg.orgId));
	});
}

export async function seedFixtureRows(
	inPeriod: Date,
	longAgo: Date,
	cfg = defaultCfg,
	options?: { skipUnlinkedRefund?: boolean },
): Promise<void> {
	await withFixtureTenant(cfg.orgId, async () => {
		await db
			.insert(organizations)
			.values({ id: cfg.orgId, name: `Клиника отчётов ${cfg.orgId.slice(-4)}` })
			.onConflictDoNothing();
		await db
			.insert(clinics)
			.values({
				id: cfg.clinicId,
				organizationId: cfg.orgId,
				name: "Главная",
				timezone: "Europe/Moscow",
			})
			.onConflictDoNothing();
		await db
			.insert(chairs)
			.values({
				id: cfg.chairId,
				organizationId: cfg.orgId,
				clinicId: cfg.clinicId,
				name: "Кресло 1",
			})
			.onConflictDoNothing();
		await db
			.insert(users)
			.values({
				id: cfg.doctorId,
				organizationId: cfg.orgId,
				fullName: "Петров Пётр Петрович",
				role: "owner",
			})
			.onConflictDoNothing();
		await db
			.insert(patients)
			.values([
				{ id: cfg.patientOld, organizationId: cfg.orgId, fullName: "Старый Пациент Иванович" },
				{ id: cfg.patientNew, organizationId: cfg.orgId, fullName: "Новый Пациент Петрович" },
			])
			.onConflictDoNothing();

		await db
			.insert(appointments)
			.values([
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientOld,
					doctorUserId: cfg.doctorId,
					chairId: cfg.chairId,
					status: "completed",
					startsAt: longAgo,
					endsAt: new Date(longAgo.getTime() + 60 * 60_000),
				},
				{
					id: cfg.appointmentId,
					organizationId: cfg.orgId,
					patientId: cfg.patientOld,
					doctorUserId: cfg.doctorId,
					chairId: cfg.chairId,
					status: "completed",
					startsAt: inPeriod,
					endsAt: new Date(inPeriod.getTime() + 90 * 60_000),
				},
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientNew,
					doctorUserId: cfg.doctorId,
					chairId: cfg.chairId,
					status: "completed",
					startsAt: new Date(inPeriod.getTime() + 3 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 4 * 60 * 60_000),
				},
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientNew,
					doctorUserId: cfg.doctorId,
					chairId: cfg.chairId,
					status: "cancelled",
					startsAt: new Date(inPeriod.getTime() + 6 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 7 * 60 * 60_000),
				},
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientNew,
					doctorUserId: cfg.doctorId,
					chairId: cfg.chairId,
					status: "no_show",
					startsAt: new Date(inPeriod.getTime() + 8 * 60 * 60_000),
					endsAt: new Date(inPeriod.getTime() + 9 * 60 * 60_000),
				},
			])
			.onConflictDoNothing();

		await db
			.insert(visits)
			.values({
				id: cfg.visitId,
				organizationId: cfg.orgId,
				patientId: cfg.patientOld,
				appointmentId: cfg.appointmentId,
				status: "signed",
				createdAt: inPeriod,
			})
			.onConflictDoNothing();

		const paymentRows: Array<{
			organizationId: string;
			patientId: string;
			visitId?: string | undefined;
			amountRub: number;
			amountKopecks: bigint;
			status: "planned" | "paid" | "refunded" | "voided";
			paidAt: Date;
		}> = [
			{
				organizationId: cfg.orgId,
				patientId: cfg.patientOld,
				visitId: cfg.visitId,
				amountRub: 10_000,
				amountKopecks: 1_000_000n,
				status: "paid",
				paidAt: inPeriod,
			},
			{
				organizationId: cfg.orgId,
				patientId: cfg.patientOld,
				visitId: cfg.visitId,
				amountRub: 50_000,
				amountKopecks: 5_000_000n,
				status: "planned",
				paidAt: inPeriod,
			},
		];

		if (!options?.skipUnlinkedRefund) {
			paymentRows.push({
				organizationId: cfg.orgId,
				patientId: cfg.patientNew,
				visitId: undefined,
				amountRub: 7_000,
				amountKopecks: 700_000n,
				status: "refunded",
				paidAt: inPeriod,
			});
		}

		await db.insert(payments).values(paymentRows).onConflictDoNothing();

		await db
			.insert(treatmentItems)
			.values([
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientOld,
					visitId: cfg.visitId,
					title: "Лечение кариеса",
					quantity: "2",
					priceRub: 8_000,
					unitPriceRub: 8_000,
					discountRub: 2_000,
					priceKopecks: 800_000n,
					unitPriceKopecks: 800_000n,
					discountKopecks: 200_000n,
					status: "completed",
				},
				{
					organizationId: cfg.orgId,
					patientId: cfg.patientOld,
					visitId: cfg.visitId,
					title: "Гигиена",
					quantity: "1",
					priceRub: 16_000,
					unitPriceRub: 16_000,
					discountRub: 0,
					priceKopecks: 1_600_000n,
					unitPriceKopecks: 1_600_000n,
					discountKopecks: 0n,
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
	orgId: string;
	clinicId: string;
	doctorId: string;
	chairId: string;
	patientOld: string;
	patientNew: string;
	visitId: string;
	appointmentId: string;
	headers: Record<string, string>;
}

export async function setupReportsContext(
	suffix = "0401",
	options?: { skipUnlinkedRefund?: boolean },
): Promise<ManagerReportsTestContext> {
	const cfg = getTenantConfig(suffix);
	const originalEnv = { ...process.env };
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
	process.env.NODE_ENV = "development";
	process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "fixture_test_secret_32_bytes_long_string_12345";

	const secret = authTokenSecret();
	const clinicToken = signToken({ organizationId: cfg.orgId }, secret);
	const staffToken = signToken(
		{ organizationId: cfg.orgId, userId: cfg.doctorId, role: "owner" },
		secret,
	);
	const headers = {
		"x-organization-id": cfg.orgId,
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};
	ORG_HEADERS = headers;

	const app = createTenantTestApp();
	await registerReportRoutes(app);

	const { inPeriod, longAgo } = getReportDates();
	let databaseAvailable = true;

	try {
		await removeFixtureRows(cfg);
		await seedFixtureRows(inPeriod, longAgo, cfg, options);
	} catch (error) {
		if (!isMissingDatabase(error)) throw error;
		databaseAvailable = false;
	}

	return {
		app,
		databaseAvailable,
		originalEnv,
		orgId: cfg.orgId,
		clinicId: cfg.clinicId,
		doctorId: cfg.doctorId,
		chairId: cfg.chairId,
		patientOld: cfg.patientOld,
		patientNew: cfg.patientNew,
		visitId: cfg.visitId,
		appointmentId: cfg.appointmentId,
		headers,
	};
}

export async function teardownReportsContext(ctx: ManagerReportsTestContext): Promise<void> {
	if (ctx.databaseAvailable) {
		const cfg = getTenantConfig(ctx.orgId.slice(-4));
		await removeFixtureRows(cfg);
	}
	await ctx.app.close();
	process.env = ctx.originalEnv;
}
