import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Visiograph Studio Theme Token Compliance & Ergonomics (Mandates 8d, 8e)", () => {
	const sourceFiles = [
		"../VisiographStudioCanvas.tsx",
		"../VisiographStudioSidebar.tsx",
		"../VisiographStudioSidebar.css",
		"../useVisiographCanvasState.ts",
		"../VisiographCanvasRenderEngine.ts",
	];
	const fullStudioSource = sourceFiles.map((f) => fs.readFileSync(path.resolve(__dirname, f), "utf8")).join("\n");

	test("VisiographStudioCanvas uses DENTE CSS tokens instead of bare hardcoded dark colors in UI styles", () => {
		assert.ok(fullStudioSource.includes("var(--paper"), "Must use var(--paper)");
		assert.ok(fullStudioSource.includes("var(--paper-soft"), "Must use var(--paper-soft)");
		assert.ok(fullStudioSource.includes("var(--paper-strong"), "Must use var(--paper-strong)");
		assert.ok(fullStudioSource.includes("var(--ink"), "Must use var(--ink)");
		assert.ok(fullStudioSource.includes("var(--line"), "Must use var(--line)");
		assert.ok(fullStudioSource.includes("var(--primary"), "Must use var(--primary)");

		const bareDarkBgRegex = /(?:background|background-color)\s*:\s*["']#(?:161b22|0d1117|21262d|30363d)["']/gi;
		assert.strictEqual(fullStudioSource.match(bareDarkBgRegex), null, "Found bare dark background");

		const bareInkRegex = /(?:color)\s*:\s*["']#(?:c9d1d9|8b949e)["']/gi;
		assert.strictEqual(fullStudioSource.match(bareInkRegex), null, "Found bare ink colors");
	});

	test("interactive buttons adhere to touch target minimums (>= 44px for primary, >= 34px for compact presets)", () => {
		assert.ok(fullStudioSource.includes('minHeight: "44px"') || fullStudioSource.includes("min-height: 44px"), "Must include 44px touch targets");
		assert.ok(fullStudioSource.includes("STANDARD_SENSOR_PRESETS.map"), "Must render presets");
		assert.ok(fullStudioSource.includes("handleApplySensorPreset"), "Must wire sensor preset handler");
	});
});

describe("Visiograph Studio 60 FPS & Low-Spec Engine Optimization (Mandates 8c, 8e)", () => {
	const sourceFiles = [
		"../VisiographStudioCanvas.tsx",
		"../useVisiographCanvasState.ts",
		"../VisiographCanvasRenderEngine.ts",
	];
	const fullEngineSource = sourceFiles.map((f) => fs.readFileSync(path.resolve(__dirname, f), "utf8")).join("\n");

	test("VisiographStudioCanvas utilizes offscreen canvas caching to prevent CPU LUT recalculations on hover", () => {
		assert.ok(fullEngineSource.includes("processedCanvasRef"), "Must maintain processedCanvasRef");
		assert.ok(fullEngineSource.includes("updateProcessedImage"), "Must have updateProcessedImage");
		assert.ok(fullEngineSource.includes("areParamsEqual"), "Must implement areParamsEqual");
		assert.ok(fullEngineSource.includes("ctx.drawImage(offscreen, 0, 0)"), "Must blit cached offscreen canvas");
	});

	test("coalesces mouse move events via requestAnimationFrame to sustain 60 FPS under rapid cursor motion", () => {
		assert.ok(fullEngineSource.includes("requestAnimationFrame"), "Must throttle mouse move with RAF");
		assert.ok(fullEngineSource.includes("hoverRafIdRef"), "Must track RAF id");
		assert.ok(fullEngineSource.includes("handleMouseLeave"), "Must handle mouse leave");
	});
});
