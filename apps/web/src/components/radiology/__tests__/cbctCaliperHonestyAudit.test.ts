/**
 * cbctCaliperHonestyAudit.test.ts — Adversarial Verification Suite for
 * Alveolar Ridge Caliper Honesty, Zero-Falsification Invariant (BUG-010),
 * and CBCT PDF Report Integrity per Mandates 8b, 8e (Doctor Autonomy).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Mock browser global environment for Node.js test runner
if (typeof (globalThis as any).window === "undefined") {
	class MockWindow extends EventTarget {
		localStorage = {
			_storage: new Map<string, string>(),
			getItem(key: string) {
				return this._storage.get(key) ?? null;
			},
			setItem(key: string, value: string) {
				this._storage.set(key, String(value));
			},
			removeItem(key: string) {
				this._storage.delete(key);
			},
			clear() {
				this._storage.clear();
			},
		};
		open() {
			return {
				document: {
					open() {},
					write() {},
					close() {},
				},
				focus() {},
				print() {},
			};
		}
	}
	(globalThis as any).window = new MockWindow();
}

import {
	buildCbctReportData,
	renderCbctReportHtml,
	type CbctReportData,
} from "../cbctExportEngine";
import {
	exportPdfImplantReport,
	buildImplantTreatmentPlanItem,
	buildImplantDiarySoapEntry,
	exportImplantToScheduleDraft,
	type CtImplantBridgeParams,
} from "../ctImplantIntegrationBridge";
import { measureAlveolarRidgeCrossSection } from "../dentalCurveEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";
import type { CrossSectionImplantPose, MandibularCanalCrossSection, VirtualImplantSpec } from "../implantSafetyEngine";
import { classifyMischBoneQuality, type HUZoneSampling, type MischClassificationResult } from "../boneDensityMischMath";

const TEST_IMPLANT_SPEC: VirtualImplantSpec = {
	id: "straumann-blx-40-10",
	brand: "straumann",
	brandName: "Straumann BLX",
	lineName: "BLX Roxolid SLActive",
	diameterMm: 4.0,
	lengthMm: 10.0,
	platformDiameterMm: 4.0,
	apexDiameterMm: 2.8,
	priceKopecks: 4800000,
	articleNumber: "025.4110",
};

const TEST_IMPLANT_POSE: CrossSectionImplantPose = {
	entryPoint: { x: 0, y: 1.5 },
	angulationDeg: 2.0,
	implantSpec: TEST_IMPLANT_SPEC,
	targetToothFdi: 36,
};

const TEST_HU_SAMPLING: HUZoneSampling = {
	overallMeanHU: 920,
	coronalCrestalHU: 1100,
	trabecularCoreHU: 780,
	apicalBaseHU: 880,
	status: "measured",
};

const TEST_MISCH_RESULT: MischClassificationResult = classifyMischBoneQuality(TEST_HU_SAMPLING);

describe("Wave 28 Domain 2 — Alveolar Ridge Honesty & Zero-Falsification Audit (BUG-010)", () => {
	describe("1. buildCbctReportData — Absence of Hardcoded Fallbacks", () => {
		it("leaves ridgeHeightMm, ridgeWidthMm, and residual bone strictly null when unmeasured", () => {
			const report = buildCbctReportData({
				targetToothFdi: 36,
				implantPose: TEST_IMPLANT_POSE,
				mischResult: TEST_MISCH_RESULT,
				huSampling: TEST_HU_SAMPLING,
				// containment, ridgeHeightMm, ridgeWidthMm omitted
			});

			assert.equal(report.bone.ridgeHeightMm, null, "ridgeHeightMm must be null when unmeasured (never 22.0)");
			assert.equal(report.bone.ridgeWidthMm, null, "ridgeWidthMm must be null when unmeasured (never 8.0)");
			assert.equal(report.bone.residualBuccalBoneMm, null, "residualBuccalBoneMm must be null when unmeasured");
			assert.equal(report.bone.residualLingualBoneMm, null, "residualLingualBoneMm must be null when unmeasured");
		});

		it("accepts explicit doctor caliper measurements accurately", () => {
			const report = buildCbctReportData({
				targetToothFdi: 36,
				implantPose: TEST_IMPLANT_POSE,
				mischResult: TEST_MISCH_RESULT,
				huSampling: TEST_HU_SAMPLING,
				ridgeHeightMm: 13.8,
				ridgeWidthMm: 6.4,
			});

			assert.equal(report.bone.ridgeHeightMm, 13.8);
			assert.equal(report.bone.ridgeWidthMm, 6.4);
		});
	});

	describe("2. renderCbctReportHtml — Medical Honesty & Anti-Crash Invariant", () => {
		it("renders 'Не измерялась (—)' and does not crash calling .toFixed on null values", () => {
			const reportData = buildCbctReportData({
				targetToothFdi: 36,
				implantPose: TEST_IMPLANT_POSE,
				mischResult: TEST_MISCH_RESULT,
				huSampling: TEST_HU_SAMPLING,
			});

			// Must not throw TypeError: Cannot read properties of null (reading 'toFixed')
			let html = "";
			assert.doesNotThrow(() => {
				html = renderCbctReportHtml(reportData, { tonerSaving: true });
			});

			assert.ok(html.includes("Ширина альвеолярного гребня"));
			assert.ok(html.includes("Высота альвеолярного гребня"));
			assert.ok(html.includes("Не измерялась (—)"));

			// Verify zero falsified 22.0 or 8.0 values in the bone section
			const boneTableMatch = html.match(/<table class="table-clean">[\s\S]*?<\/table>/);
			assert.ok(boneTableMatch, "Bone table must exist in report HTML");
			const boneTableText = boneTableMatch[0];
			assert.equal(boneTableText.includes("22.0 мм"), false, "Must not contain falsified 22.0 mm");
			assert.equal(boneTableText.includes("8.0 мм"), false, "Must not contain falsified 8.0 mm");
		});

		it("renders measured caliper dimensions when provided", () => {
			const reportData = buildCbctReportData({
				targetToothFdi: 36,
				implantPose: TEST_IMPLANT_POSE,
				mischResult: TEST_MISCH_RESULT,
				huSampling: TEST_HU_SAMPLING,
				ridgeHeightMm: 15.2,
				ridgeWidthMm: 7.1,
			});

			const html = renderCbctReportHtml(reportData, { tonerSaving: true });
			assert.ok(html.includes("15.2 мм"), "Must render measured height 15.2 mm");
			assert.ok(html.includes("7.1 мм"), "Must render measured width 7.1 mm");
		});
	});

	describe("3. exportPdfImplantReport — Real Caliper Integration", () => {
		const MOCK_CANAL: MandibularCanalCrossSection = {
			center: { x: 0, y: 18.0 },
			radiusMm: 1.5,
			safetyMarginMm: 2.0,
		};

		const MOCK_CALIPER: AlveolarRidgeCaliperMeasurement = {
			id: "caliper-36-audit",
			fdiTooth: "36",
			label: "Измерение гребня FDI 36",
			crestPoint: { x: 0, y: 1.0 },
			basePoint: { x: 0, y: 14.5 },
			heightMm: 13.5,
			crestWidthMm: 6.8,
			midWidthMm: 7.5,
			baseWidthMm: 9.0,
			implantFeasibility: {
				isAdequate: true,
				recommendedDiameterMm: 4.0,
				recommendedLengthMm: 10.0,
				requiresBoneGrafting: false,
				clinicalAdviceRu: "Объем кости достаточен",
			},
		};

		it("handles exportPdfImplantReport safely with unmeasured ridge without error", () => {
			assert.doesNotThrow(() => {
				exportPdfImplantReport({
					targetTooth: 36,
					currentImplantPose: TEST_IMPLANT_POSE,
					currentCanal: MOCK_CANAL,
					huSamplingResult: TEST_HU_SAMPLING,
					patientDisplayName: "Аудит Пациент",
					mischClassification: TEST_MISCH_RESULT,
					nerveAuditResult: {
						distanceToCanalCenterMm: 6.5,
						netClearanceToCanalWallMm: 5.0,
						netClearanceToSafetyCorridorMm: 3.0,
						safetyStatus: "safe",
						isDangerous: false,
						isWarning: false,
						shouldTriggerAudioAlarm: false,
						closestImplantPoint: { x: 0, y: 11.5 },
						closestNervePoint: { x: 0, y: 16.5 },
						clinicalMessageRu: "Безопасная зона",
					},
				});
			});
		});

		it("handles exportPdfImplantReport with activeCaliper measurement", () => {
			assert.doesNotThrow(() => {
				exportPdfImplantReport({
					targetTooth: 36,
					currentImplantPose: TEST_IMPLANT_POSE,
					currentCanal: MOCK_CANAL,
					huSamplingResult: TEST_HU_SAMPLING,
					patientDisplayName: "Аудит Пациент",
					mischClassification: TEST_MISCH_RESULT,
					nerveAuditResult: {
						distanceToCanalCenterMm: 6.5,
						netClearanceToCanalWallMm: 5.0,
						netClearanceToSafetyCorridorMm: 3.0,
						safetyStatus: "safe",
						isDangerous: false,
						isWarning: false,
						shouldTriggerAudioAlarm: false,
						closestImplantPoint: { x: 0, y: 11.5 },
						closestNervePoint: { x: 0, y: 16.5 },
						clinicalMessageRu: "Безопасная зона",
					},
					activeCaliper: MOCK_CALIPER,
				});
			});
		});
	});

	describe("4. measureAlveolarRidgeCrossSection & Cross-Section Measurement Invariant", () => {
		it("safely handles null / empty slice data without error", () => {
			assert.equal(measureAlveolarRidgeCrossSection(null as any), null);
			assert.equal(measureAlveolarRidgeCrossSection({ pixelData: new Uint8ClampedArray(0) } as any), null);
		});

		it("extracts cortical crest height and alveolar ridge width from slice data when present", () => {
			const mockSlice: any = {
				sliceIndex: 12,
				nearestToothFdi: "46",
				corticalCrestHeightMm: 14.2,
				alveolarRidgeWidthMm: 7.4,
				pixelData: new Uint8ClampedArray(100),
			};
			const res = measureAlveolarRidgeCrossSection(mockSlice);
			assert.ok(res);
			assert.equal(res.heightMm, 14.2);
			assert.equal(res.crestWidthMm, 7.4);
			assert.equal(res.isAdequateForImplant, true);
		});
	});
});
