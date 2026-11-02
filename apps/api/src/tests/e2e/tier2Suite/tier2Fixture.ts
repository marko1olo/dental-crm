import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import {
	chairs,
	clinics,
	organizations,
	patients,
	users,
} from "../../../db/schema.js";
import registerDiaryRoutes from "../../../routes/diary.js";
import { registerSberbankRoutes } from "../../../routes/sberbank.js";
import { registerScheduleRoutes } from "../../../routes/schedule.js";
import { authTokenSecret } from "../../../security/authSecret.js";
import { signToken } from "../../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../../support/tenantTestApp.js";

export const repoRoot =
	existsSync(join(process.cwd(), "package.json")) &&
	existsSync(join(process.cwd(), "apps"))
		? process.cwd()
		: join(process.cwd(), "../..");

export const NAMESPACE = "tier2BoundaryCases";
export const ORG_ID = fixtureUuid(NAMESPACE, 1);
export const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
export const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
export const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 11);
export const ASSISTANT_1_ID = fixtureUuid(NAMESPACE, 20);
export const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
export const CHAIR_2_ID = fixtureUuid(NAMESPACE, 31);
export const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
export const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);
export const VISIT_1_ID = fixtureUuid(NAMESPACE, 50);
export const SERVICE_1_ID = fixtureUuid(NAMESPACE, 60);
export const SERVICE_2_ID = fixtureUuid(NAMESPACE, 61);
export const ITEM_1_ID = fixtureUuid(NAMESPACE, 70);
export const ITEM_2_ID = fixtureUuid(NAMESPACE, 71);

export const SBER_SECRET = "tier2-sberbank-webhook-secret-key-67890";
export const ADMIN_SECRET = "tier2-schedule-admin-secret-xyz987654321";

export function generateSberbankChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

export interface Tier2FixtureContext {
	app: FastifyInstance;
	clinicToken: string;
	doctorToken: string;
	databaseAvailable: boolean;
	makeAppointment: (payload: {
		patientId: string;
		doctorUserId: string;
		chairId: string;
		assistantUserId?: string;
		startsAt: string;
		endsAt: string;
	}) => Promise<any>;
}

export function createTier2Fixture(): {
	ctx: Tier2FixtureContext;
	setup: () => Promise<void>;
	teardown: () => Promise<void>;
} {
	const ctx: Tier2FixtureContext = {
		app: null as any,
		clinicToken: "",
		doctorToken: "",
		databaseAvailable: true,
		makeAppointment: async (payload) => {
			return ctx.app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": ctx.clinicToken,
					"x-dente-admin-secret": ADMIN_SECRET,
				},
				payload: {
					...payload,
					status: "planned",
					reason: "Граничный приём",
				},
			});
		},
	};

	const savedSberSecret = process.env.SBERBANK_WEBHOOK_SECRET;
	const savedScheduleSecret = process.env.DENTE_SCHEDULE_ADMIN_SECRET;

	const setup = async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.SBERBANK_WEBHOOK_SECRET = SBER_SECRET;
		process.env.DENTE_SCHEDULE_ADMIN_SECRET = ADMIN_SECRET;

		ctx.app = createTenantTestApp();
		await registerScheduleRoutes(ctx.app);
		await registerSberbankRoutes(ctx.app);
		await registerDiaryRoutes(ctx.app);
		await ctx.app.ready();

		ctx.clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		ctx.doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_1_ID, role: "doctor" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Tier 2 Граничных Тестов",
						inn: "7709876543",
					})
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Граничное Отделение",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values([
						{
							id: DOCTOR_1_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Граничный Иван",
							role: "doctor",
							isActive: true,
						},
						{
							id: DOCTOR_2_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Угловой Петр",
							role: "doctor",
							isActive: true,
						},
						{
							id: ASSISTANT_1_ID,
							organizationId: ORG_ID,
							fullName: "Ассистент Граничная Елена",
							role: "assistant",
							isActive: true,
						},
					])
					.onConflictDoNothing();
				await db
					.insert(chairs)
					.values([
						{
							id: CHAIR_1_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 1 (Граничное)",
							isActive: true,
						},
						{
							id: CHAIR_2_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 2 (Граничное)",
							isActive: true,
						},
					])
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values([
						{
							id: PATIENT_1_ID,
							organizationId: ORG_ID,
							fullName: "Пациент Тестовый Граничный",
							status: "active",
						},
						{
							id: PATIENT_2_ID,
							organizationId: ORG_ID,
							fullName: "Пациентка Вторая Граничная",
							status: "active",
						},
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			ctx.databaseAvailable = false;
		}
	};

	const teardown = async () => {
		await ctx.app?.close();
		if (savedSberSecret === undefined) delete process.env.SBERBANK_WEBHOOK_SECRET;
		else process.env.SBERBANK_WEBHOOK_SECRET = savedSberSecret;

		if (savedScheduleSecret === undefined)
			delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;
		else process.env.DENTE_SCHEDULE_ADMIN_SECRET = savedScheduleSecret;

		if (ctx.databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	};

	return { ctx, setup, teardown };
}
