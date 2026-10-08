/**
 * DENTE CRM — RED TEAM ИНКВИЗИЦИОННЫЙ ТЕСТ ОРТОДОНТИИ И ТРГ-ЦЕФАЛОМЕТРИИ
 * 
 * ВЫСШАЯ КОНСТИТУЦИЯ (THE HAMMER) & MANDATES:
 * - Mandate 8c: Zero Mocks & Zero Facades (Запрет симуляции ИИ и автоподстановки чужих снимков)
 * - Mandate 8f: Real Persistence (Честное сохранение результатов в ЭМК / БД)
 * - Mandate 8y: Fail-Closed & Dual-Mode Isolation (Демо-данные строго изолированы за isDemoShowcaseMode())
 * - Mandate 8e: Doctor Autonomy (Врач всегда контролирует процесс, без навязывания чужих снимков)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	isDemoShowcaseMode,
	isDemoPatientId,
	setRuntimeDemoMode,
} from "../lib/demoMode.js";
import {
	cephAiInferenceService,
	SAMPLE_VALIDATION_COORDINATES_1200_896,
} from "../components/orthodontics/cephAiInferenceService";
import {
	calculateCephalometrics,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
} from "../components/orthodontics/cephalometricMath";
import {
	saveCephalometricAnalysisToEmr,
	loadPatientCephalometricStudies,
	loadLatestCephalometricStudy,
	getCephStorageKey,
} from "../components/orthodontics/cephalometricPersistence";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "../components/orthodontics/CephalometricCanvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory mock for localStorage in Node test environment
class MemoryStorage {
	private store = new Map<string, string>();
	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.store.set(key, String(value));
	}
	removeItem(key: string): void {
		this.store.delete(key);
	}
	clear(): void {
		this.store.clear();
	}
}

describe("Red Team Inquisition: Cephalometrics & TRG AI Engine", () => {
	beforeEach(() => {
		setRuntimeDemoMode(false);
		if (typeof globalThis.window === "undefined") {
			(globalThis as any).window = {
				localStorage: new MemoryStorage(),
				dispatchEvent: () => true,
			};
		} else if (!globalThis.window.localStorage) {
			(globalThis.window as any).localStorage = new MemoryStorage();
		} else {
			globalThis.window.localStorage.clear();
		}
	});

	it("1. DUAL-MODE ISOLATION: checks that SAMPLE_TRG_CEPHALOGRAM_URL is quarantined behind isDemoShowcaseMode", () => {
		const modalPath = path.resolve(__dirname, "../components/radiology/CephalometricAnalysisModal.tsx");
		const canvasPath = path.resolve(__dirname, "../components/orthodontics/CephalometricCanvas.tsx");

		assert.ok(fs.existsSync(modalPath), "CephalometricAnalysisModal.tsx must exist");
		assert.ok(fs.existsSync(canvasPath), "CephalometricCanvas.tsx must exist");

		const modalCode = fs.readFileSync(modalPath, "utf-8");
		const canvasCode = fs.readFileSync(canvasPath, "utf-8");

		// Verifies imports of demoMode in modal and canvas
		assert.ok(modalCode.includes("isDemoShowcaseMode"), "Modal must import isDemoShowcaseMode");
		assert.ok(canvasCode.includes("isDemoShowcaseMode"), "Canvas must import isDemoShowcaseMode");

		// Verifies that handleRunAiAutoPlacement in modal checks demo mode before using SAMPLE_TRG_CEPHALOGRAM_URL
		const runAiMatch = modalCode.match(/handleRunAiAutoPlacement[\s\S]*?const targetUrl = imageUrl \|\| \(isDemo \? SAMPLE_TRG_CEPHALOGRAM_URL : null\);/);
		assert.ok(
			runAiMatch,
			"handleRunAiAutoPlacement must guard SAMPLE_TRG_CEPHALOGRAM_URL strictly with isDemo",
		);

		// Verifies that dropzone in Canvas isolates sample image loading behind isDemoShowcaseMode
		assert.ok(
			canvasCode.includes("{isDemoShowcaseMode() && ("),
			"Canvas dropzone must render demo sample button strictly behind isDemoShowcaseMode()",
		);
		assert.ok(
			!canvasCode.includes("Загрузить клинический снимок ТРГ пациента"),
			"Deceptive button 'Загрузить клинический снимок ТРГ пациента' pointing to sample image must be eliminated",
		);
	});

	it("2. ZERO AI MOCKS GATE: rejects uncalibrated AI simulation in production when ONNX is absent", async () => {
		// Production Mode: isDemoShowcaseMode() is false
		setRuntimeDemoMode(false);
		assert.equal(isDemoShowcaseMode(), false, "Must be in production mode");

		// When allowFallback is explicitly false in production without ONNX, runInference MUST throw an error
		await assert.rejects(
			async () => {
				await cephAiInferenceService.runInference("https://example.com/patient_real_xray.jpg", {
					allowFallback: false,
				});
			},
			{
				message: /Локальная нейросеть ONNX недоступна/,
			},
			"Production runInference with allowFallback=false must fail-closed and reject mock coordinates",
		);
	});

	it("3. CALIBRATED FALLBACK HONESTY: flags fallback coordinates with isCalibratedFallback: true and clear label", async () => {
		// When fallback is allowed (e.g. in demo or explicit fallback), service must honestly report isCalibratedFallback: true
		setRuntimeDemoMode(true);
		assert.equal(isDemoShowcaseMode(), true, "Must be in demo mode");

		const result = await cephAiInferenceService.runInference(SAMPLE_TRG_CEPHALOGRAM_URL, {
			allowFallback: true,
		});

		assert.ok(result.landmarks, "Result must contain landmarks");
		assert.equal(result.isCalibratedFallback, true, "Must be flagged as isCalibratedFallback: true");
		assert.ok(
			result.backendLabel.includes("шаблон") || result.backendLabel.includes("Fallback"),
			`backendLabel must explicitly notify doctor of template fallback: got "${result.backendLabel}"`,
		);
		assert.ok(result.fallbackReason, "Must provide human-readable fallback reason");
		assert.equal(Object.keys(result.landmarks).length, 16, "Must provide 16 landmark coordinates");
	});

	it("4. REAL EMR PERSISTENCE: saves and loads cephalometric analysis in patient record without data loss", () => {
		const testPatientId = "pat_real_ortho_12345";
		const testPatientName = "Соколова Анна Михайловна";

		const analysis = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET, 0.15);

		const savedRecord = saveCephalometricAnalysisToEmr({
			patientId: testPatientId,
			patientName: testPatientName,
			imageUrl: "/radiology/patient_trg_verified.png",
			landmarks: CLASS_I_NORMAL_LANDMARKS_PRESET,
			scaleMmPerPixel: 0.15,
			analysis,
			source: "manual",
			backendUsed: "Верифицированная ручная разметка",
			isCalibratedFallback: false,
		});

		assert.ok(savedRecord.id, "Saved record must have generated unique ID");
		assert.equal(savedRecord.patientId, testPatientId);
		assert.equal(savedRecord.isCalibratedFallback, false);
		assert.equal(savedRecord.placedCount, 16);
		assert.ok(savedRecord.protocol043Text.includes("ПРОТОКОЛ ТЕЛЕРЕНТГЕНОГРАФИЧЕСКОГО"), "Must contain Form 043 text");

		// Verify retrieval through persistence API
		const storedList = loadPatientCephalometricStudies(testPatientId);
		assert.equal(storedList.length, 1, "Must contain exactly 1 stored study for patient");
		assert.equal(storedList[0]?.id, savedRecord.id);

		const latest = loadLatestCephalometricStudy(testPatientId);
		assert.ok(latest, "Must load latest study");
		assert.equal(latest.id, savedRecord.id);
		assert.equal(latest.landmarks.S?.x, CLASS_I_NORMAL_LANDMARKS_PRESET.S?.x);
		assert.equal(latest.landmarks.N?.y, CLASS_I_NORMAL_LANDMARKS_PRESET.N?.y);

		// Verify registration in global imaging studies and EMR attachments
		const emrKey = `dente_patient_emr_attachments_${testPatientId}`;
		const rawEmr = globalThis.window.localStorage.getItem(emrKey);
		assert.ok(rawEmr, "EMR attachments must exist in storage");
		const emrAttachments = JSON.parse(rawEmr);
		assert.equal(emrAttachments.length, 1);
		assert.equal(emrAttachments[0].type, "trg_cephalometric_lateral");
		assert.equal(emrAttachments[0].status, "analyzed");

		const globalStudiesRaw = globalThis.window.localStorage.getItem("dente_imaging_studies");
		assert.ok(globalStudiesRaw, "Global imaging studies must exist");
		const globalStudies = JSON.parse(globalStudiesRaw);
		assert.ok(globalStudies.length >= 1);
		assert.equal(globalStudies[0].type, "trg_cephalometric_lateral");
	});

	it("5. CLINICAL MATHEMATICS FIDELITY: verifies Steiner, Tweed, Downs, and McNamara metrics", () => {
		// Class I verification
		const classIAnalysis = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);
		assert.equal(classIAnalysis.diagnosis.skeletalClass, "Class I");
		assert.ok(classIAnalysis.diagnosis.skeletalClassRu.includes("Скелетный класс I"));

		// Class II verification
		const classIIAnalysis = calculateCephalometrics(CLASS_II_DISTAL_LANDMARKS_PRESET);
		assert.equal(classIIAnalysis.diagnosis.skeletalClass, "Class II");
		assert.ok(classIIAnalysis.diagnosis.skeletalClassRu.includes("Скелетный класс II"));

		// Class III verification
		const classIIIAnalysis = calculateCephalometrics(CLASS_III_MESIAL_LANDMARKS_PRESET);
		assert.equal(classIIIAnalysis.diagnosis.skeletalClass, "Class III");
		assert.ok(classIIIAnalysis.diagnosis.skeletalClassRu.includes("Скелетный класс III"));

		// Measurements presence and absence of NaN
		for (const meas of classIAnalysis.measurements) {
			if (meas.value !== null) {
				assert.ok(Number.isFinite(meas.value), `Measurement ${meas.id} must be finite number, got ${meas.value}`);
			}
		}
	});
});
