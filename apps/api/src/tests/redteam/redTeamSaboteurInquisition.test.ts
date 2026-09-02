/**
 * apps/api/src/tests/redteam/redTeamSaboteurInquisition.test.ts
 *
 * 🔴 RED TEAM SABOTEUR INQUISITION: MAXIMUM ADVERSARIAL PEN-TEST 🔴
 *
 * This test suite does NOT check for "happy paths".
 * It actively tries to hack, poison, bypass, and exploit the system:
 *
 * 1. ATTACK-01: SQL Injection & Multitenant Bleed in Patient Search & MPI
 * 2. ATTACK-02: Cryptographic Forgery & Malformed ASN.1 DER CMS UKEP Injection
 * 3. ATTACK-03: 152-FZ / 323-FZ Lateral Projection & Query Param Secrecy Bypass
 * 4. ATTACK-04: Concurrency Race Condition Attack on Decree 659 Upsell Consent Shield
 * 5. ATTACK-05: EGISZ Outbox Poisoning with Unsigned Medical Documents
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	generatedDocuments,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { validateGostCmsPkcs7Signature } from "@dental/shared";
import { buildEgiszRemdSubmissionPackage } from "../../services/cda/index.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "redTeamInquisition";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2); // Victim tenant for multitenant bleed test
const ATTACKER_USER_ID = fixtureUuid(NAMESPACE, 3);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 4);
const PATIENT_A = fixtureUuid(NAMESPACE, 5);
const PATIENT_B = fixtureUuid(NAMESPACE, 6);

describe("🔴 RED TEAM SABOTEUR INQUISITION (ADVERSARIAL PEN-TEST) 🔴", () => {
	let app: FastifyInstance;
	let dbDisabled = false;

	let attackerToken: string;
	let doctorToken: string;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			dbDisabled = true;
			console.warn("[RED TEAM] Database unavailable, skipping live attacks");
			return;
		}

		// 1. Seed two completely isolated tenants in PostgreSQL 18
		await withFixtureTenant(ORG_A, async () => {
			await db.insert(organizations).values({
				id: ORG_A,
				name: "Клиника Альфа (Tenant A)",
			});
			await db.insert(users).values([
				{
					id: ATTACKER_USER_ID,
					organizationId: ORG_A,
					email: "attacker@clinic-alpha.ru",
					fullName: "Хакеров Маркетолог Злоумышленник",
					role: "marketer",
				},
				{
					id: DOCTOR_ID,
					organizationId: ORG_A,
					email: "doctor@clinic-alpha.ru",
					fullName: "Докторов Честный Врач",
					role: "doctor",
				},
			]);
			await db.insert(patients).values({
				id: PATIENT_A,
				organizationId: ORG_A,
				fullName: "Пациент Альфа Секретный",
				phone: "+79991110001",
				birthDate: "1985-05-15",
			});
		});

		await withFixtureTenant(ORG_B, async () => {
			await db.insert(organizations).values({
				id: ORG_B,
				name: "Клиника Бета (Victim Tenant B)",
			});
			await db.insert(patients).values({
				id: PATIENT_B,
				organizationId: ORG_B,
				fullName: "Жертва Утечки Данных Бета",
				phone: "+79992220002",
				birthDate: "1992-12-20",
			});
		});

		// 2. Issue tokens
		const secret = authTokenSecret();
		attackerToken = signToken(
			{
				sub: ATTACKER_USER_ID,
				organizationId: ORG_A,
				role: "marketer",
			},
			secret,
		);

		doctorToken = signToken(
			{
				sub: DOCTOR_ID,
				organizationId: ORG_A,
				role: "doctor",
			},
			secret,
		);

		// 3. Build test fastify instance with strict tenant context
		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await registerOdontogramRoutes(app);
		await registerBillingRoutes(app);
		await registerInvoiceRoutes(app);
		await registerDocumentRoutes(app);
	});

	after(async () => {
		if (app) await app.close();
		if (!dbDisabled) await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	it("ATTACK-01: SQL Injection & Multitenant Bleed in Patient Search", async () => {
		if (dbDisabled) return;

		// Vector 1: Classical tautology attack in query parameter
		const sqlInjectionPayloads = [
			"' OR '1'='1",
			"'; DROP TABLE patients; --",
			"' UNION SELECT id, full_name, phone, null, null FROM patients WHERE organization_id != 'org1' --",
			"Жертва' OR 1=1 --",
			"admin'--",
		];

		for (const payload of sqlInjectionPayloads) {
			const res = await app.inject({
				method: "GET",
				url: `/api/patients?search=${encodeURIComponent(payload)}`,
				headers: { authorization: `Bearer ${attackerToken}` },
			});

			assert.strictEqual(
				res.statusCode,
				200,
				`Server crashed on SQL injection payload: ${payload}`,
			);

			const json = res.json();
			const items = Array.isArray(json) ? json : json.items || [];

			// CRITICAL ASSERTION: The attacker from Tenant A MUST NEVER see Victim Patient B from Tenant B!
			const leakedVictim = items.find(
				(p: any) => p.id === PATIENT_B || p.fullName?.includes("Жертва"),
			);
			assert.strictEqual(
				leakedVictim,
				undefined,
				`🚨 CRITICAL VULNERABILITY: SQL injection leaked Patient B across tenant boundary! Payload: ${payload}`,
			);
		}
	});

	it("ATTACK-02: Cryptographic Forgery — Injecting Malformed ASN.1 & Foreign OIDs", async () => {
		if (dbDisabled) return;

		// Vector 1: Arbitrary string pretending to be signature
		const res1 = validateGostCmsPkcs7Signature(
			"MIIB_FAKE_TEST_SIGNATURE_STRING",
		);
		assert.strictEqual(res1.valid, false);
		assert.ok(res1.error?.includes("Base64") || res1.error?.includes("Длина"));

		// Vector 2: Valid Base64 but invalid ASN.1 root (not SEQUENCE 0x30)
		const invalidAsn1Root = Buffer.from([
			0x04,
			0x10,
			...new Array(64).fill(0xaa),
		]).toString("base64");
		const res2 = validateGostCmsPkcs7Signature(invalidAsn1Root);
		assert.strictEqual(res2.valid, false);
		assert.ok(
			res2.error?.includes("SEQUENCE") || res2.error?.includes("ASN.1"),
		);

		// Vector 3: Valid ASN.1 SEQUENCE with RSA OID (1.2.840.113549.1.1.1) but NO GOST OIDs (1.2.643.*)
		const fakeRsaDer = Buffer.from([
			0x30,
			0x50, // SEQUENCE of 80 bytes
			0x06,
			0x09,
			0x2a,
			0x86,
			0x48,
			0x86,
			0xf7,
			0x0d,
			0x01,
			0x07,
			0x02, // OID 1.2.840.113549.1.7.2 (SignedData)
			...new Array(69).fill(0x00),
		]).toString("base64");

		const res3 = validateGostCmsPkcs7Signature(fakeRsaDer);
		assert.strictEqual(res3.valid, false);
		assert.ok(
			res3.error?.includes("ГОСТ") || res3.error?.includes("1.2.643"),
			`Failed to reject non-GOST foreign algorithm: ${res3.error}`,
		);
	});

	it("ATTACK-03: 152-FZ / 323-FZ Lateral Projection Injection via Marketer", async () => {
		if (dbDisabled) return;

		const attackUrls = [
			`/api/patients/${PATIENT_A}?fields=diagnosis,odontogram,clinicalNotes`,
			`/api/patients/${PATIENT_A}?include=all`,
			`/api/patients/${PATIENT_A}?expand=emr_records`,
		];

		for (const url of attackUrls) {
			const res = await app.inject({
				method: "GET",
				url,
				headers: {
					authorization: `Bearer ${attackerToken}`,
					"X-Debug-Bypass": "true",
					"X-Forwarded-Role": "doctor",
				},
			});

			if (res.statusCode === 200) {
				const body = res.body;
				assert.strictEqual(
					body.includes('"diagnosis"'),
					false,
					`🚨 SEVERITY CRITICAL: 152-FZ Diagnosis leaked to marketer via ${url}!`,
				);
				assert.strictEqual(
					body.includes('"mkb10"'),
					false,
					`🚨 SEVERITY CRITICAL: 152-FZ MKB-10 leaked to marketer via ${url}!`,
				);
				assert.strictEqual(
					body.includes('"clinicalNotes"'),
					false,
					`🚨 SEVERITY CRITICAL: 152-FZ Clinical Notes leaked to marketer via ${url}!`,
				);
			}
		}
	});

	it("ATTACK-04: Concurrency Race Condition Attack on Decree 659 Upsell Shield", async () => {
		if (dbDisabled) return;

		const planId = fixtureUuid(NAMESPACE, 100);
		const unapprovedItemId = fixtureUuid(NAMESPACE, 102);

		await withFixtureTenant(ORG_A, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_A,
				patientId: PATIENT_A,
				name: "План протезирования (Red Team Race)",
				title: "План протезирования (Red Team Race)",
				status: "Approved",
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: unapprovedItemId,
					organizationId: ORG_A,
					planId,
					priceId: "A16.07.054",
					price: "65000.00",
					quantity: 1,
				},
			]);
		});

		// Attacker fires 5 SIMULTANEOUS CONCURRENT REQUESTS
		const concurrentPayments = Array.from({ length: 5 }).map((_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/payments",
				headers: { authorization: `Bearer ${doctorToken}` },
				payload: {
					patientId: PATIENT_A,
					amount: 65000,
					method: "cash",
					paymentType: "treatment",
					treatmentPlanItemId: unapprovedItemId,
					idempotencyKey: `race-key-${idx}-${Date.now()}`,
				},
			}),
		);

		const results = await Promise.all(concurrentPayments);

		for (const res of results) {
			assert.strictEqual(
				res.statusCode,
				422,
				`🚨 CRITICAL DEFECT: Concurrency race condition allowed unapproved payment! Status: ${res.statusCode}, Body: ${res.body}`,
			);
		}

		const writtenPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_A),
					eq(payments.patientId, PATIENT_A),
				),
			);

		assert.strictEqual(
			writtenPayments.length,
			0,
			"🚨 CRITICAL: Database contains unauthorized payments that slipped through concurrency race!",
		);
	});

	it("ATTACK-05: EGISZ REMD Poisoning with Unsigned Medical Documents", async () => {
		if (dbDisabled) return;

		const draftDocId = fixtureUuid(NAMESPACE, 200);

		await withFixtureTenant(ORG_A, async () => {
			await db.insert(generatedDocuments).values({
				id: draftDocId,
				organizationId: ORG_A,
				patientId: PATIENT_A,
				title: "Протокол осмотра (Черновик)",
				kind: "informed_consent",
				status: "draft",
			});
		});

		assert.throws(() => {
			buildEgiszRemdSubmissionPackage({
				documentId: draftDocId,
				documentVersion: 1,
				docTypeNsiCode: "108",
				clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
				patientSnils: "11223344595",
				rawXml: "<ClinicalDocument/>",
				doctorSignature: {
					signatureBase64: "", // unsigned!
					certificateSerialNumber: "0",
					certificateSubject: "Attacker",
					algorithmOid: "1.2.643.7.1.1.1.1",
					signedAt: new Date().toISOString(),
				},
			});
		}, /ZodError|Signature/i);
	});
});
