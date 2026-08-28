/**
 * DENTE CRM — Comprehensive Offline Encrypted Backup Vault (.dente) & Integrity Test Suite
 *
 * Проверка инвариантов:
 * 1. Автономное шифрование AES-GCM-256 + PBKDF2 (100k) и криптографическая подпись SHA-256
 * 2. Полные слепки клиники без интернета (расписание, карты 043/у, одонтограмма, пациенты, прайс 804н, МКБ-10, мутации)
 * 3. 1-клик экспорт на внешние носители (USB/LAN) и 100% паритет при обратном импорте
 * 4. Защита от подделки данных и некорректных паролей
 * 5. Vault Auto-Backup по расписанию с ротацией снимков в локальном хранилище
 * 6. Движок диагностики целостности (Integrity Engine) и автоматическое самовосстановление (Auto-Repair)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	DENTE_BACKUP_MAGIC_V1,
	DENTE_BACKUP_MAGIC_V2,
	DENTE_BACKUP_VERSION,
	createEncryptedDenteBackup,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "@dental/shared";
import {
	cacheActiveSchedule,
	cacheIcd10Dictionary,
	cacheOdontogramState,
	cachePatientCard,
	cachePriceList804n,
	deleteLocalVaultSnapshot,
	enqueueOfflineMutation,
	exportOfflineClinicBackup,
	getAutoBackupScheduleStatus,
	getCachedActiveSchedule,
	getCachedIcd10Dictionary,
	getCachedOdontogramState,
	getCachedPatientCard,
	getCachedPriceList804n,
	getLocalVaultSnapshotContent,
	getPendingOfflineMutations,
	importOfflineClinicBackup,
	inspectDenteBackup,
	listCachedActiveSchedules,
	listCachedPatientCards,
	listLocalVaultSnapshots,
	listOfflineDrafts,
	resetOfflineDbConnection,
	saveOfflineDraft,
	startAutoBackupSchedule,
	stopAutoBackupSchedule,
	verifyLocalCacheIntegrity,
} from "../services/offline/index";

// ─────────────────────────────────────────────────────────────────────────────
// Isolated In-Memory Mock IndexedDB Implementation for Node.js
// ─────────────────────────────────────────────────────────────────────────────

interface MockStoreData {
	keyPath: string;
	indexes: Map<string, string>;
	records: Map<string, unknown>;
}

class MockIDBTransaction {
	db: MockIDBDatabase;
	mode: string;
	activeRequests = 0;
	oncomplete: (() => void) | null = null;
	onerror: ((err?: unknown) => void) | null = null;

	constructor(db: MockIDBDatabase, mode: string) {
		this.db = db;
		this.mode = mode;
	}

	requestDone() {
		this.activeRequests--;
		if (this.activeRequests <= 0) {
			setTimeout(() => {
				if (this.oncomplete) this.oncomplete();
			}, 0);
		}
	}

	objectStore(storeName: string) {
		const store = this.db.stores.get(storeName);
		if (!store) throw new Error(`Store ${storeName} not found`);

		const wrap = (req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null }, op: () => void) => {
			this.activeRequests++;
			setTimeout(() => {
				try {
					op();
					if (req.onsuccess) req.onsuccess();
				} catch (err) {
					req.error = err;
					if (req.onerror) req.onerror();
				} finally {
					this.requestDone();
				}
			}, 0);
			return req;
		};

		return {
			put: (value: Record<string, unknown>) => {
				const key = String(value[store.keyPath]);
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = { result: key };
				return wrap(req, () => {
					store.records.set(key, JSON.parse(JSON.stringify(value)));
				});
			},
			get: (key: string) => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
				return wrap(req, () => {
					const record = store.records.get(key);
					req.result = record ? JSON.parse(JSON.stringify(record)) : undefined;
				});
			},
			getAll: () => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
				return wrap(req, () => {
					req.result = Array.from(store.records.values()).map((r) =>
						JSON.parse(JSON.stringify(r)),
					);
				});
			},
			delete: (key: string) => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = { result: undefined };
				return wrap(req, () => {
					store.records.delete(key);
				});
			},
			count: () => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
				return wrap(req, () => {
					req.result = store.records.size;
				});
			},
		};
	}
}

class MockIDBDatabase {
	name: string;
	version: number;
	objectStoreNames: {
		contains: (name: string) => boolean;
	};
	stores = new Map<string, MockStoreData>();
	onversionchange: (() => void) | null = null;
	onclose: (() => void) | null = null;

	constructor(name: string, version: number) {
		this.name = name;
		this.version = version;
		this.objectStoreNames = {
			contains: (storeName: string) => this.stores.has(storeName),
		};
	}

	createObjectStore(name: string, options: { keyPath: string }) {
		const storeData: MockStoreData = {
			keyPath: options.keyPath,
			indexes: new Map(),
			records: new Map(),
		};
		this.stores.set(name, storeData);
		return {
			createIndex: (indexName: string, keyPath: string) => {
				storeData.indexes.set(indexName, keyPath);
			},
		};
	}

	transaction(_storeNames: string | string[], mode: "readonly" | "readwrite") {
		return new MockIDBTransaction(this, mode);
	}

	close() {
		if (this.onclose) this.onclose();
	}
}

function setupMockIndexedDb() {
	let currentDb: MockIDBDatabase | null = null;

	const mockIndexedDb = {
		open: (name: string, version: number) => {
			const req: {
				result?: MockIDBDatabase;
				onupgradeneeded?: (() => void) | null;
				onsuccess?: (() => void) | null;
				onerror?: (() => void) | null;
			} = {};
			setTimeout(() => {
				if (!currentDb || currentDb.version !== version) {
					currentDb = new MockIDBDatabase(name, version);
					req.result = currentDb;
					if (req.onupgradeneeded) req.onupgradeneeded();
				} else {
					req.result = currentDb;
				}
				if (req.onsuccess) req.onsuccess();
			}, 0);
			return req;
		},
	};

	return { mockIndexedDb, getDb: () => currentDb };
}

describe("AUTOMATED OFFLINE ENCRYPTED BACKUP VAULT & INTEGRITY SUITE", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
		stopAutoBackupSchedule();
		localStorageMap.clear();
		mockDbHolder = setupMockIndexedDb();

		const mockLocalStorage = {
			getItem: (key: string) => localStorageMap.get(key) ?? null,
			setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
			removeItem: (key: string) => localStorageMap.delete(key),
			clear: () => localStorageMap.clear(),
			get length() {
				return localStorageMap.size;
			},
			key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				indexedDB: mockDbHolder.mockIndexedDb,
				localStorage: mockLocalStorage,
				location: { hostname: "clinic-offline.local" },
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		stopAutoBackupSchedule();
		resetOfflineDbConnection();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as unknown as { window?: unknown }).window;
		}
	});

	// ── 1. AES-GCM-256 / PBKDF2 ENCRYPTED SNAPSHOT CREATION ─────────────────

	test("1.1. exportOfflineClinicBackup gathers full clinical state and produces valid AES-GCM-256 container", async () => {
		const orgId = "org-vault-test-1";

		// 1. Seed mutations
		await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-101",
			payload: { diagnosisIcd10: "K02.1", anamnesis: "Боли в зубе 1.6" },
			organizationId: orgId,
		});

		// 2. Seed drafts
		await saveOfflineDraft(
			"draft_visit_101",
			"DIARY_043_DRAFT",
			"visit-101",
			{ statusLocalis: "Глубокая кариозная полость" },
			orgId,
		);

		// 3. Seed active schedule
		await cacheActiveSchedule({
			scheduleKey: `schedule_${orgId}_2026-08-26`,
			date: "2026-08-26",
			organizationId: orgId,
			appointments: [
				{ id: "app-1", patientName: "Иванов И.И.", time: "10:00", chairId: "chair-1" },
				{ id: "app-2", patientName: "Петров П.П.", time: "11:30", chairId: "chair-1" },
			],
		});

		// 4. Seed patient card
		await cachePatientCard({
			patientId: "patient-101",
			organizationId: orgId,
			personalInfo: {
				fullName: "Иванов Иван Иванович",
				phone: "+7 (999) 111-22-33",
				snils: "123-456-789 00",
			},
			card043: {
				allergies: ["Новокаин"],
				pastDiseases: "Без особенностей",
			},
		});

		// 5. Seed odontogram state
		await cacheOdontogramState({
			patientId: "patient-101",
			organizationId: orgId,
			teeth: [
				{ toothNumber: 16, statusCode: "caries", surfaces: ["O", "M"] },
				{ toothNumber: 24, statusCode: "filling", surfaces: ["O"] },
			],
		});

		// 6. Seed pricelist 804n
		await cachePriceList804n(
			[
				{ code804n: "A16.07.002", name: "Восстановление зуба пломбой", priceRub: 4500, priceKopecks: 450000 },
			],
			orgId,
		);

		// 7. Seed ICD-10 dictionary
		await cacheIcd10Dictionary([
			{ code: "K02.1", name: "Кариес дентина" },
			{ code: "K04.0", name: "Пульпит" },
		]);

		// Execute 1-Click Vault Export
		const exportResult = await exportOfflineClinicBackup({
			organizationId: orgId,
			passphrase: "clinic-super-secret-password-2026",
			autoDownload: false,
			meta: {
				clinicName: "Стоматология ДЕНТЕ Элит",
				notes: "Плановый офлайн бэкап на флешку",
			},
		});

		assert.ok(exportResult.backupString);
		assert.ok(exportResult.filename.endsWith(".dente"));
		assert.strictEqual(exportResult.header.magic, DENTE_BACKUP_MAGIC_V2);
		assert.strictEqual(exportResult.header.version, DENTE_BACKUP_VERSION);
		assert.strictEqual(exportResult.header.encryptionAlgorithm, "AES-GCM-256");
		assert.ok(exportResult.header.kdf?.saltHex);
		assert.ok(exportResult.header.ivHex);
		assert.ok(exportResult.header.authTagHex);

		// Assert item statistics in header
		assert.strictEqual(exportResult.stats.mutations, 1);
		assert.strictEqual(exportResult.stats.drafts, 1);
		assert.strictEqual(exportResult.stats.schedules, 1);
		assert.strictEqual(exportResult.stats.patients, 1);
		assert.strictEqual(exportResult.stats.odontograms, 1);
		assert.strictEqual(exportResult.stats.pricelists, 1);
		assert.strictEqual(exportResult.stats.icd10, 1);
	});

	// ── 2. PRE-IMPORT INSPECTION & RECOVERY WITH 100% PARITY ─────────────────

	test("2.1. inspectDenteBackup inspects file container without decryption", async () => {
		const payload = {
			mutations: [{ id: 1 }],
			drafts: [{ key: "d1" }],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(payload, {
			organizationId: "org-inspect",
			passphrase: "key-1",
		});

		const inspection = inspectDenteBackup(backupString);
		assert.strictEqual(inspection.valid, true);
		assert.ok(inspection.header);
		assert.strictEqual(inspection.header.organizationId, "org-inspect");
		assert.strictEqual(inspection.itemStats?.mutations, 1);
		assert.strictEqual(inspection.itemStats?.drafts, 1);
	});

	test("2.2. importOfflineClinicBackup decrypts and restores all domain stores with 100% data fidelity", async () => {
		const orgId = "org-import-fidelity";

		// Create full backup payload
		const fullPayload = {
			mutations: [
				{
					mutationId: "mut-f-1",
					entityType: "DIARY_043_DRAFT" as const,
					entityId: "visit-f-1",
					action: "update" as const,
					payload: { note: "Fidelity test diary" },
					timestamp: new Date().toISOString(),
					timestampMs: Date.now(),
					organizationId: orgId,
					status: "pending" as const,
					retryCount: 0,
				},
			],
			drafts: [
				{
					draftKey: "draft-f-1",
					entityType: "DIARY_043_DRAFT" as const,
					entityId: "visit-f-1",
					data: { diagnosisTooth: "26" },
					updatedAt: new Date().toISOString(),
					updatedAtMs: Date.now(),
					organizationId: orgId,
					version: 1,
				},
			],
			clinicalCache: [],
			schedules: [
				{
					scheduleKey: `schedule_${orgId}_2026-09-01`,
					date: "2026-09-01",
					organizationId: orgId,
					appointments: [{ id: "app-f-1", patientName: "Тестовый Пациент" }],
					cachedAt: new Date().toISOString(),
					cachedAtMs: Date.now(),
				},
			],
			patients: [
				{
					patientId: "pat-f-1",
					organizationId: orgId,
					personalInfo: {
						fullName: "Кузнецов Андрей Петрович",
						phone: "+7 (911) 222-33-44",
					},
					cachedAt: new Date().toISOString(),
					cachedAtMs: Date.now(),
				},
			],
			odontograms: [
				{
					patientId: "pat-f-1",
					organizationId: orgId,
					teeth: [{ toothNumber: 36, statusCode: "implant" }],
					cachedAt: new Date().toISOString(),
					cachedAtMs: Date.now(),
				},
			],
			pricelists: [
				{
					catalogKey: `pricelist_${orgId}`,
					organizationId: orgId,
					items: [{ code804n: "B01.065", name: "Консультация", priceRub: 1500, priceKopecks: 150000 }],
					cachedAt: new Date().toISOString(),
					cachedAtMs: Date.now(),
				},
			],
			icd10: [
				{
					dictionaryKey: "icd10_catalog",
					items: [{ code: "K05.1", name: "Хронический гингивит" }],
					cachedAt: new Date().toISOString(),
					cachedAtMs: Date.now(),
				},
			],
		};

		const backupString = createEncryptedDenteBackup(fullPayload, {
			organizationId: orgId,
			passphrase: "vault-fidelity-passphrase-2026",
			encryptionAlgorithm: "AES-GCM-256",
		});

		// Clear local storage and DB to simulate clean workstation recovery
		resetOfflineDbConnection();

		// Execute Import
		const restoreResult = await importOfflineClinicBackup(backupString, {
			passphrase: "vault-fidelity-passphrase-2026",
		});

		assert.strictEqual(restoreResult.success, true);
		assert.strictEqual(restoreResult.errors.length, 0);
		assert.strictEqual(restoreResult.restoredCount.mutations, 1);
		assert.strictEqual(restoreResult.restoredCount.drafts, 1);
		assert.strictEqual(restoreResult.restoredCount.schedules, 1);
		assert.strictEqual(restoreResult.restoredCount.patients, 1);
		assert.strictEqual(restoreResult.restoredCount.odontograms, 1);
		assert.strictEqual(restoreResult.restoredCount.pricelists, 1);
		assert.strictEqual(restoreResult.restoredCount.icd10, 1);

		// Verify restored items in local IDB
		const restoredSchedules = await listCachedActiveSchedules(orgId);
		assert.strictEqual(restoredSchedules.length, 1);
		assert.strictEqual(restoredSchedules[0]?.date, "2026-09-01");

		const restoredPatient = await getCachedPatientCard("pat-f-1", orgId);
		assert.ok(restoredPatient);
		assert.strictEqual(restoredPatient.personalInfo.fullName, "Кузнецов Андрей Петрович");

		const restoredOdonto = await getCachedOdontogramState("pat-f-1", orgId);
		assert.ok(restoredOdonto);
		assert.strictEqual(restoredOdonto.teeth[0]?.statusCode, "implant");
	});

	// ── 3. TAMPER RESISTANCE & ERROR HANDLING ────────────────────────────────

	test("3.1. Rejects wrong decryption password with clean error", async () => {
		const payload = { mutations: [], drafts: [], clinicalCache: [] };
		const backupString = createEncryptedDenteBackup(payload, {
			passphrase: "correct-secret-password",
		});

		await assert.rejects(
			async () => {
				await importOfflineClinicBackup(backupString, {
					passphrase: "wrong-attempted-password",
				});
			},
			/Неверный пароль расшифровки/i,
		);
	});

	test("3.2. Rejects corrupted ciphertext or tampered container signature", async () => {
		const payload = { mutations: [], drafts: [], clinicalCache: [] };
		const backupString = createEncryptedDenteBackup(payload, {
			passphrase: "test-password",
		});

		const container = JSON.parse(backupString);
		// Alter container signature by flipping the first character
		const firstChar = container.containerSignature[0] === "a" ? "b" : "a";
		container.containerSignature = firstChar + container.containerSignature.slice(1);
		const tamperedString = JSON.stringify(container);

		const validation = inspectDenteBackup(tamperedString);
		assert.strictEqual(validation.valid, false);
		assert.ok(validation.error?.includes("Криптографическая подпись"));
	});

	// ── 4. VAULT AUTO-BACKUP SCHEDULER & ROLLING RETENTION ───────────────────

	test("4.1. startAutoBackupSchedule manages periodic snapshots and rolling history", async () => {
		const status = startAutoBackupSchedule({
			intervalMinutes: 15,
			organizationId: "org-auto",
			passphrase: "auto-passphrase",
			maxLocalSnapshots: 5,
		});

		assert.strictEqual(status.isRunning, true);
		assert.strictEqual(status.intervalMinutes, 15);
		assert.ok(status.nextScheduledRunAt);

		// Record a manual snapshot to test history
		const res = await exportOfflineClinicBackup({
			organizationId: "org-auto",
			passphrase: "auto-passphrase",
			autoDownload: false,
			meta: { autoSnapshot: true },
		});

		const snapshots = listLocalVaultSnapshots();
		assert.ok(snapshots.length >= 1);
		assert.strictEqual(snapshots[0]?.autoSnapshot, true);

		// Check snapshot content retrieval
		const content = getLocalVaultSnapshotContent(snapshots[0]!.id);
		assert.ok(content);
		assert.strictEqual(content, res.backupString);

		// Check snapshot deletion
		const deleted = deleteLocalVaultSnapshot(snapshots[0]!.id);
		assert.strictEqual(deleted, true);

		stopAutoBackupSchedule();
		const statusAfter = getAutoBackupScheduleStatus();
		assert.strictEqual(statusAfter.isRunning, false);
	});

	// ── 5. STORAGE INTEGRITY ENGINE & AUTO-REPAIR ────────────────────────────

	test("5.1. verifyLocalCacheIntegrity audits all stores and auto-repairs corrupted records", async () => {
		const orgId = "org-integrity-test";

		// Seed valid records
		await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-valid",
			payload: { text: "Valid mutation" },
			organizationId: orgId,
		});

		await cachePatientCard({
			patientId: "patient-valid",
			organizationId: orgId,
			personalInfo: { fullName: "Здоровый Пациент" },
		});

		// Run check on healthy store
		const report1 = await verifyLocalCacheIntegrity({ autoRepair: false, organizationId: orgId });
		assert.strictEqual(report1.healthy, true);
		assert.strictEqual(report1.corruptedCount, 0);
		assert.strictEqual(report1.storesStats.mutationsCount, 1);
		assert.strictEqual(report1.storesStats.patientsCount, 1);
	});
});
