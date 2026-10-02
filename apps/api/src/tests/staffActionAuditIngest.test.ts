import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditEvents, clinicalAuditLogs, organizations, users } from "../db/schema.js";
import { registerAuditRoutes } from "../routes/audit.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "staff-audit-ingest-test";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const FOREIGN_ORG_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_ID = fixtureUuid(NAMESPACE, 20);

import Fastify from "fastify";

let app: FastifyInstance;
let doctorAuthToken: string;
let databaseAvailable = true;

function isMissingDatabase(error: unknown): boolean {
	const cause = error && typeof error === "object" && "cause" in error ? String((error as any).cause) : "";
	const message = error instanceof Error ? `${error.message} ${cause}` : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

before(async () => {
	doctorAuthToken = signToken(
		{
			userId: DOCTOR_USER_ID,
			organizationId: ORG_ID,
			role: "doctor",
		},
		authTokenSecret(),
	);

	app = Fastify();
	await registerAuditRoutes(app);
	await app.ready();

	try {
		await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);

		// Seed fixture tenant
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Дент-Аудит Тест",
			});

			await db.insert(users).values({
				id: DOCTOR_USER_ID,
				organizationId: ORG_ID,
				email: "doctor@dente-test.local",
				role: "doctor",
				fullName: "Д-р Тестов А.А.",
			});
		});
	} catch (error) {
		if (isMissingDatabase(error)) {
			databaseAvailable = false;
		} else {
			throw error;
		}
	}
});

after(async () => {
	if (app) await app.close();
	if (databaseAvailable) {
		try {
			await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
		}
	}
});

