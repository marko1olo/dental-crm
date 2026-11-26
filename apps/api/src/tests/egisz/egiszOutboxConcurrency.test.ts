/**
 * Concurrency & SKIP LOCKED Integration Test for EGISZ REMD Outbox Dispatcher.
 * Verifies against real PostgreSQL 18.4:
 * 1. Concurrent workers (Promise.all) never claim or dispatch the same outbox row twice.
 * 2. Real SQL `FOR UPDATE SKIP LOCKED` skips rows locked by an active transaction without blocking.
 * 3. Concurrent stale-lock recovery runs atomically without double-incrementing attempts.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, endPool } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { EgiszOutboxDispatcher } from "../../services/egisz/EgiszOutboxDispatcher.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "../../services/egisz/OiisGatewayClient.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "egiszOutboxConcurrency";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_ID = fixtureUuid(NAMESPACE, 20);
const VISIT_ID = fixtureUuid(NAMESPACE, 30);

function createTrackingGateway(
	dispatchedLog: Array<{ workerTag: string; docId: string; txId: string }>,
	workerTag: string,
	delayMs = 15,
): OiisGatewayClient {
	const client = new OiisGatewayClient({
		baseUrl: "http://127.0.0.1:19999",
		guid: "00000000-0000-0000-0000-000000000000",
		lpuId: "LPU-CONC-TEST",
		clinicOid: "1.2.643.5.1.13.13.12.2.77099999",
		isSandbox: false,
	});

	client.sendRemdDocument = async (pkg): Promise<RemdSubmissionResponse> => {
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		const txId = `TX-${workerTag}-${pkg.documentId}`;
		dispatchedLog.push({
			workerTag,
			docId: pkg.documentId,
			txId,
		});
		return {
			success: true,
			transactionId: txId,
			status: "Registered",
			remdDocumentId: `REMD-${pkg.documentId}`,
			registrationDate: new Date().toISOString(),
			rawResponse: {
				receiptId: `RCP-${pkg.documentId}`,
			},
		};
	};

	return client;
}

describe("EGISZ Outbox Atomic FOR UPDATE SKIP LOCKED Concurrency (PostgreSQL 18)", () => {
	let dbAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(schema.organizations)
					.values({
						id: ORG_ID,
						name: 'ООО "Клиника Конкурентности ЕГИСЗ"',
						inn: "7709998881",
						kpp: "770901001",
						ogrn: "1157746999881",
					})
					.onConflictDoNothing();

				await tx
					.insert(schema.users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Смирнов Алексей Петрович",
						role: "doctor",
						snils: "112-233-445 95",
					})
					.onConflictDoNothing();

				await tx
					.insert(schema.patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Волкова Ирина Олеговна",
						birthDate: "1990-05-10",
					})
					.onConflictDoNothing();

				await tx
					.insert(schema.visits)
					.values({
						id: VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						status: "signed",
					})
					.onConflictDoNothing();
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}
	});

	after(async () => {
		if (dbAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// Best-effort fixture cleanup on teardown
			}
		}
		await endPool();
	});

	it("1. 5 parallel workers dispatch 10 due outbox rows with ZERO duplicates", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}

		const rowIds: string[] = [];
		const now = Date.now();
		await withFixtureTenant(ORG_ID, async (tx) => {
			for (let i = 0; i < 10; i++) {
				const id = fixtureUuid(NAMESPACE, 100 + i);
				rowIds.push(id);
				await tx.insert(schema.egiszOutbox).values({
					id,
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					docTypeNsiCode: "108",
					status: "ready_for_dispatch",
					payloadXml: `<ClinicalDocument>Batch-${i}</ClinicalDocument>`,
					payloadHashSha256: String(i).repeat(64).slice(0, 64),
					doctorSignaturePkcs7: "MIIFakeSig==",
					doctorCertSerial: "CERT-001",
					doctorCertSubject: "CN=Смирнов",
					doctorSignedAt: new Date(),
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(now - 5000),
					nextAttemptAt: new Date(now - 5000 + i),
					dedupeKey: `conc-batch-${i}-${now}`,
				});
			}
		});

		const dispatchedLog: Array<{ workerTag: string; docId: string; txId: string }> = [];
		const workers = Array.from({ length: 5 }, (_, idx) => {
			const dispatcher = new EgiszOutboxDispatcher(
				createTrackingGateway(dispatchedLog, `W${idx + 1}`, 15),
			);
			// Override org gateway resolution so all 5 workers use their own tracking gateway
			dispatcher.resolveClientForOrg = async () => dispatcher.getClient();
			return dispatcher;
		});

		// Run multiple waves concurrently with limit=3 to force fierce contention
		const wave1 = await Promise.all(
			workers.map((w) => w.processPendingQueue(ORG_ID, 3)),
		);
		const wave2 = await Promise.all(
			workers.map((w) => w.processPendingQueue(ORG_ID, 3)),
		);

		const allResults = [...wave1, ...wave2];
		const totalProcessed = allResults.reduce((acc, r) => acc + r.processedCount, 0);
		const totalSucceeded = allResults.reduce((acc, r) => acc + r.successCount, 0);

		assert.equal(totalProcessed, 10, "Sum of claimed/processed rows across all workers must be exactly 10");
		assert.equal(totalSucceeded, 10, "All 10 rows must succeed");
		assert.equal(dispatchedLog.length, 10, "External gateway must be called strictly once per row");

		const uniqueDocIds = new Set(dispatchedLog.map((d) => d.docId));
		assert.equal(uniqueDocIds.size, 10, "Each outbox row must be dispatched by at most 1 worker (zero duplicates)");

		// Verify DB state: all 10 registered, locks released
		const finalRows = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select()
				.from(schema.egiszOutbox)
				.where(
					and(
						eq(schema.egiszOutbox.organizationId, ORG_ID),
						inArray(schema.egiszOutbox.id, rowIds),
					),
				),
		);
		assert.equal(finalRows.length, 10);
		for (const row of finalRows) {
			assert.equal(row.status, "registered_in_remd");
			assert.equal(row.lockedAt, null);
			assert.equal(row.lockedBy, null);
		}
	});

	it("2. Real FOR UPDATE SKIP LOCKED skips row locked by an open transaction without blocking", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}

		const lockedRowId = fixtureUuid(NAMESPACE, 201);
		const freeRowId = fixtureUuid(NAMESPACE, 202);
		const now = Date.now();

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.egiszOutbox).values([
				{
					id: lockedRowId,
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					docTypeNsiCode: "108",
					status: "queued",
					payloadXml: "<ClinicalDocument>Locked</ClinicalDocument>",
					payloadHashSha256: "c".repeat(64),
					doctorSignaturePkcs7: "MIIFakeSig==",
					doctorCertSerial: "CERT-201",
					doctorCertSubject: "CN=Смирнов",
					doctorSignedAt: new Date(),
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(now - 2000),
					nextAttemptAt: new Date(now - 2000),
					dedupeKey: `conc-skip-1-${now}`,
				},
				{
					id: freeRowId,
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					docTypeNsiCode: "108",
					status: "queued",
					payloadXml: "<ClinicalDocument>Free</ClinicalDocument>",
					payloadHashSha256: "d".repeat(64),
					doctorSignaturePkcs7: "MIIFakeSig==",
					doctorCertSerial: "CERT-202",
					doctorCertSubject: "CN=Смирнов",
					doctorSignedAt: new Date(),
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(now - 1000),
					nextAttemptAt: new Date(now - 1000),
					dedupeKey: `conc-skip-2-${now}`,
				},
			]);
		});

		const dispatchedLog: Array<{ workerTag: string; docId: string; txId: string }> = [];
		const dispatcher = new EgiszOutboxDispatcher(
			createTrackingGateway(dispatchedLog, "SkipTester", 5),
		);
		dispatcher.resolveClientForOrg = async () => dispatcher.getClient();

		// Open an explicit transaction holding FOR UPDATE on lockedRowId
		let releaseLock!: () => void;
		const lockHeldPromise = new Promise<void>((resolve) => {
			releaseLock = resolve;
		});
		let lockAcquired!: () => void;
		const lockAcquiredPromise = new Promise<void>((resolve) => {
			lockAcquired = resolve;
		});

		const holderPromise = db.transaction(async (tx) => {
			await tx.execute(
				sql`SELECT set_config('app.current_tenant', ${ORG_ID}, true), set_config('app.superuser_bypass', 'off', true)`,
			);
			await tx.execute(
				sql`SELECT id FROM egisz_outbox WHERE id = ${lockedRowId}::uuid FOR UPDATE`,
			);
			lockAcquired();
			await lockHeldPromise;
		});

		await lockAcquiredPromise;
		try {
			// While lockedRowId is row-locked in PostgreSQL, processPendingQueue MUST skip it immediately and process freeRowId
			const res = await dispatcher.processPendingQueue(ORG_ID, 1);
			assert.equal(res.processedCount, 1);
			assert.equal(res.results[0]?.outboxId, freeRowId, "SKIP LOCKED must skip the locked row and pick freeRowId");
		} finally {
			releaseLock();
			await holderPromise;
		}

		// After holder releases lock, lockedRowId is claimed cleanly on the next run
		const resAfter = await dispatcher.processPendingQueue(ORG_ID, 1);
		assert.equal(resAfter.processedCount, 1);
		assert.equal(resAfter.results[0]?.outboxId, lockedRowId);
	});

	it("3. Concurrent stale-lock recovery recovers stuck sending rows atomically without double-incrementing attempts", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}

		const staleRowId = fixtureUuid(NAMESPACE, 301);
		const now = Date.now();
		const tenMinutesAgo = new Date(now - 10 * 60_000);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.egiszOutbox).values({
				id: staleRowId,
				organizationId: ORG_ID,
				visitId: VISIT_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				docTypeNsiCode: "108",
				status: "sending",
				lockedAt: tenMinutesAgo,
				lockedBy: "dead-worker-pid-999",
				remdTransactionId: null,
				payloadXml: "<ClinicalDocument>Stale</ClinicalDocument>",
				payloadHashSha256: "e".repeat(64),
				doctorSignaturePkcs7: "MIIFakeSig==",
				doctorCertSerial: "CERT-301",
				doctorCertSubject: "CN=Смирнов",
				doctorSignedAt: new Date(),
				attempts: 1,
				maxAttempts: 5,
				scheduledAt: tenMinutesAgo,
				nextAttemptAt: tenMinutesAgo,
				dedupeKey: `conc-stale-${now}`,
			});
		});

		const log1: Array<{ workerTag: string; docId: string; txId: string }> = [];
		const log2: Array<{ workerTag: string; docId: string; txId: string }> = [];
		const d1 = new EgiszOutboxDispatcher(createTrackingGateway(log1, "Stale1", 5));
		const d2 = new EgiszOutboxDispatcher(createTrackingGateway(log2, "Stale2", 5));
		d1.resolveClientForOrg = async () => d1.getClient();
		d2.resolveClientForOrg = async () => d2.getClient();

		await Promise.all([
			d1.processPendingQueue(ORG_ID, 10),
			d2.processPendingQueue(ORG_ID, 10),
		]);

		const [recovered] = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select()
				.from(schema.egiszOutbox)
				.where(and(eq(schema.egiszOutbox.id, staleRowId), eq(schema.egiszOutbox.organizationId, ORG_ID))),
		);

		assert.ok(recovered);
		assert.equal(recovered.status, "ready_for_dispatch", "Stale row must transition to ready_for_dispatch with backoff");
		assert.equal(recovered.attempts, 2, "Attempts must increment strictly ONCE (1 -> 2), never twice");
		assert.equal(recovered.lastErrorClass, "StaleLockTimeout");
		assert.equal(recovered.lockedAt, null);
		assert.equal(log1.length + log2.length, 0, "Backed-off stale row must wait until nextAttemptAt");
	});
});
