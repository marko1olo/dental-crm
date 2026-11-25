import assert from "node:assert";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import pino from "pino";
import { bindServerLogger } from "../observability/logger.js";
import {
	type DentalMutableState,
	getPersistentStateIntegrityReport,
	getPersistentStateMeta,
	loadPersistentState,
	savePersistentState,
} from "../persistentState.js";

function captureWarnLogs(): string[] {
	const warnings: string[] = [];
	const sink = pino({ level: "warn" }, { write: () => {} });
	mock.method(sink, "warn", (...args: unknown[]) => {
		const text = args
			.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
			.join(" ");
		warnings.push(text);
	});
	bindServerLogger(sink);
	return warnings;
}

function buildTestMutableState(clinicId = "clinic-1", clinicName = "Test Clinic"): DentalMutableState {
	const nowIso = "2026-01-01T00:00:00.000Z";
	const orgId = "00000000-0000-4000-8000-000000000001";
	return {
		clinicProfile: {
			organizationId: orgId,
			clinicName: `${clinicName} (${clinicId})`,
			legalName: null,
			inn: null,
			address: null,
			phone: null,
			medicalLicenseIssuedAt: null,
			mode: "network_clinic",
			timezone: "Europe/Moscow",
			defaultVisitMinutes: 30,
			scheduleDefaults: {
				workdayStart: "09:00",
				workdayEnd: "21:00",
				workingDays: [1, 2, 3, 4, 5],
				appointmentBufferMinutes: 15,
			},
			networkEnabled: true,
			egiszEnabled: false,
			updatedAt: nowIso,
		},
		staffMembers: [],
		chairs: [],
		appointments: [],
		patients: [],
		documents: [],
		clinicalRules: [],
		payments: [],
		communicationTasks: [],
		communicationEvents: [],
		imagingStudies: [],
		imagingViewerSessions: [],
		dicomWorkbenchBundles: [],
		importBatches: [],
		auditEvents: [],
		aiRecognitionJobs: [],
		speechTranscriptionChunks: [],
		visitDraftAutosaves: [],
		visitSaveReceipts: [],
		denteTelegramLinkCodes: [],
		denteTelegramChatLinks: [],
		denteTelegramWebhookEvents: [],
		denteTelegramOutboxDeliveryReceipts: [],
		denteTelegramBotSettings: {
			version: 1,
			organizationId: orgId,
			mode: "shared_dente_bot",
			botUsername: null,
			ownBotUsername: null,
			webhookBaseUrl: null,
			patientPortalBaseUrl: null,
			welcomeImageUrl: null,
			visualCardUrls: {
				mainMenu: null,
				appointment: null,
				documents: null,
				tax: null,
				billing: null,
				care: null,
				review: null,
				staff: null,
			},
			clinicReviewUrl: null,
			clinicMapsUrl: null,
			enabledFeatures: ["appointment_confirmation"],
			patientLinkTokenTtlMinutes: 15,
			appointmentReminderLeadTimesHours: [24],
			reviewRequestDelayHours: 2,
			postVisitCheckupDelayHoursByTopic: {
				extraction: 24,
				implantation: 24,
				surgery_aftercare: 24,
				fixation_aftercare: 48,
				filling_restoration: 48,
				endo: 48,
				surgery: 24,
				local_anesthesia: 24,
				hygiene: 72,
				prosthetics: 48,
				orthodontics: 72,
				periodontology: 72,
				other: 48,
			},
			allowVoiceIntake: true,
			staffEscalationChannel: null,
			privacyMode: "no_phi_by_default",
			updatedAt: nowIso,
		},
		uiPreferences: null,
		activeVisit: {
			id: "00000000-0000-4000-8000-000000000002",
			organizationId: orgId,
			patientId: "00000000-0000-4000-8000-000000000003",
			appointmentId: null,
			status: "draft",
			revision: 1,
			complaint: "",
			anamnesis: "",
			objectiveStatus: "",
			diagnosis: null,
			treatmentPlan: null,
			doctorSummary: null,
			hygieneIndices: null,
			createdAt: nowIso,
			updatedAt: nowIso,
		},
	};
}

