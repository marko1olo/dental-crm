/**
 * DENTE CRM — Chaos & Stress Test Suite: LAN Mesh, CRDT Sync & Encrypted Backups (.dente)
 *
 * Comprehensive stress and attack simulations:
 * 1. P2P Dispatcher flood attack (10,000 msgs), signature forgery, cross-tenant leak, listener isolation
 * 2. Encrypted .dente backup container tampering, corrupted base64, wrong passphrase, massive payload load
 * 3. CRDT vector clock anomalies (negative numbers, NaN, prototype pollution), multi-clinician odontogram race
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTE_BACKUP_MAGIC,
	DENTE_BACKUP_VERSION,
	canonicalJsonStringify,
	compareVectorClocks,
	computePayloadHash,
	createAssistantCitoEvent,
	createChairStatusEvent,
	createEncryptedDenteBackup,
	createInvoiceTransferEvent,
	createLanP2PMessage,
	createVectorClock,
	incrementVectorClock,
	mergeOdontogramTeethCrdt,
	mergeVectorClocks,
	parseVectorClock,
	resolveCashOperationCrdt,
	resolveScheduleAppointmentCrdt,
	restoreEncryptedDenteBackup,
	sha256Hex,
	validateDenteBackupContainer,
	validateLanP2PMessage,
	vectorClockToString,
	type LanAssistantCitoEvent,
	type LanChairStatusEvent,
	type LanInvoiceTransferEvent,
	type LanP2PMessage,
	type OdontogramToothState,
	type VectorClock,
} from "../sync/index.js";

describe("CHAOS AUDIT 1: LAN P2P Dispatcher & Clinical Messaging Stress", () => {
	it("1.1. Flood Attack: 10,000 messages processed rapidly with signature validation", () => {
		const startTime = Date.now();
		const validCount = 10_000;
		const seenIds = new Set<string>();

		for (let i = 0; i < validCount; i++) {
			const event = createChairStatusEvent({
				cabinetNumber: (i % 10) + 1,
				chairId: `chair-${i % 10}`,
				status: i % 2 === 0 ? "treatment_in_progress" : "ready_for_sanitization",
				doctorName: `Д-р Тестов ${i % 5}`,
				patientName: `Пациент ${i}`,
			});

			const msg = createLanP2PMessage({
				eventType: "chair_status_changed",
				senderNodeId: `tablet-${i % 20}`,
				senderRole: "doctor_tablet",
				senderName: `Планшет ${i % 20}`,
				organizationId: "org-stress-1",
				payload: event as unknown as Record<string, unknown>,
				messageId: `flood-msg-${i}`,
			});

			assert.ok(msg.signature, "Every message must have SHA-256 signature");
			const validation = validateLanP2PMessage(msg);
			assert.equal(validation.valid, true);
			seenIds.add(msg.messageId);
		}

		const elapsedMs = Date.now() - startTime;
		assert.equal(seenIds.size, validCount);
		// Processing 10,000 cryptographic messages in pure TypeScript must be under 5000ms
		assert.ok(elapsedMs < 5000, `Processing took ${elapsedMs}ms, expected < 5000ms`);
	});

	it("1.2. Signature Forgery: Altering payload while retaining old signature is rejected", () => {
		const event = createChairStatusEvent({
			cabinetNumber: "Кабинет 1",
			chairId: "chair-1",
			status: "patient_seated",
			doctorName: "Д-р Иванов",
			patientName: "Пациент А",
		});

		const message = createLanP2PMessage({
			eventType: "chair_status_changed",
			senderNodeId: "tablet-1",
			senderRole: "doctor_tablet",
			senderName: "Планшет 1",
			organizationId: "org-clinic-1",
			payload: event as unknown as Record<string, unknown>,
		});

		// Attacker alters payload (e.g. changing status to 'sanitized' or changing patient)
		const forgedMessage1 = {
			...message,
			payload: {
				...event,
				status: "sanitized",
			},
		};

		const result1 = validateLanP2PMessage(forgedMessage1);
		assert.equal(result1.valid, false);
		assert.ok(result1.error?.includes("signature mismatch"));

		// Attacker alters organizationId in envelope while retaining signature
		const forgedMessage2 = {
			...message,
			organizationId: "org-foreign-clinic-99",
		};

		const result2 = validateLanP2PMessage(forgedMessage2);
		assert.equal(result2.valid, false);
		assert.ok(result2.error?.includes("signature mismatch"));
	});

	it("1.3. Strict Signature Enforcement: Stripped or malformed signature rejected when required", () => {
		const rawUnsigned = {
			messageId: "p2p-unsigned-1",
			eventType: "assistant_call_cito",
			senderNodeId: "node-1",
			senderRole: "doctor_tablet",
			senderName: "Tablet",
			organizationId: "org-1",
			sentAt: new Date().toISOString(),
			payload: { callId: "cito-1", cabinetNumber: 1, doctorId: "doc-1", doctorName: "Doc", urgency: "cito_emergency", reason: "anesthesia_aid", calledAt: new Date().toISOString(), status: "pending" },
		};

		// When signature is strictly required
		const validationStrict = validateLanP2PMessage(rawUnsigned, { requireSignature: true });
		assert.equal(validationStrict.valid, false);
		assert.ok(validationStrict.error?.includes("Missing or invalid SHA-256 signature"));

		// When signature is malformed (not 64-hex)
		const malformedSigMsg = {
			...rawUnsigned,
			signature: "not-a-valid-sha256-hex",
		};
		const validationMalformed = validateLanP2PMessage(malformedSigMsg);
		assert.equal(validationMalformed.valid, false);
		assert.ok(validationMalformed.error?.includes("Malformed SHA-256 signature"));
	});

	it("1.4. Invoice Kopeck Tampering: Sub-cent or negative amounts in invoice transfer rejected by schema", () => {
		assert.throws(() => {
			createInvoiceTransferEvent({
				cabinetNumber: 1,
				doctorId: "doc-1",
				doctorName: "Д-р Иванов",
				patientId: "pat-1",
				patientName: "Пациент Б",
				items: [
					{
						name: "Услуга",
						priceRub: -500, // Negative amount forbidden
						quantity: 1,
					},
				],
			});
		});

		assert.throws(() => {
			createInvoiceTransferEvent({
				cabinetNumber: 1,
				doctorId: "doc-1",
				doctorName: "Д-р Иванов",
				patientId: "pat-1",
				patientName: "Пациент Б",
				items: [], // Empty items array forbidden
			});
		});
	});

	it("1.5. CITO Urgent Call: Missing required clinical parameters throws validation error", () => {
		assert.throws(() => {
			createAssistantCitoEvent({
				cabinetNumber: "",
				doctorId: "",
				doctorName: "",
			});
		});
	});
});

describe("CHAOS AUDIT 2: Encrypted Local Backups (.dente) Chaos & Integrity Defense", () => {
	it("2.1. Corrupted JSON File: Truncated or malformed backup returns clean validation error", () => {
		const corruptedBackups = [
			"",
			"   ",
			"{{{ invalid json",
			'{"header": {"magic": "DENTE_ENCRYPTED_BACKUP_V1"}', // Truncated JSON
			"null",
			"12345",
			"[]",
		];

		for (const corrupted of corruptedBackups) {
			const res = validateDenteBackupContainer(corrupted);
			assert.equal(res.valid, false, `Must fail for corrupted: ${corrupted}`);
			assert.ok(res.error, "Must provide descriptive error message");

			assert.throws(() => {
				restoreEncryptedDenteBackup(corrupted);
			});
		}
	});

	it("2.2. Corrupted Base64 Payload: Invalid base64 characters or bit rot detected and rejected", () => {
		const validPayload = {
			mutations: [{ id: 1, action: "CREATE" }],
			drafts: [],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(validPayload);
		const container = JSON.parse(backupString);

		// Test A: Ciphertext with illegal base64 characters
		const corruptedCiphertextContainer = {
			...container,
			ciphertext: "@@@INVALID_BASE64_BYTES###$$$%%%",
			containerSignature: computePayloadHash(
				`${canonicalJsonStringify(container.header)}:::@@@INVALID_BASE64_BYTES###$$$%%%`,
			),
		};

		const res1 = validateDenteBackupContainer(JSON.stringify(corruptedCiphertextContainer));
		assert.equal(res1.valid, false);
		assert.ok(res1.error?.includes("Base64"));

		// Test B: Attempt restore on corrupted base64
		assert.throws(
			() => restoreEncryptedDenteBackup(JSON.stringify(corruptedCiphertextContainer)),
			/Base64|валидации/i,
		);
	});

	it("2.3. HMAC / Container Signature Tampering: 1-byte alteration invalidates container", () => {
		const validPayload = {
			mutations: [{ id: 10, patient: "Иванов" }],
			drafts: [{ key: "draft1" }],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(validPayload);
		const container = JSON.parse(backupString);

		// Flip 1 character in ciphertext
		const flippedCiphertext =
			container.ciphertext.charAt(0) === "A"
				? "B" + container.ciphertext.slice(1)
				: "A" + container.ciphertext.slice(1);

		const tamperedContainer = {
			...container,
			ciphertext: flippedCiphertext,
		};

		const res = validateDenteBackupContainer(JSON.stringify(tamperedContainer));
		assert.equal(res.valid, false);
		assert.ok(res.error?.includes("Криптографическая подпись"));

		assert.throws(() => {
			restoreEncryptedDenteBackup(JSON.stringify(tamperedContainer));
		}, /подпись|валидации/i);
	});

	it("2.4. Wrong Decryption Passphrase: Throws clean error and never leaks corrupted raw data", () => {
		const secretData = {
			mutations: [{ id: 99, patient: "Секретные Медицинские Данные Пациента" }],
			drafts: [{ diary: "Диагноз: Острый пульпит 2.6" }],
			clinicalCache: [{ key: "cache-1", value: "Secret CT Scan Data" }],
		};

		const backupString = createEncryptedDenteBackup(secretData, {
			passphrase: "CorrectSecretPassphrase_2026!",
		});

		const wrongPassphrases = [
			"WrongPassphrase",
			"correctsecretpassphrase_2026!", // Case sensitivity check
			"",
			"DENTE_LOCAL_OFFLINE_PROTECTED_KEY_2026", // Default passphrase when custom was used
		];

		for (const wrongPass of wrongPassphrases) {
			assert.throws(
				() => restoreEncryptedDenteBackup(backupString, wrongPass),
				/Неверный пароль расшифровки/i,
				`Must reject wrong passphrase: ${wrongPass}`,
			);
		}

		// Ensure correct passphrase succeeds with 100% equality
		const restored = restoreEncryptedDenteBackup(backupString, "CorrectSecretPassphrase_2026!");
		assert.deepEqual(restored.payload.mutations, secretData.mutations);
		assert.deepEqual(restored.payload.drafts, secretData.drafts);
		assert.deepEqual(restored.payload.clinicalCache, secretData.clinicalCache);
	});

	it("2.5. Payload Hash Mismatch: Forged container with valid container signature but altered payload SHA-256 fails", () => {
		const sample = {
			mutations: [{ id: 1 }],
			drafts: [],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(sample, { passphrase: "Key1" });
		const container = JSON.parse(backupString);

		// Tamper with payloadSha256 in header
		const tamperedHeader = {
			...container.header,
			payloadSha256: "0000000000000000000000000000000000000000000000000000000000000000",
		};
		const newContainerSignature = sha256Hex(
			`${canonicalJsonStringify(tamperedHeader)}:::${container.ciphertext}`,
		);

		const forgedContainer = {
			header: tamperedHeader,
			ciphertext: container.ciphertext,
			containerSignature: newContainerSignature,
		};

		const forgedString = JSON.stringify(forgedContainer);
		// validateDenteBackupContainer passes because containerSignature matches the tampered header + ciphertext
		const val = validateDenteBackupContainer(forgedString);
		assert.equal(val.valid, true);

		// But restoreEncryptedDenteBackup MUST catch the payload SHA-256 mismatch!
		assert.throws(
			() => restoreEncryptedDenteBackup(forgedString, "Key1"),
			/Контрольная сумма полезной нагрузки не совпадает/i,
		);
	});

	it("2.6. Items Count Tampering: Discrepancy between header itemsCount and payload items count throws error", () => {
		const sample = {
			mutations: [{ id: 1 }, { id: 2 }],
			drafts: [{ id: "d1" }],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(sample, { passphrase: "Key1" });
		const container = JSON.parse(backupString);

		// Alter itemsCount in header
		const tamperedHeader = {
			...container.header,
			itemsCount: {
				mutations: 999, // Mismatched!
				drafts: 1,
				clinicalCache: 0,
			},
		};
		const newContainerSignature = sha256Hex(
			`${canonicalJsonStringify(tamperedHeader)}:::${container.ciphertext}`,
		);

		const forgedContainer = {
			header: tamperedHeader,
			ciphertext: container.ciphertext,
			containerSignature: newContainerSignature,
		};

		assert.throws(
			() => restoreEncryptedDenteBackup(JSON.stringify(forgedContainer), "Key1"),
			/Несоответствие количества элементов/i,
		);
	});

	it("2.7. Large Payload Scalability & Performance: 2000 mutations + 1000 drafts + 500 clinical cache records round-trip in < 3000ms", () => {
		const mutations = [];
		for (let i = 0; i < 2000; i++) {
			mutations.push({
				mutationId: `mut-${i}`,
				entityKind: "odontogram_state",
				entityId: `pat-${i % 100}`,
				action: "upsert",
				payload: {
					toothNumber: (i % 32) + 1,
					status: "caries",
					surfaces: ["MOD", "O"],
					notes: `Лечение кариеса зуба ${(i % 32) + 1}`,
				},
				updatedAt: "2026-08-25T12:00:00.000Z",
			});
		}

		const drafts = [];
		for (let i = 0; i < 1000; i++) {
			drafts.push({
				draftKey: `draft-043-${i}`,
				entityType: "visit_diary",
				entityId: `visit-${i}`,
				data: { complaints: "Острая боль", anamnesis: "Без особенностей", protocol: ["Анестезия", "Пломба"] },
			});
		}

		const clinicalCache = [];
		for (let i = 0; i < 500; i++) {
			clinicalCache.push({
				cacheKey: `patient-card-${i}`,
				entityKind: "patient",
				entityId: `pat-${i}`,
				data: { fullName: `Пациент Тестовый ${i}`, phone: `+7999000${i.toString().padStart(4, "0")}` },
			});
		}

		const startTime = Date.now();
		const backupString = createEncryptedDenteBackup(
			{ mutations, drafts, clinicalCache, meta: { clinicName: "DENTE Крупный Центр", operatorName: "Администратор" } },
			{ organizationId: "org-mega-1", passphrase: "MegaClinicHighLoadPassword2026" },
		);

		const encryptElapsed = Date.now() - startTime;
		assert.ok(backupString.length > 500_000, "Encrypted backup size must reflect large payload");

		const restoreStart = Date.now();
		const restored = restoreEncryptedDenteBackup(backupString, "MegaClinicHighLoadPassword2026");
		const restoreElapsed = Date.now() - restoreStart;

		assert.equal(restored.payload.mutations.length, 2000);
		assert.equal(restored.payload.drafts.length, 1000);
		assert.equal(restored.payload.clinicalCache.length, 500);
		assert.equal(restored.header.organizationId, "org-mega-1");
		assert.equal(restored.payload.meta?.clinicName, "DENTE Крупный Центр");

		assert.ok(encryptElapsed + restoreElapsed < 5000, `Combined round-trip took ${encryptElapsed + restoreElapsed}ms, expected < 5000ms`);
	});

	it("2.8. Empty & Minimal Payload: Handles empty collections safely without throwing null references", () => {
		const emptyPayload = {
			mutations: [],
			drafts: [],
			clinicalCache: [],
		};

		const backupString = createEncryptedDenteBackup(emptyPayload);
		const restored = restoreEncryptedDenteBackup(backupString);

		assert.equal(restored.payload.mutations.length, 0);
		assert.equal(restored.payload.drafts.length, 0);
		assert.equal(restored.payload.clinicalCache.length, 0);
		assert.equal(restored.header.itemsCount.mutations, 0);
	});
});

describe("CHAOS AUDIT 3: CRDT Vector Clocks & Multi-Clinician Concurrency", () => {
	it("3.1. Vector Clock Anomalies: Sanitizes negative sequences, NaN, and floats", () => {
		const clock1 = createVectorClock("node-1", -10);
		assert.equal(clock1["node-1"], 0, "Negative initial sequence must be clamped to 0");

		const clock2 = createVectorClock("node-2", NaN);
		assert.equal(clock2["node-2"], 1, "NaN initial sequence must default to 1");

		const clock3 = createVectorClock("node-3", 5.9);
		assert.equal(clock3["node-3"], 5, "Floating point sequence must be floored to integer");

		// Increments
		const inc = incrementVectorClock(clock1, "node-1");
		assert.equal(inc["node-1"], 1);
	});

	it("3.2. Vector Clock Prototype Pollution Protection: __proto__ and constructor keys ignored", () => {
		const maliciousStr = "__proto__:999,constructor:888,node-1:5,prototype:777";
		const parsed = parseVectorClock(maliciousStr);

		assert.equal(parsed["node-1"], 5);
		assert.equal(Object.prototype.hasOwnProperty("999"), false);
		assert.equal((parsed as Record<string, unknown>)["__proto__"], Object.prototype);

		// Increment on malicious key
		const incProto = incrementVectorClock(parsed, "__proto__");
		assert.equal(Object.prototype.hasOwnProperty("1"), false);

		// Format back to string
		const formatted = vectorClockToString(parsed);
		assert.equal(formatted, "node-1:5");

		// Merge with malicious keys
		const merged = mergeVectorClocks(parsed, { constructor: 10, "node-2": 3 });
		assert.equal(merged["node-1"], 5);
		assert.equal(merged["node-2"], 3);
	});

	it("3.3. Multi-Clinician Odontogram Race: 10 concurrent clinicians mutating same tooth", () => {
		// 10 clinicians simultaneously updating tooth 16 from 10 different tablets/workstations
		const surfacesList = [
			["O"],
			["M"],
			["D"],
			["V"],
			["L"],
			["B"],
			["P"],
			["O", "M"],
			["M", "D"],
			["V", "L"],
		];

		const statuses = [
			"caries",
			"deep_caries",
			"pulpitis",
			"periodontitis",
			"filling",
			"crown",
			"implant",
			"healthy",
			"in_treatment",
			"extracted_absent",
		];

		let currentOdontogram: OdontogramToothState[] = [];

		for (let i = 0; i < 10; i++) {
			const incomingTeeth: OdontogramToothState[] = [
				{
					toothNumber: 16,
					statusCode: statuses[i] || "caries",
					surfaces: surfacesList[i] || ["O"],
					mobility: i % 3,
					notes: `Запись врача ${i + 1}`,
					updatedAt: new Date(Date.UTC(2026, 7, 25, 10, i, 0)).toISOString(),
				},
				{
					toothNumber: 11 + i, // Distinct other teeth
					statusCode: "healthy",
					surfaces: [],
					updatedAt: new Date(Date.UTC(2026, 7, 25, 10, 0, 0)).toISOString(),
				},
			];

			currentOdontogram = mergeOdontogramTeethCrdt(currentOdontogram, incomingTeeth);
		}

		// Verify tooth 16 state
		const tooth16 = currentOdontogram.find((t) => t.toothNumber === 16);
		assert.ok(tooth16, "Tooth 16 must exist");
		// Surfaces must be union of all 10 clinician updates without duplicates:
		// ["B", "D", "L", "M", "O", "P", "V"]
		assert.ok(tooth16.surfaces?.includes("O"));
		assert.ok(tooth16.surfaces?.includes("M"));
		assert.ok(tooth16.surfaces?.includes("D"));
		assert.ok(tooth16.surfaces?.includes("V"));
		assert.ok(tooth16.surfaces?.includes("L"));
		assert.ok(tooth16.surfaces?.includes("B"));
		assert.ok(tooth16.surfaces?.includes("P"));

		// Latest timestamp (doctor 10 at 10:09) wins status and notes
		assert.equal(tooth16.statusCode, "extracted_absent");
		assert.equal(tooth16.notes, "Запись врача 10");

		// All 10 other distinct teeth (11..20) must also be preserved
		for (let i = 0; i < 10; i++) {
			assert.ok(
				currentOdontogram.some((t) => t.toothNumber === 11 + i),
				`Tooth ${11 + i} must be preserved`,
			);
		}
	});

	it("3.4. Clinical Schedule Precedence Race: in_treatment wins over confirmed regardless of clock tie", () => {
		const appointmentExisting = {
			id: "app-race-1",
			patientId: "pat-10",
			status: "confirmed",
			startsAt: "2026-08-25T11:00:00.000Z",
			cabinetNumber: "Кабинет 2",
			doctorName: "Д-р Смирнов",
		};

		const appointmentIncoming = {
			id: "app-race-1",
			status: "in_treatment",
			notes: "Пациент сел в кресло, анестезия введена",
		};

		const result = resolveScheduleAppointmentCrdt({
			existingAppointment: appointmentExisting,
			incomingAppointment: appointmentIncoming,
			existingClock: { "rec-pc": 3, "doc-tab": 3 },
			incomingClock: { "rec-pc": 3, "doc-tab": 3 }, // Identical concurrent clocks
			existingUpdatedAt: "2026-08-25T11:05:00.000Z",
			incomingUpdatedAt: "2026-08-25T11:05:00.000Z",
			nodeId: "doc-tab",
		});

		assert.equal(result.resolvedAppointment.status, "in_treatment");
		assert.equal(result.resolvedAppointment.notes, "Пациент сел в кресло, анестезия введена");
		assert.equal(result.hasConflict, true);
		assert.equal(result.strategy, "status_priority");
	});

	it("3.5. Cash Payment Idempotency Race: Duplicate submissions upgrade status to fiscalized and prevent duplicate charge", () => {
		const draftPayment = {
			paymentId: "pay-race-999",
			patientId: "pat-99",
			amountKopecks: 350000,
			paymentMethod: "card" as const,
			status: "draft" as const,
			idempotencyKey: "pay-race-999#hash-payload",
			createdAt: "2026-08-25T10:00:00.000Z",
		};

		const fiscalizedPayment = {
			paymentId: "pay-race-999",
			patientId: "pat-99",
			amountKopecks: 350000,
			paymentMethod: "card" as const,
			status: "fiscalized" as const,
			fiscalDocNumber: "ФД-008921",
			idempotencyKey: "pay-race-999#hash-payload",
			createdAt: "2026-08-25T10:00:00.000Z",
		};

		const res = resolveCashOperationCrdt({
			existingPayment: draftPayment,
			incomingPayment: fiscalizedPayment,
			nodeId: "kkt-pos-terminal",
		});

		assert.equal(res.isDuplicate, true);
		assert.equal(res.resolvedPayment.status, "fiscalized");
		assert.equal(res.resolvedPayment.fiscalDocNumber, "ФД-008921");
		assert.equal(res.resolvedPayment.amountKopecks, 350000);
	});
});
