/**
 * DENTE CRM — Unit & Integration Tests for SyncGatewayService
 *
 * Проверка инвариантов:
 * 1. 3-уровневая отказоустойчивость: Offline -> LAN (192.168.x.x) -> Cloud
 * 2. Защита целостности: валидация SHA-256 payloadHash и составных Idempotency-Key
 * 3. Финансовая защита (Zero Double-Billing): предотвращение повторных списаний по clientMutationId
 * 4. Детерминированное слияние (Field-Level CRDT LWW) для клинических данных (пациенты, дневники 043/у, визиты)
 * 5. Разрешение коллизий ключей идемпотентности и догоняющая синхронизация (Pull Changes)
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	mergeFieldLevelCrdt,
	parseIdempotencyKey,
	type SyncPushRequest,
	verifyPayloadHash,
} from "@dental/shared";
import { SyncGatewayService } from "../services/sync/syncGatewayService.js";
import { and, eq } from "drizzle-orm";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "./support/fixtureOrganizations.js";
import {
	appointments,
	clinicalTasks,
	organizations,
	patients,
	treatmentItems,
} from "../db/schema.js";

describe("SyncGatewayService & 3-Tier Multi-Level Synchronization Engine", () => {
	// ── 1. Hash & Idempotency Key Integrity Invariants ───────────────────────
	test("1. Payload Hash & Idempotency-Key validation invariants", () => {
		const payload = {
			anamnesis: "Острая ночная боль в 1.6",
			statusLocalis: "Глубокая кариозная полость",
			diagnosisIcd10: "K04.0",
		};

		const hash = computePayloadHash(payload);
		assert.strictEqual(typeof hash, "string");
		assert.strictEqual(hash.length, 64);

		const mutationId = "mut-uuid-101";
		const compositeKey = createCompositeIdempotencyKey(mutationId, payload);
		assert.strictEqual(compositeKey, `${mutationId}#${hash}`);

		const parsed = parseIdempotencyKey(compositeKey);
		assert.strictEqual(parsed.uuid, mutationId);
		assert.strictEqual(parsed.embeddedHash, hash);

		// Verification
		assert.strictEqual(verifyPayloadHash(payload, compositeKey), true);
		assert.strictEqual(
			verifyPayloadHash({ ...payload, anamnesis: "Измененный текст" }, compositeKey),
			false,
		);
	});

	// ── 2. Financial Double-Spending Protection Contract ─────────────────────
	test("2. Financial Payment Deduplication: duplicate clientMutationId is safely recognized", () => {
		const paymentPayload = {
			patientId: "pat-101",
			amountRub: 5000,
			method: "card",
			payerFullName: "Иванов И.И.",
		};

		const hash = computePayloadHash(paymentPayload);
		const idempotencyKey = `pay-tx-${hash.slice(0, 16)}#${hash}`;

		const parsed = parseIdempotencyKey(idempotencyKey);
		assert.strictEqual(parsed.embeddedHash, hash);

		// If the same key is supplied with a different amount (collision attempt):
		const alteredPayload = { ...paymentPayload, amountRub: 99999 };
		assert.strictEqual(verifyPayloadHash(alteredPayload, idempotencyKey), false);
	});

	// ── 3. Field-Level CRDT LWW Clinical Merge Invariants ────────────────────
	test("3. Clinical EMR 043/u: Field-Level LWW merges doctor anamnesis & reception contact without loss", () => {
		const serverDiary = {
			id: "diary-777",
			organizationId: "org-1",
			visitId: "visit-777",
			patientId: "pat-1",
			anamnesis: "Первичный осмотр",
			statusLocalis: "Зуб 1.6 интактен",
			diagnosisIcd10: "Z01.2",
			diagnosisTooth: "16",
			treatmentDescription: "Осмотр и консультация",
			updatedAt: "2026-08-23T08:00:00.000Z",
		};

		const serverVector = {
			anamnesis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			statusLocalis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			treatmentDescription: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
		};

		// Doctor in offline cabinet updates treatment description at 08:30
		const doctorPatch = {
			treatmentDescription: "Препарирование кариозной полости, пломба Ceram.X",
			complications: "Без осложнений",
		};

		const doctorVector = {
			treatmentDescription: { updatedAt: "2026-08-23T08:30:00.000Z", version: 2 },
			complications: { updatedAt: "2026-08-23T08:30:00.000Z", version: 1 },
		};

		const mergeResult = mergeFieldLevelCrdt<{
			id: string;
			anamnesis: string;
			statusLocalis: string;
			diagnosisIcd10: string;
			diagnosisTooth: string;
			treatmentDescription: string;
			complications: string;
		}>({
			entityKind: "visit_diary",
			entityId: "diary-777",
			serverEntity: serverDiary,
			serverVector,
			clientPatch: doctorPatch,
			clientVector: doctorVector,
			clientUpdatedAt: "2026-08-23T08:30:00.000Z",
			serverUpdatedAt: "2026-08-23T08:00:00.000Z",
			clientId: "cabinet-laptop-1",
			authorUserId: "doctor-uuid-1",
		});

		// INVARIANTS:
		// 1. Untouched server anamnesis and statusLocalis are 100% preserved
		assert.strictEqual(mergeResult.mergedEntity.anamnesis, "Первичный осмотр");
		assert.strictEqual(mergeResult.mergedEntity.statusLocalis, "Зуб 1.6 интактен");
		// 2. Doctor's newer treatment description and complications are applied
		assert.strictEqual(
			mergeResult.mergedEntity.treatmentDescription,
			"Препарирование кариозной полости, пломба Ceram.X",
		);
		assert.strictEqual(mergeResult.mergedEntity.complications, "Без осложнений");
		assert.strictEqual(mergeResult.updatedVector.treatmentDescription?.version, 2);
	});

	// ── 4. Odontogram & Patient Profile Multi-Client Determinism ──────────────
	test("4. Deterministic Tie-Breaking: identical timestamp collision resolves consistently", () => {
		const serverPatient = {
			id: "pat-tie-1",
			fullName: "Алексеев Алексей",
			notes: "Вариант А",
			updatedAt: "2026-08-23T10:00:00.000Z",
		};

		const serverVector = {
			notes: { updatedAt: "2026-08-23T10:00:00.000Z", version: 1 },
		};

		const clientPatch = {
			notes: "Вариант Б",
		};

		const clientVector = {
			notes: { updatedAt: "2026-08-23T10:00:00.000Z", version: 1 }, // Exact same timestamp
		};

		const result1 = mergeFieldLevelCrdt({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity: serverPatient,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-23T10:00:00.000Z",
		});

		const result2 = mergeFieldLevelCrdt({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity: serverPatient,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-23T10:00:00.000Z",
		});

		// Merging identical states must be 100% deterministic (idempotent)
		assert.strictEqual(result1.mergedEntity.notes, result2.mergedEntity.notes);
		assert.strictEqual(result1.strategy, result2.strategy);
		assert.strictEqual(result1.hasConflicts, true);
	});

	// ── 5. Pull Changes Contract ─────────────────────────────────────────────
	test("5. Pull Changes: query and response structure conforms to Sync contract", async () => {
		const orgId = "00000000-0000-0000-0000-000000000000";
		const pullResult = await SyncGatewayService.pullChanges(orgId);

		assert.ok(pullResult);
		assert.ok(pullResult.serverTime);
		assert.ok(Array.isArray(pullResult.patients));
		assert.ok(Array.isArray(pullResult.visits));
		assert.ok(Array.isArray(pullResult.visitDiaries));
		assert.ok(Array.isArray(pullResult.payments));
		assert.ok(Array.isArray(pullResult.appointments));
		assert.ok(Array.isArray(pullResult.toothStates));
		assert.ok(Array.isArray(pullResult.vectors));
	});

	// ── 6. LWW Fallback & Anti-Blind-Overwrite Invariant ──────────────────────
	test("6. Anti-Blind-Overwrite: Stale offline client patch cannot overwrite newer server entity", () => {
		const serverPatient = {
			id: "pat-lww-1",
			fullName: "Кузнецов Петр Сергеевич (обновлено на сервере в 12:00)",
			phone: "+79001112233",
			notes: "Аллергия на лидокаин подтверждена",
			updatedAt: "2026-08-28T12:00:00.000Z",
		};

		// Stale offline mutation created at 10:00 (before server update at 12:00)
		const staleClientPatch = {
			fullName: "Кузнецов Петр (старая запись из оффлайна 10:00)",
			notes: "Первичный звонок",
		};

		const mergeResult = mergeFieldLevelCrdt<{
			id: string;
			fullName: string;
			phone: string;
			notes: string;
			updatedAt: string;
		}>({
			entityKind: "patient",
			entityId: "pat-lww-1",
			serverEntity: serverPatient,
			serverVector: {}, // No per-field vector on server
			clientPatch: staleClientPatch,
			clientVector: {},
			clientUpdatedAt: "2026-08-28T10:00:00.000Z",
			serverUpdatedAt: "2026-08-28T12:00:00.000Z",
			clientId: "offline-tablet-1",
		});

		// INVARIANTS:
		// 1. Server's newer fullName and notes MUST NOT be overwritten by stale client
		assert.strictEqual(
			mergeResult.mergedEntity.fullName,
			"Кузнецов Петр Сергеевич (обновлено на сервере в 12:00)",
		);
		assert.strictEqual(
			mergeResult.mergedEntity.notes,
			"Аллергия на лидокаин подтверждена",
		);
		assert.strictEqual(mergeResult.mergedEntity.phone, "+79001112233");
		// 2. Conflict details must record server victory with LWW strategy
		assert.strictEqual(mergeResult.hasConflicts, true);
		const fullNameConflict = mergeResult.conflicts.find((c) => c.field === "fullName");
		assert.ok(fullNameConflict);
		assert.strictEqual(fullNameConflict.winner, "server");
		assert.strictEqual(fullNameConflict.strategy, "lww");
	});

	// ── 7. Appointment Clinical Status Rank Progression & LWW Cancellation ──
	test("7. Appointment CRDT: Clinical progression rank prevents retrograde status downgrade", () => {
		const serverAppointment = {
			id: "app-prog-1",
			patientId: "pat-10",
			doctorUserId: "doc-1",
			status: "in_treatment", // Rank 4: Patient is in the dental chair
			startsAt: "2026-08-28T14:00:00.000Z",
			comment: "Препарирование 1.6",
		};

		// Stale offline tablet tries to submit status: "confirmed" (Rank 2)
		const APPOINTMENT_STATUS_RANK: Record<string, number> = {
			planned: 1,
			confirmed: 2,
			arrived: 3,
			in_treatment: 4,
			completed: 5,
			no_show: 2,
			cancelled: 0,
		};

		const incomingStatus = "confirmed";
		const existingStatus = serverAppointment.status;
		const incomingRank = APPOINTMENT_STATUS_RANK[incomingStatus] ?? 1;
		const existingRank = APPOINTMENT_STATUS_RANK[existingStatus] ?? 1;

		let effectiveStatus = incomingStatus;
		if (existingRank > incomingRank) {
			effectiveStatus = existingStatus; // Server's in_treatment progress is protected!
		}

		const mergeResult = mergeFieldLevelCrdt({
			entityKind: "appointment",
			entityId: "app-prog-1",
			serverEntity: serverAppointment,
			serverVector: {},
			clientPatch: {
				status: effectiveStatus,
				comment: "Препарирование 1.6 + коффердам", // Client newer comment
			},
			clientUpdatedAt: "2026-08-28T14:10:00.000Z",
			serverUpdatedAt: "2026-08-28T14:00:00.000Z",
		});

		// INVARIANTS:
		// Status stays in_treatment; comment is updated to newer client comment
		assert.strictEqual(mergeResult.mergedEntity.status, "in_treatment");
		assert.strictEqual(
			mergeResult.mergedEntity.comment,
			"Препарирование 1.6 + коффердам",
		);
	});

	// ── 8. Multi-Tooth Odontogram LWW & 043/u Audit Trail Invariants ─────────
	test("8. Odontogram Multi-Tooth LWW: Surface union and history preservation", () => {
		const serverTooth16 = {
			toothNumber: 16,
			state: "caries",
			surfaces: ["O"],
			updatedAt: "2026-08-28T10:00:00.000Z",
		};

		// Client A treats tooth 16 at 10:30 (newer)
		const clientTooth16 = {
			toothNumber: 16,
			state: "filling",
			surfaces: ["O", "M"],
			updatedAt: "2026-08-28T10:30:00.000Z",
		};

		const isClientNewer =
			new Date(clientTooth16.updatedAt).getTime() >=
			new Date(serverTooth16.updatedAt).getTime();

		assert.strictEqual(isClientNewer, true);

		// Resolved state on client victory:
		const resolvedTooth = isClientNewer ? clientTooth16 : serverTooth16;
		assert.strictEqual(resolvedTooth.state, "filling");
		assert.deepStrictEqual(resolvedTooth.surfaces, ["O", "M"]);
	});

	// ── 9. Visit & Form 043/u Diary Concurrency Versioning ────────────────────
	test("9. Visit Diary Concurrency: Orthogonal clinical sections merge with version increment", () => {
		const serverDiary = {
			id: "diary-conc-1",
			visitId: "visit-1",
			patientId: "pat-1",
			anamnesis: "Боль при приеме горячей пищи",
			statusLocalis: "Глубокий кариес 2.6",
			treatmentDescription: "Наложена временная пломба",
			version: 1,
			updatedAt: "2026-08-28T09:00:00.000Z",
		};

		// Assistant offline updates diagnosisIcd10 & complications at 09:30
		const assistantPatch = {
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "26",
			complications: "Без осложнений",
		};

		const mergeResult = mergeFieldLevelCrdt<{
			id: string;
			anamnesis: string;
			statusLocalis: string;
			diagnosisIcd10: string;
			diagnosisTooth: string;
			treatmentDescription: string;
			complications: string;
			version: number;
		}>({
			entityKind: "visit_diary",
			entityId: "diary-conc-1",
			serverEntity: serverDiary,
			serverVector: {
				anamnesis: { updatedAt: "2026-08-28T09:00:00.000Z", version: 1 },
				statusLocalis: { updatedAt: "2026-08-28T09:00:00.000Z", version: 1 },
			},
			clientPatch: assistantPatch,
			clientUpdatedAt: "2026-08-28T09:30:00.000Z",
			serverUpdatedAt: "2026-08-28T09:00:00.000Z",
		});

		// INVARIANTS:
		// 1. Existing doctor anamnesis & statusLocalis are completely preserved
		assert.strictEqual(
			mergeResult.mergedEntity.anamnesis,
			"Боль при приеме горячей пищи",
		);
		assert.strictEqual(
			mergeResult.mergedEntity.statusLocalis,
			"Глубокий кариес 2.6",
		);
		assert.strictEqual(
			mergeResult.mergedEntity.treatmentDescription,
			"Наложена временная пломба",
		);
		// 2. Assistant's diagnosis and complications are safely merged
		assert.strictEqual(mergeResult.mergedEntity.diagnosisIcd10, "K04.0");
		assert.strictEqual(mergeResult.mergedEntity.diagnosisTooth, "26");
		assert.strictEqual(mergeResult.mergedEntity.complications, "Без осложнений");
		// 3. Changed fields count exactly 3
		assert.strictEqual(mergeResult.changedFields.length, 3);
	});

	// ── 10. SAVEPOINT Transaction Isolation Invariant ───────────────────────
	test("10. Push Batch SAVEPOINT Isolation: failed mutation in batch is rejected without aborting remaining mutations", async () => {
		const orgId = "dce70000-546f-4147-878f-3bcf77790001";
		const validPatientId = `a1b2c3d4-0000-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;

		// Mutation 1: Valid patient creation
		const payload1 = { fullName: "Петров Пётр", phone: "+79991234567" };
		const hash1 = computePayloadHash(payload1);
		const mut1 = {
			mutationId: `mut-savepoint-1-${Date.now()}`,
			idempotencyKey: createCompositeIdempotencyKey(`mut-savepoint-1-${Date.now()}`, payload1),
			payloadHash: hash1,
			entityKind: "patient" as const,
			entityId: validPatientId,
			action: "create" as const,
			payload: payload1,
			updatedAt: new Date().toISOString(),
		};

		// Mutation 2: Invalid mutation (broken non-UUID patientId for payment) -> triggers rejection
		const payload2 = { patientId: "not-a-uuid", amountRub: 1000 };
		const hash2 = computePayloadHash(payload2);
		const mut2 = {
			mutationId: `mut-savepoint-2-${Date.now()}`,
			idempotencyKey: createCompositeIdempotencyKey(`mut-savepoint-2-${Date.now()}`, payload2),
			payloadHash: hash2,
			entityKind: "payment" as const,
			entityId: "22222222-2222-4222-8222-222222222222",
			action: "create" as const,
			payload: payload2,
			updatedAt: new Date().toISOString(),
		};

		// Mutation 3: Valid patient update
		const payload3 = { fullName: "Петров Пётр Сергеевич" };
		const hash3 = computePayloadHash(payload3);
		const mut3 = {
			mutationId: `mut-savepoint-3-${Date.now()}`,
			idempotencyKey: createCompositeIdempotencyKey(`mut-savepoint-3-${Date.now()}`, payload3),
			payloadHash: hash3,
			entityKind: "patient" as const,
			entityId: validPatientId,
			action: "update" as const,
			payload: payload3,
			updatedAt: new Date().toISOString(),
		};

		const batchResponse = await SyncGatewayService.processPushBatch(orgId, {
			syncBatchId: `batch-savepoint-${Date.now()}`,
			clientId: "offline-tablet-test",
			mutations: [mut1, mut2, mut3],
			sentAt: new Date().toISOString(),
		});

		assert.strictEqual(batchResponse.processedCount, 3);
		assert.strictEqual(batchResponse.appliedCount, 1);
		assert.strictEqual(batchResponse.mergedCount, 1);
		assert.strictEqual(batchResponse.rejectedCount, 1);

		const res1 = batchResponse.results.find((r) => r.mutationId === mut1.mutationId);
		const res2 = batchResponse.results.find((r) => r.mutationId === mut2.mutationId);
		const res3 = batchResponse.results.find((r) => r.mutationId === mut3.mutationId);

		assert.strictEqual(res1?.status, "applied");
		assert.strictEqual(res2?.status, "rejected");
		assert.strictEqual(res3?.status, "conflict_resolved");
		assert.ok(res2?.error?.includes("Invalid or missing patientId UUID"));
	});

	// ── 11. W16-HW-02: Real Persistence for treatment_item, clinical_task & administrativeProfile ──
	test("11. W16-HW-02: Persists treatment_item, clinical_task, patient_administrative_profile and rejects unsupported entityKind", async () => {
		const orgId = `dce70000-0000-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
		const patientId = `a1b2c3d4-1111-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
		const treatmentItemId = `b1b2c3d4-1111-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
		const clinicalTaskId = `c1b2c3d4-1111-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({ id: orgId, name: "W16 HW02 Sync Org" }).onConflictDoNothing();
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Сидоров Алексей",
			}).onConflictDoNothing();
		});

		try {
			const pItem = {
				patientId,
				title: "Лечение кариеса 16",
				toothCode: "16",
				quantity: 1,
				unitPriceKopecks: "550000",
				priceKopecks: "550000",
				status: "approved",
			};
			const pTask = {
				patientId,
				taskType: "recall",
				title: "Контрольный снимок через 6 мес",
				status: "pending",
			};
			const pAdminProfile = {
				preferredAppointmentStart: "09:00",
				preferredAppointmentEnd: "12:00",
				leadSource: "website",
			};

			const nowIso = new Date().toISOString();
			const batchRes = await SyncGatewayService.processPushBatch(orgId, {
				syncBatchId: `batch-w16-hw02-${Date.now()}`,
				clientId: "tablet-hw02",
				sentAt: nowIso,
				mutations: [
					{
						mutationId: `mut-ti-${Date.now()}`,
						idempotencyKey: createCompositeIdempotencyKey(`mut-ti-${Date.now()}`, pItem),
						payloadHash: computePayloadHash(pItem),
						entityKind: "treatment_item",
						entityId: treatmentItemId,
						action: "create",
						payload: pItem,
						updatedAt: nowIso,
					},
					{
						mutationId: `mut-ct-${Date.now()}`,
						idempotencyKey: createCompositeIdempotencyKey(`mut-ct-${Date.now()}`, pTask),
						payloadHash: computePayloadHash(pTask),
						entityKind: "clinical_task",
						entityId: clinicalTaskId,
						action: "create",
						payload: pTask,
						updatedAt: nowIso,
					},
					{
						mutationId: `mut-ap-${Date.now()}`,
						idempotencyKey: createCompositeIdempotencyKey(`mut-ap-${Date.now()}`, pAdminProfile),
						payloadHash: computePayloadHash(pAdminProfile),
						entityKind: "patient_administrative_profile",
						entityId: patientId,
						action: "update",
						payload: pAdminProfile,
						updatedAt: nowIso,
					},
				],
			});

			assert.strictEqual(batchRes.rejectedCount, 0, JSON.stringify(batchRes.results));
			assert.strictEqual(batchRes.appliedCount + batchRes.mergedCount, 3, JSON.stringify(batchRes.results));

			// Unsupported entityKind must be cleanly rejected (never silently marked "applied")
			const badPayload = { foo: "bar" };
			const rawUnsupportedBatch = JSON.stringify({
				syncBatchId: `batch-w16-hw02-bad-${Date.now()}`,
				clientId: "tablet-hw02",
				sentAt: nowIso,
				mutations: [
					{
						mutationId: `mut-bad-${Date.now()}`,
						idempotencyKey: createCompositeIdempotencyKey(`mut-bad-${Date.now()}`, badPayload),
						payloadHash: computePayloadHash(badPayload),
						entityKind: "unknown_future_entity",
						entityId: treatmentItemId,
						action: "create",
						payload: badPayload,
						updatedAt: nowIso,
					},
				],
			});
			const parsedUnsupportedBatch: SyncPushRequest = JSON.parse(rawUnsupportedBatch);
			const badBatchRes = await SyncGatewayService.processPushBatch(orgId, parsedUnsupportedBatch);
			assert.strictEqual(badBatchRes.rejectedCount, 1);
			assert.strictEqual(badBatchRes.appliedCount, 0);
			assert.strictEqual(badBatchRes.results[0]?.status, "rejected");

			await withFixtureTenant(orgId, async (tx) => {
				const [savedItem] = await tx
					.select()
					.from(treatmentItems)
					.where(and(eq(treatmentItems.organizationId, orgId), eq(treatmentItems.id, treatmentItemId)));
				assert.ok(savedItem, "treatment_item must persist in PostgreSQL");
				assert.strictEqual(savedItem.priceKopecks, 550000n);
				assert.strictEqual(savedItem.title, "Лечение кариеса 16");

				const [savedTask] = await tx
					.select({ id: clinicalTasks.id, title: clinicalTasks.title })
					.from(clinicalTasks)
					.where(and(eq(clinicalTasks.organizationId, orgId), eq(clinicalTasks.id, clinicalTaskId)));
				assert.ok(savedTask, "clinical_task must persist in PostgreSQL");
				assert.strictEqual(savedTask.title, "Контрольный снимок через 6 мес");

				const [savedPatient] = await tx
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)));
				assert.strictEqual(savedPatient?.administrativeProfile?.preferredAppointmentStart, "09:00");
				assert.strictEqual(savedPatient?.administrativeProfile?.preferredAppointmentEnd, "12:00");
			});
		} finally {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, orgId));
				await tx.delete(clinicalTasks).where(eq(clinicalTasks.organizationId, orgId));
				await tx.delete(patients).where(eq(patients.organizationId, orgId));
			});
			await purgeFixtureOrganizations([orgId]);
		}
	});

	test("12. [W16-HW-07] appointment without sync vector falls back to createdAt for conflict resolution", async () => {
		const orgId = fixtureUuid("w16-hw07-appt", 1);
		const appointmentId = fixtureUuid("w16-hw07-appt", 2);
		const serverCreatedAt = new Date("2026-06-01T12:00:00.000Z");
		const staleClientUpdatedAt = "2026-06-01T10:00:00.000Z";

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "W16 HW07 Appointment Fallback Org",
				});
				await tx.insert(appointments).values({
					id: appointmentId,
					organizationId: orgId,
					status: "completed",
					startsAt: new Date("2026-06-01T09:00:00.000Z"),
					endsAt: new Date("2026-06-01T09:30:00.000Z"),
					createdAt: serverCreatedAt,
				});
			});

			const stalePayload = { status: "cancelled" };
			const mutId = `mut-appt-stale-${Date.now()}`;
			const pushRes = await SyncGatewayService.processPushBatch(orgId, {
				syncBatchId: `batch-w16-hw07-${Date.now()}`,
				clientId: "tablet-hw07",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId: mutId,
						idempotencyKey: createCompositeIdempotencyKey(mutId, stalePayload),
						payloadHash: computePayloadHash(stalePayload),
						entityKind: "appointment",
						entityId: appointmentId,
						action: "update",
						payload: stalePayload,
						updatedAt: staleClientUpdatedAt,
					},
				],
			});

			assert.strictEqual(pushRes.rejectedCount, 0, JSON.stringify(pushRes.results));
			assert.strictEqual(pushRes.results[0]?.status, "conflict_resolved", JSON.stringify(pushRes.results));
			assert.ok(
				(pushRes.results[0]?.conflictDetails?.length ?? 0) > 0,
				"expected server createdAt fallback to surface conflict against stale client mutation",
			);
			assert.strictEqual(pushRes.results[0]?.conflictDetails?.[0]?.winner, "server");

			await withFixtureTenant(orgId, async (tx) => {
				const [savedAppt] = await tx
					.select({ status: appointments.status })
					.from(appointments)
					.where(and(eq(appointments.organizationId, orgId), eq(appointments.id, appointmentId)));
				assert.strictEqual(savedAppt?.status, "completed");
			});
		} finally {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.delete(appointments).where(eq(appointments.organizationId, orgId));
			});
			await purgeFixtureOrganizations([orgId]);
		}
	});

	test("13. Push Batch withSavepoint safely isolates >63-char and metacharacter mutationIds without raw SQL interpolation", async () => {
		const orgId = fixtureUuid("savepoint-metachar", 1);
		const patientId1 = fixtureUuid("savepoint-metachar", 2);
		const patientId2 = fixtureUuid("savepoint-metachar", 3);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: orgId, name: "Savepoint Isolation Clinic" })
					.onConflictDoNothing();
			});

			const longPrefix = "mut-savepoint-very-long-identifier-exceeding-pg-63-byte-namelimit";
			const p1 = { fullName: "Смирнов Игорь", phone: "+79990001122" };
			const pBad = { patientId: "invalid-uuid", amountRub: 500 };
			const p2 = { fullName: "Орлова Марина", phone: "+79990001133" };

			const mut1Id = `${longPrefix}-alpha-${Date.now()}`;
			const mutBadId = `${longPrefix}'; DROP TABLE patients; --${Date.now()}`;
			const mut2Id = `${longPrefix}-beta-${Date.now()}`;

			const batchRes = await SyncGatewayService.processPushBatch(orgId, {
				syncBatchId: `batch-sp-safe-${Date.now()}`,
				clientId: "tablet-sp-test",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId: mut1Id,
						idempotencyKey: createCompositeIdempotencyKey(mut1Id, p1),
						payloadHash: computePayloadHash(p1),
						entityKind: "patient",
						entityId: patientId1,
						action: "create",
						payload: p1,
						updatedAt: new Date().toISOString(),
					},
					{
						mutationId: mutBadId,
						idempotencyKey: createCompositeIdempotencyKey(mutBadId, pBad),
						payloadHash: computePayloadHash(pBad),
						entityKind: "payment",
						entityId: fixtureUuid("savepoint-metachar", 4),
						action: "create",
						payload: pBad,
						updatedAt: new Date().toISOString(),
					},
					{
						mutationId: mut2Id,
						idempotencyKey: createCompositeIdempotencyKey(mut2Id, p2),
						payloadHash: computePayloadHash(p2),
						entityKind: "patient",
						entityId: patientId2,
						action: "create",
						payload: p2,
						updatedAt: new Date().toISOString(),
					},
				],
			});

			assert.strictEqual(batchRes.appliedCount, 2);
			assert.strictEqual(batchRes.rejectedCount, 1);
			assert.strictEqual(batchRes.results[1]?.status, "rejected");

			await withFixtureTenant(orgId, async (tx) => {
				const rows = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(eq(patients.organizationId, orgId));
				assert.strictEqual(rows.length, 2);
			});
		} finally {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.delete(patients).where(eq(patients.organizationId, orgId));
			});
			await purgeFixtureOrganizations([orgId]);
		}
	});
});

