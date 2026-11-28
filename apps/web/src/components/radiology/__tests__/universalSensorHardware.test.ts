/**
 * universalSensorHardware.test.ts — Runtime Test Suite for USB VID/PID, DICOM SCP, Telemetry & Hardware UI.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DEFAULT_DICOM_SCP_CONFIG,
	NON_CONFLICTING_USB_POLICY,
	UniversalSensorCatalogModal,
	autoDetectConnectedSensor,
	testSensorConnection,
	lookupSensorByUsbVidPid,
} from "../UniversalSensorGateway";
import { DirectRvgCaptureModal } from "../DirectRvgCaptureModal";
import { DirectRvgSensorTelemetryHeader } from "../DirectRvgSensorTelemetryHeader";
import { HardwareSettingsTab } from "../../settings/HardwareSettingsTab";
import { detectRadiologySensorBrand } from "../directRvgFileValidation";

describe("Universal Sensor Hardware & Telemetry Suite", () => {
	describe("5. Direct USB VID/PID Registry (30+ Sensors)", () => {
		it("detects major dental sensor brands by USB VID/PID", () => {
			assert.equal(lookupSensorByUsbVidPid(0x1312, 0x2001)?.brand, "vatech");
			assert.equal(lookupSensorByUsbVidPid(0x0547, 0x1002)?.brand, "vatech");
			assert.equal(lookupSensorByUsbVidPid(0x1080, 0x0001)?.brand, "carestream");
			assert.equal(lookupSensorByUsbVidPid(0x0b6a, 0x0010)?.brand, "planmeca");
			assert.equal(lookupSensorByUsbVidPid(0x0d0b, 0x0001)?.brand, "sirona");
			assert.equal(lookupSensorByUsbVidPid(0x14c0, 0x0001)?.brand, "dexis");
			assert.equal(lookupSensorByUsbVidPid(0x1686, 0x0010)?.brand, "acteon");
			assert.equal(lookupSensorByUsbVidPid(0x0483, 0x5740)?.brand, "woodpecker");
			assert.equal(lookupSensorByUsbVidPid(0x0403, 0x6001)?.brand, "handy");
			assert.equal(lookupSensorByUsbVidPid(0x1054, 0x0700)?.brand, "kavo");
			assert.equal(lookupSensorByUsbVidPid(0x16d0, 0x0501)?.brand, "myray");
			assert.ok(lookupSensorByUsbVidPid(0x04b4, 0x9999)?.isMatch);
		});
	});

	describe("6. DICOM C-STORE Storage SCP Specification", () => {
		it("provides standard DICOM SCP configuration on port 11112 with DENTE_SCP AE title", () => {
			assert.equal(DEFAULT_DICOM_SCP_CONFIG.aeTitle, "DENTE_SCP");
			assert.equal(DEFAULT_DICOM_SCP_CONFIG.port, 11112);
			assert.ok(DEFAULT_DICOM_SCP_CONFIG.supportedSopClasses.includes("1.2.840.10008.5.1.4.1.1.1.3"));
			assert.ok(DEFAULT_DICOM_SCP_CONFIG.supportedTransferSyntaxes.includes("1.2.840.10008.1.2"));
		});
	});

	describe("7. Autonomous Sensor Detection & Diagnostics", () => {
		it("executes autoDetectConnectedSensor() & testSensorConnection() honestly without hardware", async () => {
			const result = await autoDetectConnectedSensor();
			assert.equal(result.isDetected, false);
			assert.equal(result.intakeChannel, "hot_folder");
			assert.equal(result.statusMessage, "Датчик не обнаружен");
			assert.equal(result.nonConflictingNotice, NON_CONFLICTING_USB_POLICY.notice);

			const status = await testSensorConnection("vatech_ezsensor_hd");
			assert.equal(status.isReady, false);
			assert.equal(status.intakeChannel, "hot_folder");
			assert.equal(status.calibratedPixelSpacingMm, 0.035);
			assert.equal(status.bitDepth, 14);

			const emptyStatus = await testSensorConnection("none");
			assert.equal(emptyStatus.statusText, "Статус: Датчик не подключен");
		});
	});

	describe("8. Doctor Interface Rendered Integration Verification", () => {
		it("renders DirectRvgSensorTelemetryHeader & DirectRvgCaptureModal with auto-detect & coexistence badge", () => {
			const headerHtml = renderToString(
				React.createElement(DirectRvgSensorTelemetryHeader, {
					patientName: "Тест Пациент",
					patientCardNumber: "МК-1",
					doctorName: "Врач Тест",
					sensorStatus: "ready",
					acquisitionProgress: 0,
					selectedSensorModel: "vatech_ezsensor_hd",
					onSelectSensorModel: () => {},
					availableSensors: [],
					onTriggerCapture: () => {},
					onAutoDetectSensor: () => {},
					onTestSensorConnection: () => {},
					onOpenCatalog: () => {},
				}),
			);
			assert.ok(headerHtml.includes('data-testid="btn-rvg-auto-detect-sensor"'));
			assert.ok(headerHtml.includes('data-testid="btn-rvg-test-connection"'));
			assert.ok(headerHtml.includes('data-testid="btn-rvg-open-catalog"'));
			assert.ok(headerHtml.includes('data-testid="rvg-non-conflicting-badge"'));
			assert.ok(headerHtml.includes('data-testid="rvg-coexistence-hint"'));

			const modalHtml = renderToString(
				React.createElement(DirectRvgCaptureModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Тест Пациент",
				}),
			);
			assert.ok(modalHtml.includes("Ожидание снимка (Hot Folder / Автоподхват)"));
			assert.ok(modalHtml.includes('data-testid="rvg-coexistence-hint"'));
			assert.ok(modalHtml.includes("Работает параллельно с ПО оборудования"));
		});

		it("renders UniversalSensorCatalogModal & HardwareSettingsTab cleanly", () => {
			const catalogHtml = renderToString(
				React.createElement(UniversalSensorCatalogModal, {
					isOpen: true,
					onClose: () => {},
					onSelectSensor: () => {},
				}),
			);
			assert.ok(catalogHtml.includes('data-testid="universal-sensor-catalog-modal"'));
			assert.ok(catalogHtml.includes('data-testid="sensor-catalog-search-input"'));
			assert.ok(catalogHtml.includes("Каталог радиовизиографов"));

			const hwHtml = renderToString(React.createElement(HardwareSettingsTab));
			assert.ok(hwHtml.includes('data-testid="universal-sensor-gateway-card"'));
			assert.ok(hwHtml.includes('data-testid="hw-btn-auto-detect-sensor"'));
			assert.ok(hwHtml.includes('data-testid="hw-btn-test-sensor-connection"'));
			assert.ok(hwHtml.includes('data-testid="hw-select-gateway-sensor"'));
			assert.ok(hwHtml.includes('data-testid="hw-sensor-gateway-status"'));
		});

		it("verifies detectRadiologySensorBrand identifies dental sensor brands", () => {
			assert.equal(detectRadiologySensorBrand("Dexis_001.dcm"), "Dexis Titanium / Platinum");
			assert.equal(detectRadiologySensorBrand("Sopix2_Scan.jpg"), "Acteon / Sopro Sopix2 / PSPIX");
			assert.equal(detectRadiologySensorBrand("Handy_HDR-600.bmp"), "Handy HDR-500 / HDR-600");
			assert.equal(detectRadiologySensorBrand("MyRay_ZenX_shot.png"), "MyRay Zen-X");
			assert.equal(detectRadiologySensorBrand("Owandy_Opteo_16.dcm"), "Owandy Opteo / One");
			assert.equal(detectRadiologySensorBrand("Eighteeth_NanoPix.dcm"), "Eighteeth NanoPix 1 / 2");
			assert.equal(detectRadiologySensorBrand("XpectVision_Photon.dcm"), "Xpect Vision Photon-Counting");
		});
	});
});
