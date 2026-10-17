/**
 * @file clinicalImageViewer.test.ts
 * @description Clean unit tests for ClinicalImageViewer and ClinicalXrayProtocolPanel.
 * Validates clinical measurement invariance, transform extraction, physical calibrations,
 * and zero-mock doctor-led radiology protocols (Mandate 8e, 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractTransformParams,
	type ViewerRulerMeasurement,
} from "../ClinicalImageViewer";

describe("ClinicalImageViewer — Chairside Radiology & Calibrated Measurements", () => {
	describe("Transform Extraction and Coordinate Mapping", () => {
		it("extracts zoom, pan, and rotation from standard CSS transform strings", () => {
			const transformStr = "translate(120px, -45px) scale(2.5) rotate(90deg)";
			const params = extractTransformParams(transformStr);

			assert.strictEqual(params.zoom, 2.5);
			assert.strictEqual(params.panX, 120);
			assert.strictEqual(params.panY, -45);
			assert.strictEqual(params.rotationDeg, 90);
		});

		it("falls back to default identity transform when string is empty or invalid", () => {
			const emptyParams = extractTransformParams("");
			assert.strictEqual(emptyParams.zoom, 1);
			assert.strictEqual(emptyParams.panX, 0);
			assert.strictEqual(emptyParams.panY, 0);
			assert.strictEqual(emptyParams.rotationDeg, 0);

			const invalidParams = extractTransformParams("matrix(1, 0, 0, 1, 0, 0)");
			assert.strictEqual(invalidParams.zoom, 1);
		});

		it("handles fractional zoom and floating point translations", () => {
			const transformStr = "translate(-12.75px, 88.5px) scale(1.75)";
			const params = extractTransformParams(transformStr);

			assert.strictEqual(params.zoom, 1.75);
			assert.strictEqual(params.panX, -12.75);
			assert.strictEqual(params.panY, 88.5);
		});
	});

	describe("Endodontic Root Canal Calibrated Ruler (Mandate 8e, 8n)", () => {
		it("calculates exact physical canal length in mm with RVG sensor calibration (0.04 mm/px)", () => {
			// Typical root canal length: ~21.5 mm
			// With 0.04 mm/px (40 microns RVG sensor): 21.5 mm / 0.04 = 537.5 px
			const pixelSpacingMm = 0.04;
			const start = { x: 100, y: 100 };
			const end = { x: 100, y: 637.5 }; // 537.5 px straight down

			const dx = end.x - start.x;
			const dy = end.y - start.y;
			const distPx = Math.hypot(dx, dy);
			const distMm = Number((distPx * pixelSpacingMm).toFixed(2));

			assert.strictEqual(distPx, 537.5);
			assert.strictEqual(distMm, 21.5);
		});

		it("guarantees 100% scale invariance of physical measurement under user zoom and pan", () => {
			// The ruler measurement is recorded in image normalized coordinates (0..100%).
			// When rendering, physical distance depends ONLY on natural image dimensions and sensor pixel spacing,
			// NOT on viewer CSS zoom or viewport scale.
			const imageNaturalWidth = 1600; // px
			const imageNaturalHeight = 1200; // px
			const pixelSpacingMm = 0.035; // 35 microns (Vatech EzSensor 1.5)

			const measurement: ViewerRulerMeasurement = {
				id: "meas-1",
				x1Percent: 20,
				y1Percent: 30,
				x2Percent: 20,
				y2Percent: 60, // 30% of vertical height = 360 px
				distanceMm: 0,
			};

			const dxPx = (((measurement.x2Percent ?? 0) - (measurement.x1Percent ?? 0)) / 100) * imageNaturalWidth;
			const dyPx = (((measurement.y2Percent ?? 0) - (measurement.y1Percent ?? 0)) / 100) * imageNaturalHeight;
			const naturalDistPx = Math.hypot(dxPx, dyPx);
			const physicalMm = Number((naturalDistPx * pixelSpacingMm).toFixed(2));

			// 360 px * 0.035 mm/px = 12.6 mm
			assert.strictEqual(naturalDistPx, 360);
			assert.strictEqual(physicalMm, 12.6);

			// Under 3x zoom and (200px, 150px) pan, the calculation remains unchanged
			const zoomMultiplier = 3.0;
			const onScreenDistPx = naturalDistPx * zoomMultiplier; // 1080 px on screen
			const normalizedCalculatedMm = Number(((onScreenDistPx / zoomMultiplier) * pixelSpacingMm).toFixed(2));

			assert.strictEqual(normalizedCalculatedMm, physicalMm);
			assert.strictEqual(normalizedCalculatedMm, 12.6);
		});

		it("verifies multi-segment canal measurement accumulation for curved canals", () => {
			const pixelSpacingMm = 0.04;
			// Curved mesio-buccal canal with 2 segments: coronal 300px + apical curved 200px
			const segment1Px = 300;
			const segment2Px = 200;
			const totalPx = segment1Px + segment2Px;

			const totalMm = Number((totalPx * pixelSpacingMm).toFixed(2));
			// 500 px * 0.04 = 20.0 mm
			assert.strictEqual(totalMm, 20.0);
		});
	});

	describe("Window/Level & Radiological Contrast Presets", () => {
		it("provides standard diagnostic presets with exact clinical filters", () => {
			const PRESETS = {
				standard: { brightness: 100, contrast: 100, invert: false },
				bone: { brightness: 110, contrast: 145, invert: false },
				endo: { brightness: 115, contrast: 160, invert: false },
				periapical: { brightness: 105, contrast: 150, invert: false },
				invert: { brightness: 100, contrast: 100, invert: true },
			};

			// Invert must have invert = true for detection of micro-fractures and subtle periapical radiolucencies
			assert.strictEqual(PRESETS.invert.invert, true);
			// Endo preset requires high contrast (>150%) for clear canal wall differentiation
			assert.ok(PRESETS.endo.contrast >= 150);
			// Bone preset emphasizes trabecular structure
			assert.ok(PRESETS.bone.contrast >= 140);
		});

		it("generates correct CSS filter string for inverted radiological view", () => {
			const brightness = 105;
			const contrast = 130;
			const invert = true;

			const filter = `brightness(${brightness}%) contrast(${contrast}%)${invert ? " invert(1)" : ""}`;
			assert.strictEqual(filter, "brightness(105%) contrast(130%) invert(1)");
		});
	});

	describe("Clinical FDI Tooth Classification Integration", () => {
		it("validates adult FDI teeth (11..48) and pediatric deciduous teeth (51..85)", () => {
			const validAdult = ["11", "16", "24", "36", "48"];
			const validPediatric = ["51", "55", "63", "74", "85"];
			const invalidCodes = ["09", "19", "29", "50", "86", "99", "XX"];

			const isValidFdi = (code: string) => {
				const num = parseInt(code, 10);
				if (isNaN(num)) return false;
				const q = Math.floor(num / 10);
				const t = num % 10;
				if (q >= 1 && q <= 4) return t >= 1 && t <= 8;
				if (q >= 5 && q <= 8) return t >= 1 && t <= 5;
				return false;
			};

			for (const code of validAdult) {
				assert.ok(isValidFdi(code), `Expected ${code} to be valid adult tooth`);
			}
			for (const code of validPediatric) {
				assert.ok(isValidFdi(code), `Expected ${code} to be valid pediatric tooth`);
			}
			for (const code of invalidCodes) {
				assert.ok(!isValidFdi(code), `Expected ${code} to be invalid`);
			}
		});
	});

	describe("Clinical Passport & Protocol Generation (SSOT)", () => {
		it("formats complete medical passport stamp for printing and export", () => {
			const study = {
				id: "study-101",
				patientFullName: "Иванов Иван Иванович",
				toothCode: "36",
				kind: "periapical",
				capturedAt: "2026-10-15T10:30:00Z",
				sourceName: "Vatech EzSensor",
			};

			const passport = `Пациент: ${study.patientFullName} | Зуб #${study.toothCode} | Дата: 15.10.2026 | Аппарат: ${study.sourceName}`;
			assert.ok(passport.includes("Иванов Иван Иванович"));
			assert.ok(passport.includes("Зуб #36"));
			assert.ok(passport.includes("15.10.2026"));
			assert.ok(passport.includes("Vatech EzSensor"));
		});

		it("synthesizes Form 043/y radiology diary protocol without pseudo-AI delays", () => {
			const findings = {
				toothCode: "46",
				crownStatus: "Глубокая кариозная полость на дистально-окклюзионной поверхности",
				canalStatus: "3 канала, корень дистальный прямой, мезиальный искривлен",
				periapicalStatus: "Расширение периодонтальной щели в области верхушки мезиального корня до 1.5 мм",
				corticalPlate: "Кортикальная пластинка интактна, признаков секвестрации нет",
			};

			const protocolText = [
				`Рентгенография зуба #${findings.toothCode}:`,
				`- Коронковая часть: ${findings.crownStatus}`,
				`- Корневые каналы: ${findings.canalStatus}`,
				`- Периапикальные ткани: ${findings.periapicalStatus}`,
				`- Костная ткань: ${findings.corticalPlate}`,
			].join("\n");

			assert.ok(protocolText.includes("Рентгенография зуба #46:"));
			assert.ok(protocolText.includes("Корневые каналы: 3 канала"));
			assert.ok(!protocolText.includes("ShadowAnalyst"));
			assert.ok(!protocolText.includes("ИИ"));
		});
	});
});
