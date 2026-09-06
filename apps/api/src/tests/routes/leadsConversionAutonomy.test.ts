/**
 * leadsConversionAutonomy.test.ts
 *
 * MANDATE 8e (Doctor Autonomy) & MANDATE 8n (Solo Doctor / Small Clinic Scale Sovereignty)
 *
 * Tests autonomous conversion of CRM leads in /api/leads/:id/convert:
 * 1. Fallback doctor ("default-doctor") and fallback chair ("default-chair") resolve to active doctor and create appointment with 200 OK.
 * 2. Omitted doctorId and chairId resolve defaults and create appointment with 200 OK.
 * 3. Zero Dead-Ends: Solo clinic with 0 configured chairs successfully creates appointment with nullable chairId.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { clinics, crmLeads, organizations, users } from "../../db/schema.js";
import { registerLeadsRoutes } from "../../routes/leads.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "leadsConversionAutonomy";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const LEAD_1_ID = fixtureUuid(NAMESPACE, 10);
const LEAD_2_ID = fixtureUuid(NAMESPACE, 11);

test("LEADS CONVERSION SOLO DOCTOR & FALLBACK AUTONOMY (MANDATES 8e & 8n)", async (suite) => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[LeadsAutonomy Before] Purge warning:", e);
		}

		app = createTenantTestApp();
		await registerLeadsRoutes(app);
		await app.ready();

		const secret = authTokenSecret();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				type: "clinic",
			},
			secret,
			3600,
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
			3600,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Стоматология Соло Доктор",
			});

			await tx.insert(clinics).values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Кабинет врача",
			});

			await tx.insert(users).values({
				id: DOCTOR_USER_ID,
				organizationId: ORG_ID,
				fullName: "Доктор Айболит Соло",
				role: "doctor",
				isActive: true,
			});

			await tx.insert(crmLeads).values({
				id: LEAD_1_ID,
				organizationId: ORG_ID,
				name: "Иван Смирнов (Лид 1)",
				phone: "+79991112233",
				source: "yandex_direct",
				status: "new",
				notes: "Пациент с острой болью",
			});

			await tx.insert(crmLeads).values({
				id: LEAD_2_ID,
				organizationId: ORG_ID,
				name: "Ольга Кузнецова (Лид 2)",
				phone: "+79994445566",
				source: "vkontakte",
				status: "new",
				notes: "Консультация ортодонта",
			});
		});
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[LeadsAutonomy Cleanup] Purge warning:", e);
		}
	});

	await suite.test(
		"Converting lead with fallback doctor ('default-doctor') and fallback chair ('default-chair') resolves active doctor and succeeds with 200 OK",
		async () => {
			const startIso = "2026-09-10T10:00:00.000Z";
			const endIso = "2026-09-10T11:00:00.000Z";

			const response = await app.inject({
				method: "POST",
				url: `/api/leads/${LEAD_1_ID}/convert`,
				headers: {
					"content-type": "application/json",
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
				},
				payload: {
					appointmentStart: startIso,
					appointmentEnd: endIso,
					doctorId: "default-doctor",
					chairId: "default-chair",
				},
			});

			assert.equal(response.statusCode, 200, response.body);
			const result = JSON.parse(response.body);

			assert.ok(result.patient, "Patient should be returned");
			assert.equal(result.patient.fullName, "Иван Смирнов (Лид 1)");
			assert.equal(result.patient.phone, "+79991112233");

			assert.ok(result.appointment, "Appointment should be returned");
			assert.equal(result.appointment.doctorUserId, DOCTOR_USER_ID);
			assert.equal(result.appointment.status, "planned");
			assert.equal(
				new Date(result.appointment.startsAt).toISOString(),
				startIso,
			);
			assert.equal(new Date(result.appointment.endsAt).toISOString(), endIso);

			// Verify lead was marked as consult_booked in database
			await withFixtureTenant(ORG_ID, async (tx) => {
				const [updatedLead] = await tx
					.select()
					.from(crmLeads)
					.where(eq(crmLeads.id, LEAD_1_ID))
					.limit(1);
				assert.equal(updatedLead?.status, "consult_booked");
			});
		},
	);

	await suite.test(
		"Converting lead with omitted doctorId and chairId resolves defaults and creates appointment with 200 OK",
		async () => {
			const startIso = "2026-09-10T12:00:00.000Z";
			const endIso = "2026-09-10T13:00:00.000Z";

			const response = await app.inject({
				method: "POST",
				url: `/api/leads/${LEAD_2_ID}/convert`,
				headers: {
					"content-type": "application/json",
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
				},
				payload: {
					appointmentStart: startIso,
					appointmentEnd: endIso,
				},
			});

			assert.equal(response.statusCode, 200, response.body);
			const result = JSON.parse(response.body);

			assert.ok(result.patient, "Patient should be returned");
			assert.equal(result.patient.fullName, "Ольга Кузнецова (Лид 2)");
			assert.equal(result.patient.phone, "+79994445566");

			assert.ok(result.appointment, "Appointment should be returned");
			assert.equal(result.appointment.doctorUserId, DOCTOR_USER_ID);
			assert.equal(result.appointment.status, "planned");
			assert.equal(
				new Date(result.appointment.startsAt).toISOString(),
				startIso,
			);
			assert.equal(new Date(result.appointment.endsAt).toISOString(), endIso);

			// Verify lead was marked as consult_booked in database
			await withFixtureTenant(ORG_ID, async (tx) => {
				const [updatedLead] = await tx
					.select()
					.from(crmLeads)
					.where(eq(crmLeads.id, LEAD_2_ID))
					.limit(1);
				assert.equal(updatedLead?.status, "consult_booked");
			});
		},
	);
});