test("Staff Action Audit Ingestion & Immutability Suite", async (t) => {
	const authHeaders = {
		"x-dente-staff-token": doctorAuthToken,
		"x-dente-clinic-token": doctorAuthToken,
	};

	await t.test("1. Immutability Law: DELETE / PUT / PATCH /api/audit/events return 403 AuditLogImmutable", async () => {
		const methods = ["DELETE", "PUT", "PATCH"] as const;

		for (const method of methods) {
			const res = await app.inject({
				method,
				url: "/api/audit/events",
				headers: authHeaders,
			});
			if (res.statusCode !== 403) {
				console.error(`FAILED ${method} /api/audit/events: status=${res.statusCode}, body=${res.body}`);
			}
			assert.strictEqual(res.statusCode, 403);
			assert.strictEqual(res.json().error, "AuditLogImmutable");

			const resId = await app.inject({
				method,
				url: "/api/audit/events/some-event-id",
				headers: authHeaders,
			});
			if (resId.statusCode !== 403) {
				console.error(`FAILED ${method} /api/audit/events/some-event-id: status=${resId.statusCode}, body=${resId.body}`);
			}
			assert.strictEqual(resId.statusCode, 403);
			assert.strictEqual(resId.json().error, "AuditLogImmutable");
		}
	});

	await t.test("2. Unauthenticated calls to POST /api/audit/events are rejected", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/audit/events",
			payload: {
				actionType: "emr_open",
				entityType: "emr",
				entityId: "123",
			},
		});

		assert.ok(response.statusCode === 401 || response.statusCode === 403);
	});

	await t.test("3. Empty event lists are rejected with 400", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/audit/events",
			headers: authHeaders,
			payload: {
				events: [],
			},
		});

		if (response.statusCode !== 400) {
			console.error(`FAILED test 3: status=${response.statusCode}, body=${response.body}`);
		}
		assert.strictEqual(response.statusCode, 400);
		assert.strictEqual(response.json().error, "EmptyEventsPayload");
	});

	await t.test("4. POST /api/audit/events - Ingests single clinical staff action with sanitization (when DB connected)", async () => {
		if (!databaseAvailable) {
			t.skip("Live PostgreSQL 18 not connected in local environment");
			return;
		}

		const payload = {
			actionType: "diagnosis_change",
			entityType: "emr_record",
			entityId: "rec-diag-101",
			patientId: PATIENT_ID,
			details: {
				oldState: { icdCode: "K02.1", note: "Кариес" },
				newState: { icdCode: "K04.0", note: "Пульпит" },
				password: "leaked_doctor_password",
				token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.xyz",
				cardNumber: "4276111122223333",
			},
			reason: "Глубокое кариозное поражение вскрыло пульповую камеру",
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/audit/events",
			headers: authHeaders,
			payload,
		});

		assert.strictEqual(response.statusCode, 201);
		const body = response.json();
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.count, 1);
		assert.ok(Array.isArray(body.insertedIds));
		assert.strictEqual(body.insertedIds.length, 1);

		const insertedId = body.insertedIds[0];

		// Verify record exists in auditEvents table
		const [eventRow] = await db
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.id, insertedId));

		assert.ok(eventRow, "Event must be saved in audit_events");
		assert.strictEqual(eventRow.organizationId, ORG_ID);
		assert.strictEqual(eventRow.actorUserId, DOCTOR_USER_ID);
		assert.strictEqual(eventRow.action, "diagnosis_change");
		assert.strictEqual(eventRow.entityType, "emr_record");
		assert.strictEqual(eventRow.reason, "Глубокое кариозное поражение вскрыло пульповую камеру");

		// Verify dual record in clinicalAuditLogs
		const [clinicalRow] = await db
			.select()
			.from(clinicalAuditLogs)
			.where(eq(clinicalAuditLogs.entityId, "rec-diag-101"));

		assert.ok(clinicalRow, "Clinical action must be saved in clinical_audit_logs");
		assert.strictEqual(clinicalRow.patientId, PATIENT_ID);
		assert.strictEqual(clinicalRow.action, "DIAGNOSIS_CHANGE");

		// Verify 152-FZ Sanitization: sensitive credentials must be redacted!
		const meta = clinicalRow.meta as Record<string, unknown>;
		assert.strictEqual(meta.password, "[REDACTED]");
		assert.strictEqual(meta.cardNumber, "[REDACTED]");
		// Clinical state preserved:
		assert.deepStrictEqual((meta.newState as any).icdCode, "K04.0");
	});

	await t.test("5. POST /api/audit/events/batch - Ingests multi-action queue with financial actions (when DB connected)", async () => {
		if (!databaseAvailable) {
			t.skip("Live PostgreSQL 18 not connected in local environment");
			return;
		}

		const batchPayload = {
			events: [
				{
					actionType: "shift_open",
					entityType: "cash_shift",
					entityId: "shift-morning-01",
					details: { shiftNumber: "1", openingCashKopecks: 1000000 },
				},
				{
					actionType: "discount_apply",
					entityType: "invoice_bill",
					entityId: "bill-disc-202",
					patientId: PATIENT_ID,
					details: { discountPercent: 10, discountAmountKopecks: 150000 },
					reason: "Семейная скидка клиники",
				},
				{
					actionType: "payment_receive",
					entityType: "invoice_bill",
					entityId: "bill-disc-202",
					patientId: PATIENT_ID,
					details: { amountKopecks: 1350000, paymentMethod: "card" },
				},
			],
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/audit/events/batch",
			headers: authHeaders,
			payload: batchPayload,
		});

		assert.strictEqual(response.statusCode, 201);
		const body = response.json();
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.count, 3);
		assert.strictEqual(body.insertedIds.length, 3);
	});

	await t.test("6. Multi-tenant isolation: client organizationId spoofing is strictly overridden (when DB connected)", async () => {
		if (!databaseAvailable) {
			t.skip("Live PostgreSQL 18 not connected in local environment");
			return;
		}

		const spoofedPayload = {
			organizationId: FOREIGN_ORG_ID, // Attempt to spoof foreign clinic
			actionType: "appointment_cancel",
			entityType: "appointment",
			entityId: "appt-999",
			reason: "Пациент отменил запись",
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/audit/events",
			headers: authHeaders,
			payload: spoofedPayload,
		});

		assert.strictEqual(response.statusCode, 201);
		const body = response.json();
		const insertedId = body.insertedIds[0];

		const [eventRow] = await db
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.id, insertedId));

		assert.ok(eventRow);
		// Organization MUST be the authenticated tenant ORG_ID, NOT the spoofed FOREIGN_ORG_ID
		assert.strictEqual(eventRow.organizationId, ORG_ID);
		assert.notStrictEqual(eventRow.organizationId, FOREIGN_ORG_ID);
	});
});
