/**
 * captureConsoleAndHardwareGateways.test.ts
 *
 * Window #3: Capture Console & Hardware Gateways (SSR + Pure Engine Verification).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	CAPTURE_SOURCE_MODES,
	SENSOR_MODELS,
	DirectRvgCaptureModal,
	DirectRvgSensorTelemetryHeader,
	validateRadiologyUploadFile,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
} from "../DirectRvgCaptureModal";
import { DirectRvgViewportToolbar } from "../DirectRvgViewportToolbar";
import { HotFolderIntakeModal } from "../HotFolderIntakeModal";
import {
	UNIVERSAL_SENSOR_CATALOG,
	NON_CONFLICTING_USB_POLICY,
} from "../UniversalSensorGateway";
import { HARDWARE_PRESETS } from "../../../services/hardware/hardwarePresets";

describe("Window #3: Capture Console & Hardware Gateways", () => {
	describe("1. Five Canonical Capture Modes & DirectRvgCaptureModal SSR", () => {
		it("provides exactly 5 capture modes matching acquisition console", () => {
			assert.equal(CAPTURE_SOURCE_MODES.length, 5);
			assert.deepEqual(
				CAPTURE_SOURCE_MODES.map((m) => m.id),
				["io_sensor", "io_camera", "twain", "dslr", "import"],
			);
			const labelMap = Object.fromEntries(CAPTURE_SOURCE_MODES.map((m) => [m.id, m.label]));
			assert.ok(labelMap.io_sensor?.includes("IO-сенсор"));
			assert.ok(labelMap.io_camera?.includes("IO-камера"));
			assert.ok(labelMap.twain?.includes("TWAIN"));
			assert.ok(labelMap.dslr?.includes("Авто DSLR"));
			assert.ok(labelMap.import?.includes("Импорт"));
		});

		it("renders DirectRvgCaptureModal cleanly without sidebar clutter and with instant capture triggers", () => {
			const html = renderToStaticMarkup(
				React.createElement(DirectRvgCaptureModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Иванов Иван",
					doctorName: "Смирнова Анна",
					initialTeeth: [16],
				}),
			);
			assert.equal(html.includes('data-testid="rvg-capture-sidebar"'), false);
			assert.ok(html.includes('data-testid="btn-rvg-trigger-empty-capture"'));
			assert.ok(html.includes('data-testid="btn-rvg-upload-disk"'));
			assert.ok(html.includes('data-testid="rvg-canvas-container"'));
			assert.ok(html.includes('data-testid="rvg-empty-sensor-state"'));
			assert.equal(/напряжение на трубке|дозиметрическая тревог/i.test(html), false);
		});

		it("validates upload filenames and detects sensor brands / FDI teeth cleanly", () => {
			const invalid = validateRadiologyUploadFile({ name: "virus.exe", size: 1024, type: "application/octet-stream" } as File);
			assert.equal(invalid.isValid, false);
			assert.deepEqual(extractTeethFromRadiologyFilename("patient_tooth_16_26.png"), ["16", "26"]);
			assert.ok(detectRadiologySensorBrand("vatech_ezsensor_01.dcm"));
		});
	});

	describe("2. 4-Way Frame Orientation Controls & Telemetry Header SSR", () => {
		it("renders rotate CCW/CW and horizontal/vertical flip buttons in DirectRvgViewportToolbar", () => {
			const html = renderToStaticMarkup(
				React.createElement(DirectRvgViewportToolbar, {
					zoom: 1,
					flipH: false,
					flipV: false,
					isSplitCompare: false,
					onZoomIn: () => {},
					onZoomOut: () => {},
					onRotate: () => {},
					onRotateCcw: () => {},
					onToggleFlipH: () => {},
					onToggleFlipV: () => {},
					onResetTransform: () => {},
				}),
			);
			assert.ok(html.includes('data-testid="rvg-rotate-ccw-btn"'));
			assert.ok(html.includes('data-testid="rvg-rotate-btn"'));
			assert.ok(html.includes('data-testid="rvg-flip-btn"'));
			assert.ok(html.includes('data-testid="rvg-flip-v-btn"'));
		});

		it("renders DirectRvgSensorTelemetryHeader without physics kV/mA/mAs clutter", () => {
			const html = renderToStaticMarkup(
				React.createElement(DirectRvgSensorTelemetryHeader, {
					modalId: "rvg-test-modal",
					patientName: "Иванов Иван",
					doctorName: "Смирнова Анна",
					selectedSensorModel: "vatech_ezsensor_hd",
					onSelectSensorModel: () => {},
					availableSensors: SENSOR_MODELS,
					sensorStatus: "ready",
					acquisitionProgress: 0,
					onTriggerCapture: () => {},
					uploadAction: () => {},
					onUploadClick: () => {},
					onAutoDetectSensor: () => {},
					onTestSensorConnection: () => {},
					onOpenCatalog: () => {},
					onClose: () => {},
					isDetectingSensor: false,
				}),
			);
			assert.equal(/<input[^>]+name=["'](?:kv|ma)["']/i.test(html), false);
			assert.equal(/мА·с/i.test(html), false);
		});
	});

	describe("3. Sensor Models, Multi-Vendor Presets & Non-Conflicting HotFolder Modal", () => {
		it("provides high-resolution sensor models and multi-vendor hardware presets", () => {
			assert.ok(SENSOR_MODELS.length >= 4);
			const vatechHd = SENSOR_MODELS.find((s) => s.id === "vatech_ezsensor_hd");
			assert.equal(vatechHd?.pixelSpacing, 0.035);
			const planmeca = SENSOR_MODELS.find((s) => s.id === "planmeca_prosensor");
			assert.equal(planmeca?.pixelSpacing, 0.03);

			const vendorIds = HARDWARE_PRESETS.map((p) => p.id);
			for (const id of ["vatech_ezdent", "sirona_sidexis", "planmeca_romexis", "carestream_cs", "kavo_dtx"]) {
				assert.ok(vendorIds.includes(id));
			}
			assert.ok(UNIVERSAL_SENSOR_CATALOG.length > 0);
			assert.ok(NON_CONFLICTING_USB_POLICY.notice.length > 0);
		});

		it("renders HotFolderIntakeModal with non-conflicting badge and 4-way orientation controls", () => {
			const html = renderToStaticMarkup(
				React.createElement(HotFolderIntakeModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "pat-1",
					patientName: "Сидоров Алексей",
				}),
			);
			assert.ok(html.includes('data-testid="hfi-non-conflicting-badge"'));
			assert.ok(html.includes("Бесконфликтный автозахват (Hot Folder)"));
			assert.ok(html.includes('data-testid="hfi-rotate-ccw-btn"'));
			assert.ok(html.includes('data-testid="hfi-rotate-btn"'));
			assert.ok(html.includes('data-testid="hfi-flip-btn"'));
			assert.ok(html.includes('data-testid="hfi-flip-v-btn"'));
		});
	});
});
