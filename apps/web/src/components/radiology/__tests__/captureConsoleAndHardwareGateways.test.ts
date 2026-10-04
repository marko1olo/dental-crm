/**
 * captureConsoleAndHardwareGateways.test.ts
 *
 * Window #3: Capture Console & Hardware Gateways (Вкладка «СНИМОК» EzDent-i).
 *
 * Mandates & Standards:
 * - EzDent-i Screenshot 20 & 21 Fidelity (docs/vatech_research/10_EZDENT_REAL_UI_TELEGRAM_SCREENSHOTS_AUDIT.md §2.6)
 * - 5 Capture Modes: [ IO-сенсор ], [ IO-камера ] (WebRTC getUserMedia), [ TWAIN ], [ Авто DSLR ], [ Импорт ]
 * - 4-Way Orientation Transforms: 90° CCW, 90° CW, Mirror X (Flip H), Mirror Y (Flip V)
 * - 100% Eradication of Physics/Radiology Clutter: zero kV, mA, seconds, or radiation dosimetry alerts in capture UI
 * - Mandate 8s: Single Canonical Domain Authority & Transparent Facades
 * - Mandate 8e: Doctor Autonomy (Zero hardware lock-in, immediate capture <50ms)
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toEqual: (expected: any) => assert.deepEqual(actual, expected),
	toContain: (substr: any) => assert.ok(actual.includes(substr)),
	toBeTruthy: () => assert.ok(Boolean(actual)),
	not: {
		toMatch: (regex: RegExp) => assert.ok(!regex.test(actual)),
		toContain: (substr: any) => assert.ok(!actual.includes(substr)),
	},
});

import {
	CAPTURE_SOURCE_MODES,
	SENSOR_MODELS,
	PROJECTION_TYPES,
	type CaptureSourceMode,
} from "../directRvgTypes";

import {
	HARDWARE_PRESETS,
	HARDWARE_CATEGORY_LABELS,
} from "../../../services/hardware/hardwarePresets";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("Window #3: Capture Console & Hardware Gateways (Вкладка «СНИМОК» EzDent-i)", () => {
	describe("1. Five Canonical Capture Modes (EzDent-i Screen 20 Sidebar)", () => {
		it("provides exactly 5 capture modes matching EzDent-i acquisition console", () => {
			expect(CAPTURE_SOURCE_MODES.length).toBe(5);
			const modeIds = CAPTURE_SOURCE_MODES.map((m) => m.id);
			expect(modeIds).toEqual(["io_sensor", "io_camera", "twain", "dslr", "import"]);
		});

		it("has clean clinical Russian labels for all 5 modes", () => {
			const labelMap = Object.fromEntries(CAPTURE_SOURCE_MODES.map((m) => [m.id, m.label]));
			expect(labelMap.io_sensor).toContain("IO-сенсор");
			expect(labelMap.io_camera).toContain("IO-камера");
			expect(labelMap.twain).toContain("TWAIN");
			expect(labelMap.dslr).toContain("Авто DSLR");
			expect(labelMap.import).toContain("Импорт");
		});

		it("verifies DirectRvgCaptureModal eliminates sidebar button clutter and provides instant capture", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).not.toContain('data-testid="rvg-capture-sidebar"');
			expect(modalSrc).toContain('data-testid="btn-rvg-trigger-empty-capture"');
			expect(modalSrc).toContain('data-testid="btn-rvg-upload-disk"');
		});

		it("verifies DirectRvgCaptureModal supports drag-and-drop file ingestion and disk upload", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).toContain("validateRadiologyUploadFile");
			expect(modalSrc).toContain("handleViewportDrop");
			expect(modalSrc).toContain('data-testid="rvg-drop-overlay"');
		});

		it("verifies DirectRvgCaptureModal supports instant hardware trigger and Space shortcut", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).toContain("handleTriggerCapture");
			expect(modalSrc).toContain('e.code === "Space"');
			expect(modalSrc).toContain("Снимок успешно получен с датчика RVG");
		});
	});

	describe("2. 4-Way Frame Orientation Transformations (EzDent-i Screen 21)", () => {
		it("supports 90° CCW, 90° CW, Mirror X (flipH), and Mirror Y (flipV) in DirectRvgViewportToolbar", () => {
			const toolbarSrc = readSource("components/radiology/DirectRvgViewportToolbar.tsx");
			expect(toolbarSrc).toContain('data-testid="rvg-rotate-ccw-btn"');
			expect(toolbarSrc).toContain('data-testid="rvg-rotate-btn"');
			expect(toolbarSrc).toContain('data-testid="rvg-flip-btn"');
			expect(toolbarSrc).toContain('data-testid="rvg-flip-v-btn"');
		});

		it("applies 4-way CSS transform matrix on DirectRvgCaptureModal viewport canvas", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).toContain("scaleX(${panZoom.flipH ? -1 : 1})");
			expect(modalSrc).toContain("scaleY(${panZoom.flipV ? -1 : 1})");
			expect(modalSrc).toContain("rotate(${panZoom.rotation}deg)");
		});

		it("supports 4-way orientation controls in HotFolderImageCanvas", () => {
			const canvasSrc = readSource("components/radiology/HotFolderImageCanvas.tsx");
			expect(canvasSrc).toContain('data-testid="hfi-rotate-ccw-btn"');
			expect(canvasSrc).toContain('data-testid="hfi-rotate-btn"');
			expect(canvasSrc).toContain('data-testid="hfi-flip-btn"');
			expect(canvasSrc).toContain('data-testid="hfi-flip-v-btn"');
			expect(canvasSrc).toContain("scaleY(${flipV ? -1 : 1})");
		});

		it("wires flipV and setFlipV in HotFolderIntakeModal", () => {
			const intakeSrc = readSource("components/radiology/HotFolderIntakeModal.tsx");
			expect(intakeSrc).toContain("const [flipV, setFlipV] = useState<boolean>(false)");
			expect(intakeSrc).toContain("flipV={flipV}");
			expect(intakeSrc).toContain("setFlipV={setFlipV}");
			expect(intakeSrc).toContain("setFlipV(false)");
		});
	});

	describe("3. Total Eradication of Physics & Radiology Clutter (EzDent-i Clean Ergonomics)", () => {
		it("ensures DirectRvgCaptureModal contains zero kV/mA/second inputs or radiation alerts", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			// Must not contain numeric input fields or sliders for kV or mA or seconds
			expect(modalSrc).not.toMatch(/<input[^>]+name=["'](?:kv|kilovolts|ma|milliamps)["']/i);
			expect(modalSrc).not.toMatch(/напряжение на трубке/i);
			expect(modalSrc).not.toMatch(/дозиметрическ(?:ий|ая) тревог/i);
		});

		it("ensures DirectRvgSensorTelemetryHeader contains zero physics clutter", () => {
			const headerSrc = readSource("components/radiology/DirectRvgSensorTelemetryHeader.tsx");
			expect(headerSrc).not.toMatch(/<input[^>]+name=["'](?:kv|ma)["']/i);
			expect(headerSrc).not.toMatch(/мА·с/i);
		});

		it("confirms clinical HUD in DirectRvgCaptureModal focuses strictly on FDI tooth and calibration", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).toContain("Зуб ${selectedTeeth.join");
			expect(modalSrc).toContain("Калибровка: 0.035 мм/пикс");
		});
	});

	describe("4. Sensor Models & Multi-Vendor Hardware Presets", () => {
		it("provides standard high-resolution sensor models with lp/mm and pixel spacing", () => {
			expect(SENSOR_MODELS.length >= 4).toBeTruthy();
			const vatechHd = SENSOR_MODELS.find((s) => s.id === "vatech_ezsensor_hd");
			expect(Boolean(vatechHd)).toBeTruthy();
			expect(vatechHd?.pixelSpacing).toBe(0.035);

			const planmeca = SENSOR_MODELS.find((s) => s.id === "planmeca_prosensor");
			expect(Boolean(planmeca)).toBeTruthy();
			expect(planmeca?.pixelSpacing).toBe(0.03);
		});

		it("provides multi-vendor hardware presets for Vatech, Sidexis, Romexis, Carestream, KaVo", () => {
			const vendorIds = HARDWARE_PRESETS.map((p) => p.id);
			expect(vendorIds).toContain("vatech_ezdent");
			expect(vendorIds).toContain("sirona_sidexis");
			expect(vendorIds).toContain("planmeca_romexis");
			expect(vendorIds).toContain("carestream_cs");
			expect(vendorIds).toContain("kavo_dtx");
		});
	});

	describe("5. Facade Integrity (Mandate 8s: Single Canonical Domain Authority)", () => {
		it("confirms components/imaging/DirectRvgCaptureModal.tsx exists and re-exports canonical component", () => {
			const facadePath = "components/imaging/DirectRvgCaptureModal.tsx";
			expect(existsSync(path.join(webSrcRoot, facadePath))).toBeTruthy();
			const facadeSrc = readSource(facadePath);
			expect(facadeSrc).toContain('export * from "../radiology/DirectRvgCaptureModal"');
			expect(facadeSrc).toContain('export { default } from "../radiology/DirectRvgCaptureModal"');
		});

		it("confirms components/imaging/HotFolderImageCanvas.tsx exists and re-exports canonical component", () => {
			const facadePath = "components/imaging/HotFolderImageCanvas.tsx";
			expect(existsSync(path.join(webSrcRoot, facadePath))).toBeTruthy();
			const facadeSrc = readSource(facadePath);
			expect(facadeSrc).toContain('export * from "../radiology/HotFolderImageCanvas"');
			expect(facadeSrc).toContain('export { default } from "../radiology/HotFolderImageCanvas"');
		});

		it("confirms components/visiograph/VisiographCapture.tsx exists and re-exports canonical component", () => {
			const facadePath = "components/visiograph/VisiographCapture.tsx";
			expect(existsSync(path.join(webSrcRoot, facadePath))).toBeTruthy();
			const facadeSrc = readSource(facadePath);
			expect(facadeSrc).toContain('export * from "../radiology/DirectRvgCaptureModal"');
			expect(facadeSrc).toContain('export { default } from "../radiology/DirectRvgCaptureModal"');
		});

		it("confirms components/hardware/HardwareSettingsModal.tsx exists and renders HardwareSettingsTab", () => {
			const modalPath = "components/hardware/HardwareSettingsModal.tsx";
			expect(existsSync(path.join(webSrcRoot, modalPath))).toBeTruthy();
			const modalSrc = readSource(modalPath);
			expect(modalSrc).toContain("HardwareSettingsTab");
			expect(modalSrc).toContain('data-testid="hardware-settings-modal"');
			expect(modalSrc).toContain('data-testid="hardware-settings-modal-close"');
		});
	});

	describe("6. Non-Conflicting USB Hardware Architecture & Coexistence Law", () => {
		it("ensures zero exclusive USB lock collision and prioritizes non-conflicting hot folder intake", () => {
			const gatewaySrc = readSource("components/radiology/UniversalSensorGateway.ts");
			expect(gatewaySrc).toContain("NON_CONFLICTING_USB_POLICY");
			expect(gatewaySrc).toContain("Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB");
			expect(gatewaySrc).toContain("intakeChannel: \"hot_folder\"");
			expect(gatewaySrc).toContain("Ожидание снимка (Hot Folder / Автоподхват)");
		});

		it("verifies DirectRvgCaptureModal renders non-conflicting telemetry and Ctrl+V clipboard integration", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			expect(modalSrc).toContain("Ожидание снимка (Hot Folder / Автоподхват)");
			expect(modalSrc).toContain("Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB");
			expect(modalSrc).toContain('window.addEventListener("paste", handlePaste)');
			expect(modalSrc).toContain("Снимок успешно вставлен из буфера обмена (Ctrl+V)");
		});

		it("verifies HotFolderIntakeModal provides non-conflicting badge and instant paste", () => {
			const intakeSrc = readSource("components/radiology/HotFolderIntakeModal.tsx");
			expect(intakeSrc).toContain('data-testid="hfi-non-conflicting-badge"');
			expect(intakeSrc).toContain("Бесконфликтный автозахват (EzDent-i / Romexis)");
			expect(intakeSrc).toContain('window.addEventListener("paste", handlePaste)');
		});
	});
});

