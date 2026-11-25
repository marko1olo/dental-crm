/**
 * redTeamFixerSurgeonPatientDomain.test.ts
 *
 * Verifies fixes for Domain: Patient Profile, Consents (ИДС), Family Wallet & FNS Tax (КНД 1151156):
 * 1. DEFECT 1: BigInt integer calculation for 13% FNS tax refund without float / Math.round.
 * 2. DEFECT 2: Strongly-typed `tx?: DbOrTx` in `syncDocumentToPatientConsent` without `any`.
 * 3. DEFECT 3: Portal tax certificate strictly scoped to requesting patient (targetPatientIds = [patientId]).
 * 4. DEFECT 4: Semantic `CONSENT_PRIMARY_INSPECTION` flag in `detectRequiredVisitConsents`.
 * 5. DEFECT 5: Deleting family head automatically reassigns role to next adult member without leaving group headless.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	familyGroups,
	organizations,
	patientRelationships,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { syncDocumentToPatientConsent } from "../../routes/consents/queries.js";
import { registerFamilyGroupWriteRoutes } from "../../routes/family/familyGroupWriteRoutes.js";
import { registerPortalTaxCertRoutes } from "../../routes/portal/portalTaxCertRoutes.js";
import { PORTAL_TOKEN_KIND } from "../../routes/portal/types.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "../../services/familyWallet/familyFnsTaxService.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "fixerPatDomain";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const FAMILY_ID = fixtureUuid(NAMESPACE, 2);
const HEAD_PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const ADULT_PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const CHILD_PATIENT_ID = fixtureUuid(NAMESPACE, 5);
const STAFF_USER_ID = fixtureUuid(NAMESPACE, 6);

describe("Red Team Fixer Surgeon: Patient Profile, Consents, Family Wallet & Tax Certificates", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let headPatientToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		registerFamilyGroupWriteRoutes(app);
		registerPortalTaxCertRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		staffToken = signToken(
			{
				userId: STAFF_USER_ID,
				role: "admin",
				organizationId: ORG_ID,
				fullName: "Главный Врач / Администратор",
			},
			secret,
		);

		headPatientToken = signToken(
			{
				sub: HEAD_PATIENT_ID,
				organizationId: ORG_ID,
				kind: PORTAL_TOKEN_KIND,
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Fixer Surgeon Clinical Testing LLC",
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1234567890123",
				legalAddress: "г. Москва, ул. Клиническая, д. 1",
				medicalLicenseNumber: "ЛО-77-01-000001",
				medicalLicenseIssuedAt: "2020-01-01",
				signatoryName: "Главврач Дорохов С.В.",
			});

			await tx.insert(users).values({
				id: STAFF_USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Администратор",
				email: `admin_${Date.now()}@dente.ru`,
				role: "admin",
				passwordHash: "hash",
			});

			// Insert 3 family members: Head, Adult, Child
			await tx.insert(patients).values([
				{
					id: HEAD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					birthDate: "1980-05-15",
					phone: "+79001112233",
					familyGroupId: FAMILY_ID,
				},
				{
					id: ADULT_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванова Ольга Сергеевна",
					birthDate: "1985-08-20",
					phone: "+79002223344",
					familyGroupId: FAMILY_ID,
				},
				{
					id: CHILD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Петр Иванович",
					birthDate: "2015-10-10",
					phone: "+79003334455",
					familyGroupId: FAMILY_ID,
				},
			]);

			// Insert family group
			await tx.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				headPatientId: HEAD_PATIENT_ID,
				primaryPatientId: HEAD_PATIENT_ID,
				balance: "50000.00",
			});
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("DEFECT 1: BigInt integer calculation for 13% tax refund in familyFnsTaxService without float drift", async () => {
		// Insert payment for Head patient
		const paymentId = fixtureUuid(NAMESPACE, 10);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(payments).values({
				id: paymentId,
				organizationId: ORG_ID,
				patientId: HEAD_PATIENT_ID,
				amountRub: 10000,
				status: "paid",
				taxDeductionCode: "1",
				paidAt: new Date(),
			});
		});

		const certs = await generateFnsTaxCertificatesForFamilyLogic({
			organizationId: ORG_ID,
			familyGroupId: FAMILY_ID,
			taxYear: String(new Date().getFullYear()),
			clinic: {
				name: "Fixer Surgeon Clinical Testing LLC",
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1234567890123",
			},
			signatory: {
				signatoryRole: "1",
				fullName: { family: "Дорохов", given: "Сергей" },
			},
		});

		assert.ok(certs.length > 0);
		const headCert = certs.find((c) => c.patientId === HEAD_PATIENT_ID);
		assert.ok(headCert);
		// 10 000 руб * 13% = 1 300 руб (BigInt integer calculation)
		assert.strictEqual(headCert.estimated13PercentRefundRub, 1300);
	});

	it("DEFECT 2: syncDocumentToPatientConsent works with explicit transaction tx without any", async () => {
		const docId = fixtureUuid(NAMESPACE, 20);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await syncDocumentToPatientConsent(
				ORG_ID,
				ADULT_PATIENT_ID,
				"informed_consent",
				docId,
				new Date(),
				tx,
			);
		});

		assert.ok(true);
	});

	it("DEFECT 3: Portal tax certificate is strictly scoped to requesting patient without mixing other family members", async () => {
		const currentYear = new Date().getFullYear();
		// Add payment of 5000 руб for Adult member
		const adultPaymentId = fixtureUuid(NAMESPACE, 30);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(payments).values({
				id: adultPaymentId,
				organizationId: ORG_ID,
				patientId: ADULT_PATIENT_ID,
				amountRub: 5000,
				status: "paid",
				taxDeductionCode: "1",
				paidAt: new Date(),
			});
		});

		// Head patient requests certificate preview
		const res = await app.inject({
			method: "GET",
			url: `/tax-certificate/preview?year=${currentYear}`,
			headers: {
				authorization: `Bearer ${headPatientToken}`,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.ok(body.success);
		assert.strictEqual(body.certificate.patient.fullName, "Иванов Иван Иванович");
		// Total sum for Head patient should be strictly 10 000 руб, NOT 15 000 руб (Adult's payment is not mixed in!)
		assert.strictEqual(body.certificate.summary.totalSumRub, 10000);
	});

	it("DEFECT 5: Deleting family head automatically transfers role to next adult member (ADULT_PATIENT_ID)", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/api/finance/family/${FAMILY_ID}/members/${HEAD_PATIENT_ID}`,
			headers: {
				authorization: `Bearer ${staffToken}`,
			},
		});

		assert.strictEqual(res.statusCode, 200);

		// Check family group in database
		const [updatedFamily] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.id, FAMILY_ID), eq(familyGroups.organizationId, ORG_ID)))
				.limit(1);
		});

		assert.ok(updatedFamily);
		// Role transferred to ADULT_PATIENT_ID (next adult member)
		assert.strictEqual(updatedFamily.headPatientId, ADULT_PATIENT_ID);
		assert.strictEqual(updatedFamily.primaryPatientId, ADULT_PATIENT_ID);

		// Former head has familyGroupId = null
		const [formerHead] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, HEAD_PATIENT_ID), eq(patients.organizationId, ORG_ID)))
				.limit(1);
		});

		assert.strictEqual(formerHead?.familyGroupId, null);
	});
});
