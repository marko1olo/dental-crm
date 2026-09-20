import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	DENTAL_SENSOR_PRESETS,
	calculatePeriapicalLesion,
	calculateRuler,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
	type PeriapicalLesion,
	type RulerMeasurement,
} from "../VisiographMeasurementMath";
import {
	STANDARD_SENSOR_PRESETS,
} from "../VisiographStudioCanvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Visiograph Studio 1-Click Clinical Sensor Presets (Mandates 8e, 8k)", () => {
	test("defines standard RVG Size 1, RVG Size 2, and OPG sensor presets with exact physical pitch", () => {
		assert.strictEqual(STANDARD_SENSOR_PRESETS.length, 3);

		const rvg1 = STANDARD_SENSOR_PRESETS.find((p) => p.id === "rvg_size_1");
		assert.ok(rvg1, "RVG Size 1 preset must exist");
		assert.strictEqual(rvg1.pixelSizeMm, 0.02);
		assert.match(rvg1.label, /20 мкм/);

		const rvg2 = STANDARD_SENSOR_PRESETS.find((p) => p.id === "rvg_size_2");
		assert.ok(rvg2, "RVG Size 2 preset must exist");
		assert.strictEqual(rvg2.pixelSizeMm, 0.025);
		assert.match(rvg2.label, /25 мкм/);

		const opg = STANDARD_SENSOR_PRESETS.find((p) => p.id === "opg_standard");
		assert.ok(opg, "OPG standard preset must exist");
		assert.strictEqual(opg.pixelSizeMm, 0.05);
		assert.match(opg.label, /50 мкм/);
	});

	test("DENTAL_SENSOR_PRESETS in math engine matches STANDARD_SENSOR_PRESETS in canvas", () => {
		assert.strictEqual(DENTAL_SENSOR_PRESETS.length, STANDARD_SENSOR_PRESETS.length);
		for (let i = 0; i < DENTAL_SENSOR_PRESETS.length; i++) {
			const m = DENTAL_SENSOR_PRESETS[i];
			const c = STANDARD_SENSOR_PRESETS[i];
			assert.strictEqual(m?.id, c?.id);
			assert.strictEqual(m?.pixelSizeMm, c?.pixelSizeMm);
		}
	});

	test("recalculates linear rulers when switching sensor preset scale in 1 click", () => {
		// Initial measurement on default 0.05 mm/pixel scale
		const r1: RulerMeasurement = {
			id: "r1",
			p1: { x: 0, y: 0 },
			p2: { x: 200, y: 0 },
			lengthPx: 200,
			lengthMm: 10.0, // 200 * 0.05
			label: "L1",
		};

		// 1-Click switch to RVG Size 1 (0.020 mm/px)
		const updatedRvg1 = recalculateRulersWithScale([r1], 0.02);
		assert.strictEqual(updatedRvg1.length, 1);
		assert.strictEqual(updatedRvg1[0]?.lengthMm, 4.0); // 200 * 0.020
		assert.strictEqual(updatedRvg1[0]?.label, "L1");

		// 1-Click switch to RVG Size 2 (0.025 mm/px)
		const updatedRvg2 = recalculateRulersWithScale([r1], 0.025);
		assert.strictEqual(updatedRvg2[0]?.lengthMm, 5.0); // 200 * 0.025
	});

	test("recalculates endodontic working length (WL / Apex) polyline and updates label dynamically", () => {
		// A curved canal polyline with 880 px total length (measured with Apex Locator tool)
		const canalRuler: RulerMeasurement = {
			id: "canal-1",
			p1: { x: 100, y: 50 },
			p2: { x: 120, y: 300 },
			lengthPx: 880,
			lengthMm: 22.0, // 880 * 0.025
			label: "Канал: 22.0 мм (WL/Апекс)",
			color: "#10b981",
		};

		// Switch to RVG Size 1 (0.020 mm/px)
		const updated = recalculateRulersWithScale([canalRuler], 0.02);
		assert.strictEqual(updated.length, 1);
		// 880 * 0.020 = 17.6 mm
		assert.strictEqual(Math.round(updated[0]!.lengthMm * 10) / 10, 17.6);
		assert.strictEqual(updated[0]!.label, "Канал: 17.6 мм (WL/Апекс)");
	});

	test("recalculates periapical bone destruction area and reclassifies clinical diagnosis", () => {
		// 100x100 pixel square lesion (10,000 px²)
		const squarePoints = [
			{ x: 10, y: 10 },
			{ x: 110, y: 10 },
			{ x: 110, y: 110 },
			{ x: 10, y: 110 },
		];

		// At OPG standard (0.050 mm/px):
		// Area = 10,000 * 0.0025 = 25 mm², D = 2 * sqrt(25 / pi) ~ 5.64 mm -> classified as cyst
		const initialLesion = calculatePeriapicalLesion(squarePoints, 0.05, "16", "lesion-1");
		assert.strictEqual(Math.round(initialLesion.areaMm2 * 10) / 10, 25.0);
		assert.strictEqual(initialLesion.classification, "cyst");
		assert.match(initialLesion.classificationLabel, /Киста/);

		// Switch in 1 click to RVG Size 1 (0.020 mm/px):
		// Area = 10,000 * 0.0004 = 4 mm², D = 2 * sqrt(4 / pi) ~ 2.26 mm -> reclassified as granuloma (< 5.0 mm)
		const recalculated = recalculateLesionsWithScale([initialLesion], 0.02);
		assert.strictEqual(recalculated.length, 1);
		assert.strictEqual(Math.round(recalculated[0]!.areaMm2 * 10) / 10, 4.0);
		assert.strictEqual(recalculated[0]!.classification, "granuloma");
		assert.match(recalculated[0]!.classificationLabel, /гранулема/);
		assert.ok(recalculated[0]!.clinicalDescription.includes("4.0 мм²"));
	});
});

