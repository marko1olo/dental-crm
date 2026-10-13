/**
 * telephonyCallerLookup.test.ts
 *
 * Fastify route & service integration tests for /api/telephony/lookup-caller:
 * - PostgreSQL 18 tenant-isolated CTI Screen Pop caller lookup (<15ms index resolution)
 * - Returns demographics, debt/balance, upcoming visits, somatic alerts, treatment plans
 * - Graceful fallback for unknown callers (found: false)
 * - Strict tenant isolation (org-A cannot see org-B patients)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { appointments, organizations, patients, users } from "../../db/schema.js";
import { telephonyRoutes } from "../../routes/telephony.js";
import { CallerLookupService } from "../../services/telephony/callerLookupService.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "telephonyLookupCaller";
const ORG_A_ID = fixtureUuid(NAMESPACE, 1);
const ORG_B_ID = fixtureUuid(NAMESPACE, 2);
const STAFF_A_ID = fixtureUuid(NAMESPACE, 3);
const DOCTOR_A_ID = fixtureUuid(NAMESPACE, 4);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 5);
const APPT_A_ID = fixtureUuid(NAMESPACE, 6);

describe("CTI Telephony /api/telephony/lookup-caller and CallerLookupService", () => {
	let app: FastifyInstance;
	let staffTokenA = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		delete process.env.TELEPHONY_WEBHOOK_SECRET;
		delete process.env.DENTE_WEBHOOK_SECRET;

		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			try {
				await withFixtureTenant(ORG_A_ID, async () => {
					await db.insert(organizations).values({
						id: ORG_A_ID,
						name: "Клиника А — CTI Lookup",
					});
					await db.insert(users).values([
						{
							id: STAFF_A_ID,
							organizationId: ORG_A_ID,
							fullName: "Администратор А",
							role: "admin",
						},
						{
							id: DOCTOR_A_ID,
							organizationId: ORG_A_ID,
							fullName: "Д-р Смирнов А.А.",
							role: "doctor",
						},
					]);
					await db.insert(patients).values({
						id: PATIENT_A_ID,
						organizationId: ORG_A_ID,
						fullName: "Кузнецов Алексей Петрович",
						phone: "+79998881122",
						notes: "Аллергия на лидокаин. Острая боль в области зуба 46.",
						gender: "male",
					});
					const futureDate = new Date(Date.now() + 24 * 3600 * 1000);
					await db.insert(appointments).values({
						id: APPT_A_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A_ID,
						doctorUserId: DOCTOR_A_ID,
						startsAt: futureDate,
						endsAt: new Date(Date.now() + 25 * 3600 * 1000),
						status: "confirmed",
					});
				});

				await withFixtureTenant(ORG_B_ID, async () => {
					await db.insert(organizations).values({
						id: ORG_B_ID,
						name: "Клиника Б — Изолированная",
					});
				});
			} catch (error) {
				if (!isDatabaseUnavailable(error)) throw error;
				databaseReady = false;
			}
		}

		staffTokenA = signToken(
			{
				organizationId: ORG_A_ID,
				userId: STAFF_A_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await app.register(telephonyRoutes, { prefix: "/api/telephony" });
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
			} catch {}
		}
	});

	test("1. Returns default empty result with found: false for unknown caller", async () => {
		const result = await CallerLookupService.lookupCaller({
			organizationId: ORG_A_ID,
			phone: "+79000000000",
		});
		assert.equal(result.found, false);
		assert.equal(result.patient, null);
		assert.equal(result.financialSummary.balanceRub, 0);
		assert.equal(result.somaticAlerts.length, 0);
	});

	test("2. Successfully resolves caller via /api/telephony/lookup-caller HTTP route", async () => {
		if (!databaseReady) return;

		const response = await app.inject({
			method: "GET",
			url: "/api/telephony/lookup-caller?phone=%2B79998881122",
			headers: {
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = JSON.parse(response.body);
		assert.equal(json.found, true);
		assert.equal(json.patient.id, PATIENT_A_ID);
		assert.equal(json.patient.fullName, "Кузнецов Алексей Петрович");
		assert.ok(json.somaticAlerts.length > 0, "Must extract somatic alerts from patient notes");
		assert.ok(json.somaticAlerts.some((a: { label: string }) => a.label.includes("лидокаин")));
	});

	test("3. Resolves caller via parameterized orgId route /api/telephony/:organizationId/lookup-caller", async () => {
		if (!databaseReady) return;

		const response = await app.inject({
			method: "GET",
			url: `/api/telephony/${ORG_A_ID}/lookup-caller?phone=89998881122`,
			headers: {
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = JSON.parse(response.body);
		assert.equal(json.found, true);
		assert.equal(json.patient.id, PATIENT_A_ID);
		assert.ok(json.upcomingAppointment !== null, "Must resolve upcoming appointment");
	});

	test("4. Enforces strict tenant isolation: Org B cannot find Org A patient", async () => {
		if (!databaseReady) return;

		const staffTokenB = signToken(
			{
				organizationId: ORG_B_ID,
				userId: fixtureUuid(NAMESPACE, 99),
				role: "admin",
			},
			authTokenSecret(),
		);

		const response = await app.inject({
			method: "GET",
			url: `/api/telephony/${ORG_B_ID}/lookup-caller?phone=%2B79998881122`,
			headers: {
				"x-dente-staff-token": staffTokenB,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = JSON.parse(response.body);
		assert.equal(json.found, false, "Tenant B must NOT see Tenant A's patient");
		assert.equal(json.patient, null);
	});
});