describe("loadPersistentState", () => {
	let tempDir: string;
	let originalEnv: NodeJS.ProcessEnv;
	let stateFile: string;
	let backupDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-load-"));
		originalEnv = { ...process.env };
		stateFile = path.join(tempDir, "state.json");
		backupDir = path.join(tempDir, "backups");

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTAL_STATE_FILE = stateFile;
		process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
	});

	afterEach(() => {
		bindServerLogger(null);
		mock.restoreAll();
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		for (const [key, value] of Object.entries(originalEnv)) {
			if (value !== undefined) {
				process.env[key] = value;
			}
		}
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	test("returns null when persistence is disabled", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		fs.writeFileSync(
			stateFile,
			JSON.stringify({ version: 1, state: {} }),
			"utf8",
		);

		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null when state file does not exist", () => {
		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null when persistence is disabled", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		const result = loadPersistentState();
		assert.strictEqual(result, null);
	});

	test("returns null when file is missing", () => {
		mock.method(fs, "existsSync", () => false);
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const result = loadPersistentState();
		assert.strictEqual(result, null);
	});

	test("returns null when file is unreadable (invalid json)", () => {
		mock.method(fs, "existsSync", () => true);
		mock.method(fs, "readFileSync", () => "{ invalid json");
		captureWarnLogs();

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const result = loadPersistentState();
		assert.strictEqual(result, null);
	});

	test("returns null when version mismatches", () => {
		mock.method(fs, "existsSync", () => true);
		mock.method(fs, "readFileSync", () =>
			JSON.stringify({ version: 999, state: {} }),
		);
		captureWarnLogs();

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const result = loadPersistentState();
		assert.strictEqual(result, null);
	});

	test("returns null when checksum mismatches", () => {
		mock.method(fs, "existsSync", () => true);
		mock.method(fs, "readFileSync", () =>
			JSON.stringify({ version: 1, state: {}, checksum: "invalid" }),
		);
		captureWarnLogs();

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const result = loadPersistentState();
		assert.strictEqual(result, null);
	});

	test("returns null when file system access throws an error", () => {
		mock.method(fs, "existsSync", () => true);
		mock.method(fs, "readFileSync", () => {
			throw new Error("EACCES: permission denied");
		});
		captureWarnLogs();

		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null when file contains invalid JSON", () => {
		fs.writeFileSync(stateFile, "{ invalid json", "utf8");
		captureWarnLogs();

		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null when file has incorrect version", () => {
		fs.writeFileSync(
			stateFile,
			JSON.stringify({ version: 999, state: {} }),
			"utf8",
		);

		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null when file has no state property", () => {
		fs.writeFileSync(stateFile, JSON.stringify({ version: 1 }), "utf8");

		const result = loadPersistentState();

		assert.strictEqual(result, null);
	});

	test("returns null and logs warning when checksum mismatch", () => {
		const payload = {
			version: 1,
			savedAt: new Date().toISOString(),
			state: {},
			checksum: "invalid-checksum",
		};
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		const warnings = captureWarnLogs();

		const result = loadPersistentState();

		assert.strictEqual(result, null);
		assert.strictEqual(
			warnings.some((message) => message.includes("checksum mismatch")),
			true,
		);
	});

	test("returns parsed state when file is valid and checksum matches", () => {
		const mockState = buildTestMutableState("test-123", "Test Clinic");

		// Use savePersistentState to generate a valid file with correct checksum
		savePersistentState(mockState);

		const result = loadPersistentState();

		assert.deepStrictEqual(result, mockState);
	});
});

describe("getPersistentStateMeta", () => {
	let tempDir: string;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		bindServerLogger(null);
		mock.restoreAll();
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		for (const [key, value] of Object.entries(originalEnv)) {
			if (value !== undefined) {
				process.env[key] = value;
			}
		}
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	test("returns default meta when files do not exist and persistence is enabled", () => {
		const stateFile = path.join(tempDir, "state.json");
		const backupDir = path.join(tempDir, "backups");

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTAL_STATE_FILE = stateFile;
		process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
		process.env.DENTAL_STATE_BACKUPS = "10";

		const meta = getPersistentStateMeta();

		assert.strictEqual(meta.enabled, true);
		assert.strictEqual(meta.filePath, stateFile);
		assert.strictEqual(meta.exists, false);
		assert.strictEqual(meta.version, null);
		assert.strictEqual(meta.backupDirectoryPath, backupDir);
		assert.strictEqual(meta.backupCount, 0);
		assert.strictEqual(meta.latestBackupAt, null);
		assert.strictEqual(meta.latestBackupSizeBytes, null);
		assert.strictEqual(meta.maxBackupCount, 10);
	});

	test("returns correctly populated meta when valid state and backups exist", () => {
		const stateFile = path.join(tempDir, "state.json");
		const backupDir = path.join(tempDir, "backups");

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTAL_STATE_FILE = stateFile;
		process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
		process.env.DENTAL_STATE_BACKUPS = "10";

		captureWarnLogs();

		// Save state multiple times to create backups
		savePersistentState(buildTestMutableState());

		// Create a manual backup to have distinct files
		fs.mkdirSync(backupDir, { recursive: true });
		fs.writeFileSync(
			path.join(backupDir, "dental-crm-state-20231010T120000Z.json"),
			'{"old": true}',
		);

		// Save again to trigger rotation
		savePersistentState(buildTestMutableState());

		const meta = getPersistentStateMeta();

		assert.strictEqual(meta.enabled, true);
		assert.strictEqual(meta.filePath, stateFile);
		assert.strictEqual(meta.exists, true);
		assert.strictEqual(meta.version, 1);
		assert.ok(meta.savedAt !== null);
		assert.ok(meta.checksum !== null);
		assert.strictEqual(meta.backupDirectoryPath, backupDir);
		assert.ok(meta.backupCount > 0);
		assert.ok(meta.latestBackupAt !== null);
		assert.ok(meta.latestBackupSizeBytes !== null);
		assert.strictEqual(meta.maxBackupCount, 10);
	});

	test("returns disabled meta when persistence is disabled", () => {
		const stateFile = path.join(tempDir, "state.json");
		const backupDir = path.join(tempDir, "backups");

		process.env.DENTAL_STATE_PERSISTENCE = "off";
		process.env.DENTAL_STATE_FILE = stateFile;
		process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
		process.env.DENTAL_STATE_BACKUPS = "10";

		const meta = getPersistentStateMeta();

		assert.strictEqual(meta.enabled, false);
		assert.strictEqual(meta.filePath, stateFile);
		assert.strictEqual(meta.exists, false);
	});
});