describe("Visiograph Studio Theme Token Compliance & Ergonomics (Mandates 8d, 8e)", () => {
	test("VisiographStudioCanvas uses DENTE CSS tokens instead of bare hardcoded dark colors in UI styles", () => {
		const filePath = path.resolve(__dirname, "../VisiographStudioCanvas.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		// Tokens that MUST be utilized in UI styling
		assert.ok(content.includes("var(--paper"), "Must use var(--paper)");
		assert.ok(content.includes("var(--paper-soft"), "Must use var(--paper-soft)");
		assert.ok(content.includes("var(--paper-strong"), "Must use var(--paper-strong)");
		assert.ok(content.includes("var(--ink"), "Must use var(--ink)");
		assert.ok(content.includes("var(--line"), "Must use var(--line)");
		assert.ok(content.includes("var(--primary"), "Must use var(--primary)");

		// Check that bare UI styles do not contain hardcoded dark colors without var(...)
		// Example forbidden: background: "#161b22" or color: "#c9d1d9" outside var()
		const bareDarkBgRegex = /(?:background|background-color)\s*:\s*["']#(?:161b22|0d1117|21262d|30363d)["']/gi;
		const bareDarkMatches = content.match(bareDarkBgRegex);
		assert.strictEqual(
			bareDarkMatches,
			null,
			`Found hardcoded dark background styles without tokens: ${JSON.stringify(bareDarkMatches)}`,
		);

		const bareInkRegex = /(?:color)\s*:\s*["']#(?:c9d1d9|8b949e)["']/gi;
		const bareInkMatches = content.match(bareInkRegex);
		assert.strictEqual(
			bareInkMatches,
			null,
			`Found hardcoded ink/muted color styles without tokens: ${JSON.stringify(bareInkMatches)}`,
		);
	});

	test("interactive buttons adhere to touch target minimums (>= 44px for primary, >= 34px for compact presets)", () => {
		const filePath = path.resolve(__dirname, "../VisiographStudioCanvas.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		// Verify 44px minHeight touch target standard is present
		assert.ok(
			content.includes('minHeight: "44px"'),
			"Must include 44px minimum height touch targets for primary toolbar buttons",
		);

		// Verify 1-click sensor preset select exists
		assert.ok(
			content.includes("STANDARD_SENSOR_PRESETS.map"),
			"Must render STANDARD_SENSOR_PRESETS in UI for 1-click selection",
		);
		assert.ok(
			content.includes("handleApplySensorPreset"),
			"Must wire handleApplySensorPreset for zero-friction 1-click calibration",
		);
	});
});

describe("Visiograph Studio 60 FPS & Low-Spec Engine Optimization (Mandates 8c, 8e)", () => {
	test("VisiographStudioCanvas utilizes offscreen canvas caching to prevent CPU LUT recalculations on hover", () => {
		const filePath = path.resolve(__dirname, "../VisiographStudioCanvas.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		assert.ok(
			content.includes("processedCanvasRef"),
			"Must maintain processedCanvasRef for caching pre-processed radiological filters",
		);
		assert.ok(
			content.includes("updateProcessedImage"),
			"Must have dedicated updateProcessedImage callback triggered only on param/image change",
		);
		assert.ok(
			content.includes("areParamsEqual"),
			"Must implement dirty-checking for filter parameters",
		);
		assert.ok(
			content.includes("ctx.drawImage(offscreen, 0, 0)"),
			"Must blit cached offscreen canvas via drawImage in <0.2ms instead of per-frame CPU LUT loops",
		);
	});

	test("coalesces mouse move events via requestAnimationFrame to sustain 60 FPS under rapid cursor motion", () => {
		const filePath = path.resolve(__dirname, "../VisiographStudioCanvas.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		assert.ok(
			content.includes("requestAnimationFrame"),
			"Must throttle mouse move events with requestAnimationFrame",
		);
		assert.ok(
			content.includes("hoverRafIdRef"),
			"Must track RAF id in a ref to prevent frame stacking",
		);
		assert.ok(
			content.includes("handleMouseLeave"),
			"Must handle mouse leave to cancel pending RAF and clear hover state",
		);
	});
});

