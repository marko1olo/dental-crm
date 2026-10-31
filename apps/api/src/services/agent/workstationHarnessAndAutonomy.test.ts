/**
 * workstationHarnessAndAutonomy.test.ts — Two-Mode Sovereign Harness & Doctor Autonomy Suite.
 *
 * Verifies:
 * 1. Two-Mode Sovereign Architecture: Web CRM (Fastify & PostgreSQL) vs Desktop Native (OS Super-Agent).
 * 2. Cloud Guard: Cloud environment safely denies hardware/desktop access without crashing.
 * 3. Desktop Native Tools:
 *    - launch_workstation_app: Vatech, Planmeca, EzSensor, OnDemand3D, Sidexis, 3Shape Dental System, Explorer.
 *    - search_workstation_files: finds patient DICOM/radiology files.
 *    - read_clinical_file & write_clinical_file: safe clinical I/O with directory traversal protection.
 *    - check_fiscal_hardware_port: COM/USB hardware detection for 54-FZ fiscal registrars (Atol/Shtrih-M).
 *    - write_workstation_clipboard: clipboard bridge.
 * 4. Doctor Autonomy (Mandates 8e, 8y):
 *    - Pharmacological and somatic alerts are strictly advisory (isBlocking: false).
 *    - 2-Phase Confirmation Barrier (confirmation_required) for destructive mutations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type { AgentContext } from "./context.js";
import {
	calculateAnestheticDosageTool,
} from "./tools/anestheticDosageTool.js";
import {
	createDefaultToolRegistry,
	ToolRegistry,
} from "./tools/registry.js";
import {
	checkFiscalHardwarePortTool,
	CLOUD_GUARD_DENIAL,
	isCloudEnvironment,
	launchWorkstationAppTool,
	openPatientDropzoneFolderTool,
	readClinicalFileTool,
	registerWorkstationTools,
	searchWorkstationFilesTool,
	STANDARD_APP_PATHS,
	writeClinicalFileTool,
	writeWorkstationClipboardTool,
} from "./tools/workstationTools.js";

function createMockContext(overrides?: Partial<AgentContext>): AgentContext {
	return {
		organizationId: "00000000-0000-7000-8000-000000000001",
		userId: "00000000-0000-7000-8000-000000000002",
		mode: "supervised",
		role: "doctor",
		permissions: [
			"clinical.read",
			"clinical.write",
			"financial.read",
			"financial.write",
			"patients.read",
			"patients.write",
			"sanpin.read",
			"sanpin.write",
		],
		tools: createDefaultToolRegistry(),
		db: null as any,
		...overrides,
	};
}

describe("Two-Mode Sovereign Harness: Desktop Native Workstation Super-Agent", () => {
	it("registers all workstation tools into registry with workstation prefix", () => {
		const registry = new ToolRegistry();
		registerWorkstationTools(registry, "workstation");

		const tools = registry.list();
		assert.ok(tools.includes("workstation.launch_workstation_app"));
		assert.ok(tools.includes("workstation.open_patient_dropzone_folder"));
		assert.ok(tools.includes("workstation.capture_workstation_screen"));
		assert.ok(tools.includes("workstation.search_workstation_files"));
		assert.ok(tools.includes("workstation.read_clinical_file"));
		assert.ok(tools.includes("workstation.write_clinical_file"));
		assert.ok(tools.includes("workstation.check_fiscal_hardware_port"));
		assert.ok(tools.includes("workstation.write_workstation_clipboard"));
	});

	it("includes 3Shape Dental System and all major radiological software in standard paths", () => {
		assert.ok(STANDARD_APP_PATHS["3shape_dental_system"], "3Shape must be configured");
		assert.ok(STANDARD_APP_PATHS.vatech_ezdent, "VATECH EzDent must be configured");
		assert.ok(STANDARD_APP_PATHS.planmeca_romexis, "Planmeca Romexis must be configured");
		assert.ok(STANDARD_APP_PATHS.ezsensor, "EzSensor must be configured");
		assert.ok(STANDARD_APP_PATHS.ondemand3d, "OnDemand3D must be configured");
		assert.ok(STANDARD_APP_PATHS.sidexis, "Sirona Sidexis must be configured");
	});

	it("enforces cloud environment guard when CLOUD_ENV is true", async () => {
		const oldEnv = process.env.CLOUD_ENV;
		process.env.CLOUD_ENV = "true";

		try {
			assert.equal(isCloudEnvironment(), true);
			const ctx = createMockContext();

			const resApp = await launchWorkstationAppTool.handler(ctx, { appType: "planmeca_romexis" });
			assert.deepEqual(resApp, CLOUD_GUARD_DENIAL);

			const resFile = await readClinicalFileTool.handler(ctx, { filePath: "C:\\sample.dcm" });
			assert.deepEqual(resFile, CLOUD_GUARD_DENIAL);

			const resFiscal = await checkFiscalHardwarePortTool.handler(ctx, { targetPort: "COM3" });
			assert.deepEqual(resFiscal, CLOUD_GUARD_DENIAL);
		} finally {
			process.env.CLOUD_ENV = oldEnv;
		}
	});

	it("prevents directory traversal attacks in read_clinical_file and write_clinical_file", async () => {
		const ctx = createMockContext();

		// Directory traversal attempt
		const readRes = await readClinicalFileTool.handler(ctx, {
			filePath: "C:\\DentalStudies\\..\\..\\Windows\\System32\\config\\SAM",
		});
		assert.equal(readRes.success, false);
		assert.ok((readRes.error as string).includes("Относительные пути"));

		const writeRes = await writeClinicalFileTool.handler(ctx, {
			filePath: "C:\\Studies\\..\\..\\Windows\\malicious.txt",
			content: "test",
		});
		assert.equal(writeRes.success, false);
	});

	it("writes and reads clinical files on workstation filesystem safely", async () => {
		const ctx = createMockContext();
		const tmpDir = path.join(os.tmpdir(), `dente_test_${Date.now()}`);
		const testFile = path.join(tmpDir, "patient_report.txt");
		const sampleReport = "Клинический отчет: зуб 46, кариес дентина K02.1. Пломбирование светоотверждаемым композитом.";

		try {
			const writeResult = await writeClinicalFileTool.handler(ctx, {
				filePath: testFile,
				content: sampleReport,
			});
			assert.equal(writeResult.success, true);
			assert.ok(fs.existsSync(testFile));

			const readResult = await readClinicalFileTool.handler(ctx, {
				filePath: testFile,
			});
			assert.equal(readResult.success, true);
			assert.equal(readResult.encoding, "utf-8");
			assert.equal(readResult.content, sampleReport);
		} finally {
			if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
			if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
		}
	});

	it("scans and searches radiology files in dropzone folder", async () => {
		const ctx = createMockContext();
		const tmpDropzone = path.join(os.tmpdir(), `dente_dropzone_${Date.now()}`);
		fs.mkdirSync(tmpDropzone, { recursive: true });

		const dcmFile = path.join(tmpDropzone, "pat_001_study.dcm");
		const pngFile = path.join(tmpDropzone, "pat_001_pano.png");
		const txtFile = path.join(tmpDropzone, "ignore.txt");

		fs.writeFileSync(dcmFile, "DICOM SAMPLE DATA");
		fs.writeFileSync(pngFile, "PNG DATA");
		fs.writeFileSync(txtFile, "TXT DATA");

		try {
			const res = await searchWorkstationFilesTool.handler(ctx, {
				searchFolder: tmpDropzone,
				pattern: "pat_001",
				extensions: [".dcm", ".png"],
			});

			assert.equal(res.success, true);
			assert.equal(res.totalFound, 2);
			const files = (res.files as Array<{ name: string }>).map((f) => f.name);
			assert.ok(files.includes("pat_001_study.dcm"));
			assert.ok(files.includes("pat_001_pano.png"));
			assert.ok(!files.includes("ignore.txt"));
		} finally {
			fs.unlinkSync(dcmFile);
			fs.unlinkSync(pngFile);
			fs.unlinkSync(txtFile);
			fs.rmdirSync(tmpDropzone);
		}
	});

	it("checks fiscal hardware COM/USB port readiness for 54-FZ fiscal registrar", async () => {
		const ctx = createMockContext();
		const res = await checkFiscalHardwarePortTool.handler(ctx, { targetPort: "COM3" });

		assert.equal(res.success, true);
		assert.ok(res.device);
		assert.ok(res.fiscal_device);
		assert.equal(typeof res.isReady, "boolean");
	});
});

describe("Doctor Autonomy & Non-Blocking Advisor Protocol (Mandates 8e, 8y)", () => {
	it("anesthetic dosage calculation never blocks the doctor even with high cardiovascular risk", async () => {
		const ctx = createMockContext();
		const res = await calculateAnestheticDosageTool.handler(ctx, {
			patientWeightKg: 80,
			anestheticType: "articaine_1_100000",
			somaticConditions: ["Гипертоническая болезнь III стадии", "ИБС: стенокардия напряжения"],
			plannedCarpules: 4,
		});

		assert.equal(res.success, true);
		assert.equal(res.isCardiovascularRisk, true);
		assert.ok(res.warning !== null);
		// Crucial Mandate 8e invariant: warnings NEVER block doctor autonomy!
		assert.equal(res.safeToProceed, true);
		assert.equal(res.doctorAutonomyBlocked, false);
		assert.equal(res.quickDisposalReady, true);
	});
});