describe("getPersistentStateIntegrityReport", () => {
	const originalEnv = { ...process.env };
	let tempDir: string;

	afterEach(() => {
		bindServerLogger(null);
		mock.restoreAll();
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		for (const key of Object.keys(originalEnv)) {
			if (originalEnv[key] !== undefined) {
				process.env[key] = originalEnv[key] as string;
			}
		}

		if (tempDir && fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	const setupTempEnv = () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
		const stateFile = path.join(tempDir, "state.json");
		const backupDir = path.join(tempDir, "backups");
		fs.mkdirSync(backupDir, { recursive: true });

		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTAL_STATE_FILE = stateFile;
		process.env.DENTAL_STATE_BACKUP_DIR = backupDir;

		return { stateFile, backupDir };
	};

	const createValidPayload = (stateData = {}) => {
		const core = {
			version: 1,
			savedAt: new Date().toISOString(),
			state: stateData,
		};
		const checksum = createHash("sha256")
			.update(JSON.stringify(core))
			.digest("hex");
		return { ...core, checksum };
	};

	test("reports missing file warning when state file does not exist", async () => {
		setupTempEnv();
		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, false);
		assert.strictEqual(report.meta.exists, false);
		assert.strictEqual(report.checksumVerified, null);
		assert.ok(
			report.warnings.some((w) => w.includes("Файл состояния еще не создан")),
		);
	});

	test("returns ok report for valid state file with no backups", async () => {
		const { stateFile } = setupTempEnv();
		const payload = createValidPayload();
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, true);
		assert.strictEqual(report.meta.exists, true);
		assert.strictEqual(report.checksumVerified, true);
		assert.deepStrictEqual(report.warnings, []);
	});

	test("returns warning for state file checksum mismatch", async () => {
		const { stateFile } = setupTempEnv();
		const payload = createValidPayload();
		payload.checksum = "invalid-checksum";
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, false);
		assert.strictEqual(report.checksumVerified, false);
		assert.ok(
			report.warnings.some((w) =>
				w.includes("Контрольная сумма файла состояния не совпала"),
			),
		);
	});

	test("returns warning when state file is unreadable (invalid json)", async () => {
		const { stateFile } = setupTempEnv();
		fs.writeFileSync(stateFile, "{ invalid json", "utf8");

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, false);
		assert.strictEqual(report.checksumVerified, null);
		assert.ok(
			report.warnings.some((w) => w.includes("Файл состояния не читается")),
		);
	});

	test("returns ok report with valid backups", async () => {
		const { stateFile, backupDir } = setupTempEnv();

		// Valid state file
		const payload = createValidPayload();
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		// Valid backup file
		const backupFile = path.join(
			backupDir,
			"dental-crm-state-20240101T000000Z.json",
		);
		fs.writeFileSync(backupFile, JSON.stringify(payload), "utf8");

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, true);
		assert.strictEqual(report.backups.length, 1);
		assert.strictEqual(report.backups[0]?.checksumVerified, true);
		assert.strictEqual(report.backups[0]?.readable, true);
		assert.deepStrictEqual(report.warnings, []);
	});

	test("returns null for stateFileHash when fs.promises.readFile throws an error (e.g. EACCES)", async () => {
		const { stateFile } = setupTempEnv();
		const payload = createValidPayload();
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		mock.method(fs.promises, "readFile", () => {
			const error: NodeJS.ErrnoException = new Error("EACCES: permission denied");
			error.code = "EACCES";
			return Promise.reject(error);
		});

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.stateFileHash, null);
	});

	test("returns warning for backup checksum mismatch", async () => {
		const { stateFile, backupDir } = setupTempEnv();

		// Valid state file
		const payload = createValidPayload();
		fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

		// Invalid backup file
		const invalidBackupPayload = createValidPayload();
		invalidBackupPayload.checksum = "invalid";
		const backupFile = path.join(
			backupDir,
			"dental-crm-state-20240101T000000Z.json",
		);
		fs.writeFileSync(backupFile, JSON.stringify(invalidBackupPayload), "utf8");

		const report = await getPersistentStateIntegrityReport();

		assert.strictEqual(report.ok, false);
		assert.strictEqual(report.backups.length, 1);
		assert.strictEqual(report.backups[0]?.checksumVerified, false);
		assert.ok(
			report.warnings.some(
				(w) =>
					w.includes("одна из последних резервных копий не прошла проверку") ||
					w.toLowerCase().includes("не прошла проверку"),
			),
		);
	});
});

describe("savePersistentState", () => {
	const originalEnv = { ...process.env };
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
		process.env.DENTAL_STATE_FILE = path.join(tempDir, "state.json");
		process.env.DENTAL_STATE_BACKUP_DIR = path.join(tempDir, "backups");
	});

	afterEach(() => {
		bindServerLogger(null);
		mock.restoreAll();
		// Restore environment variables exactly
		for (const key of Object.keys(process.env)) {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		}
		// Clean up temporary directory
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	const mockState: DentalMutableState = buildTestMutableState("clinic-1", "Test Clinic");

	test("does nothing if persistence is disabled", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		const stateFile = process.env.DENTAL_STATE_FILE ?? path.join(tempDir, "state.json");

		savePersistentState(mockState);

		assert.strictEqual(fs.existsSync(stateFile), false);
	});

	test("saves state to file with checksum", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const stateFile = process.env.DENTAL_STATE_FILE ?? path.join(tempDir, "state.json");

		savePersistentState(mockState);

		assert.strictEqual(fs.existsSync(stateFile), true);

		const fileContent = fs.readFileSync(stateFile, "utf8");
		const parsed = JSON.parse(fileContent);

		assert.strictEqual(parsed.version, 1);
		assert.ok(parsed.savedAt);
		assert.ok(parsed.checksum);
		assert.deepStrictEqual(parsed.state, mockState);
	});

	test("rotates backup if file already exists", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		const stateFile = process.env.DENTAL_STATE_FILE ?? path.join(tempDir, "state.json");
		const backupDir = process.env.DENTAL_STATE_BACKUP_DIR ?? path.join(tempDir, "backups");

		// First save
		savePersistentState(mockState);
		assert.strictEqual(fs.existsSync(stateFile), true);

		// Modify state slightly for second save
		const modifiedState: DentalMutableState = {
			...mockState,
			clinicProfile: {
				...mockState.clinicProfile,
				clinicName: "Updated",
			},
		};

		// Second save
		savePersistentState(modifiedState);

		// Check backup directory
		const backups = fs.readdirSync(backupDir);
		assert.strictEqual(backups.length, 1);
		const backupName = backups[0];
		if (!backupName) throw new Error("No backup files found");
		const backupContent = fs.readFileSync(
			path.join(backupDir, backupName),
			"utf8",
		);
		const backupParsed = JSON.parse(backupContent);

		// Backup should be the FIRST state
		assert.deepStrictEqual(
			backupParsed.state.clinicProfile.clinicName,
			"Test Clinic (clinic-1)",
		);

		// Current file should be the SECOND state
		const currentContent = fs.readFileSync(stateFile, "utf8");
		const currentParsed = JSON.parse(currentContent);
		assert.deepStrictEqual(currentParsed.state.clinicProfile.clinicName, "Updated");
	});

	test("catches errors and logs a warning", () => {
		process.env.DENTAL_STATE_PERSISTENCE = "on";

		// Set state file to a directory to force an error during writeFileSync
		process.env.DENTAL_STATE_FILE = tempDir;

		const warnings = captureWarnLogs();

		// Should not throw
		savePersistentState(mockState);

		assert.strictEqual(
			warnings.some((message) => message.includes("Dental state file save failed")),
			true,
		);
	});
});
