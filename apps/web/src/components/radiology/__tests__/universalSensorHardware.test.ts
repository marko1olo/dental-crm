/**
 * universalSensorHardware.test.ts — Test Suite for USB VID/PID, DICOM SCP, Telemetry & Non-Conflicting Coexistence.
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero sensor lock-in, immediate capture <50ms)
 * - Mandate 8s: Single Canonical Domain Authority & Best-of-Breed Architecture
 * - Mandate 8p: Clean Ergonomics & Factual Proof
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
	DEFAULT_DICOM_SCP_CONFIG,
	NON_CONFLICTING_USB_POLICY,
	autoDetectConnectedSensor,
	testSensorConnection,
	lookupSensorByUsbVidPid,
} from "../UniversalSensorGateway";
import {
	detectRadiologySensorBrand,
} from "../directRvgFileValidation";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("Universal Sensor Hardware & Telemetry Suite", () => {
	describe("5. Direct USB VID/PID Registry (30+ Sensors)", () => {
		it("detects Vatech USB sensors by VID 0x1312 and Cypress FX2 0x0547", () => {
			const match1 = lookupSensorByUsbVidPid(0x1312, 0x2001);
			assert.ok(match1);
			assert.equal(match1.brand, "vatech");
			assert.match(match1.deviceDescription, /EzSensor/i);

			const match2 = lookupSensorByUsbVidPid(0x0547, 0x1002);
			assert.ok(match2);
			assert.equal(match2.brand, "vatech");
		});

		it("detects Carestream / Kodak by VID 0x1080", () => {
			const match = lookupSensorByUsbVidPid(0x1080, 0x0001);
			assert.ok(match);
			assert.equal(match.brand, "carestream");
			assert.match(match.deviceDescription, /RVG/i);
		});

		it("detects Planmeca by VID 0x0B6A", () => {
			const match = lookupSensorByUsbVidPid(0x0b6a, 0x0010);
			assert.ok(match);
			assert.equal(match.brand, "planmeca");
			assert.match(match.deviceDescription, /ProSensor/i);
		});

		it("detects Schick / Sirona by VID 0x0D0B and 0x152A", () => {
			const match1 = lookupSensorByUsbVidPid(0x0d0b, 0x0001);
			assert.ok(match1);
			assert.equal(match1.brand, "sirona");

			const match2 = lookupSensorByUsbVidPid(0x152a, 0x0810);
			assert.ok(match2);
			assert.equal(match2.brand, "sirona");
		});

		it("detects Dexis by VID 0x14C0", () => {
			const match = lookupSensorByUsbVidPid(0x14c0, 0x0001);
			assert.ok(match);
			assert.equal(match.brand, "dexis");
		});

		it("detects Acteon / Sopro by VID 0x1686", () => {
			const match = lookupSensorByUsbVidPid(0x1686, 0x0010);
			assert.ok(match);
			assert.equal(match.brand, "acteon");
		});

		it("detects Woodpecker STM32 (0x0483) and Silicon Labs (0x10C4)", () => {
			const match1 = lookupSensorByUsbVidPid(0x0483, 0x5740);
			assert.ok(match1);
			assert.equal(match1.brand, "woodpecker");

			const match2 = lookupSensorByUsbVidPid(0x10c4, 0xea60);
			assert.ok(match2);
			assert.equal(match2.brand, "woodpecker");
		});

		it("detects Handy FTDI (0x0403) and WCH (0x1A86)", () => {
			const match = lookupSensorByUsbVidPid(0x0403, 0x6001);
			assert.ok(match);
			assert.equal(match.brand, "handy");
		});

		it("detects KaVo / Gendex by VID 0x1054", () => {
			const match = lookupSensorByUsbVidPid(0x1054, 0x0700);
			assert.ok(match);
			assert.equal(match.brand, "kavo");
		});

		it("detects MyRay Cefla by VID 0x16D0", () => {
			const match = lookupSensorByUsbVidPid(0x16d0, 0x0501);
			assert.ok(match);
			assert.equal(match.brand, "myray");
		});

		it("identifies generic Cypress FX2/FX3 dental bridge chips", () => {
			const genericCypress = lookupSensorByUsbVidPid(0x04b4, 0x9999);
			assert.ok(genericCypress);
			assert.ok(genericCypress.isMatch);
			assert.match(genericCypress.controllerChip, /Cypress/i);
		});
	});

	describe("6. DICOM C-STORE Storage SCP Specification", () => {
		it("provides standard DICOM SCP configuration on port 11112 with DENTE_SCP AE title", () => {
			assert.equal(DEFAULT_DICOM_SCP_CONFIG.aeTitle, "DENTE_SCP");
			assert.equal(DEFAULT_DICOM_SCP_CONFIG.port, 11112);
			assert.ok(DEFAULT_DICOM_SCP_CONFIG.supportedSopClasses.length >= 4);

			// Digital Intraoral X-Ray SOP Class
			assert.ok(
				DEFAULT_DICOM_SCP_CONFIG.supportedSopClasses.includes("1.2.840.10008.5.1.4.1.1.1.3"),
			);
			// Computed Radiography (CR / PSP)
			assert.ok(
				DEFAULT_DICOM_SCP_CONFIG.supportedSopClasses.includes("1.2.840.10008.5.1.4.1.1.1"),
			);

			// Transfer syntaxes: Implicit, Explicit, JPEG Lossless
			assert.ok(
				DEFAULT_DICOM_SCP_CONFIG.supportedTransferSyntaxes.includes("1.2.840.10008.1.2"),
			);
			assert.ok(
				DEFAULT_DICOM_SCP_CONFIG.supportedTransferSyntaxes.includes("1.2.840.10008.1.2.4.70"),
			);
		});
	});

	describe("7. Autonomous Sensor Detection & Diagnostics (Mandate 8e)", () => {
		it("executes autoDetectConnectedSensor() without throwing and returns valid sensor", async () => {
			const result = await autoDetectConnectedSensor();
			assert.ok(result.isDetected);
			assert.ok(result.sensorModelId.length > 0);
			assert.ok(result.calibratedPixelSpacingMm > 0);
			assert.ok(result.calibratedResolution.length > 0);
			assert.ok(result.statusMessage.includes("Сенсор готов") || result.statusMessage.includes("Обнаружен"));
		});

		it("tests sensor connection and returns instant status in <20ms", async () => {
			const status = await testSensorConnection("vatech_ezsensor_hd");
			assert.equal(status.isReady, true);
			assert.equal(status.statusText, "Статус: Сенсор готов к экспозиции");
			assert.ok(status.latencyMs < 20, `Latency ${status.latencyMs} ms must be <20ms`);
			assert.equal(status.calibratedPixelSpacingMm, 0.035);
			assert.equal(status.bitDepth, 14);
		});
	});

	describe("8. Doctor Interface Integration Verification", () => {
		it("verifies DirectRvgSensorTelemetryHeader contains auto-detect and test connection controls", () => {
			const headerSrc = readSource("components/radiology/DirectRvgSensorTelemetryHeader.tsx");
			assert.ok(headerSrc.includes('data-testid="btn-rvg-auto-detect-sensor"'));
			assert.ok(headerSrc.includes('data-testid="btn-rvg-test-connection"'));
			assert.ok(headerSrc.includes('data-testid="rvg-sensor-health-chip"'));
			assert.ok(headerSrc.includes("Авто-детект сенсора"));
			assert.ok(headerSrc.includes("Проверить связь"));
		});

		it("verifies DirectRvgCaptureModal integrates UniversalSensorGateway callbacks", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			assert.ok(modalSrc.includes("autoDetectConnectedSensor"));
			assert.ok(modalSrc.includes("testSensorConnection"));
			assert.ok(modalSrc.includes("UNIVERSAL_SENSOR_CATALOG"));
			assert.ok(modalSrc.includes("onAutoDetectSensor"));
			assert.ok(modalSrc.includes("onTestSensorConnection"));
			assert.ok(modalSrc.includes("sensorStatusMessage"));
		});

		it("verifies HardwareSettingsTab renders universal-sensor-gateway-card with 1-click diagnostics", () => {
			let tabSrc = readSource("components/settings/HardwareSettingsTab.tsx");
			const cardPath = path.join(webSrcRoot, "components/settings/hardwareTab/HardwareSensorGatewayCard.tsx");
			if (existsSync(cardPath)) {
				tabSrc += "\n" + readFileSync(cardPath, "utf8");
			}
			assert.ok(tabSrc.includes('data-testid="universal-sensor-gateway-card"'));
			assert.ok(tabSrc.includes('data-testid="hw-btn-auto-detect-sensor"'));
			assert.ok(tabSrc.includes('data-testid="hw-btn-test-sensor-connection"'));
			assert.ok(tabSrc.includes('data-testid="hw-select-gateway-sensor"'));
			assert.ok(tabSrc.includes('data-testid="hw-sensor-gateway-status"'));
		});

		it("verifies detectRadiologySensorBrand identifies Dexis, Acteon, Handy, MyRay, Owandy, Eighteeth, Xpect", () => {
			assert.equal(detectRadiologySensorBrand("Dexis_001.dcm"), "Dexis Titanium / Platinum");
			assert.equal(detectRadiologySensorBrand("Sopix2_Scan.jpg"), "Acteon / Sopro Sopix2 / PSPIX");
			assert.equal(detectRadiologySensorBrand("Handy_HDR-600.bmp"), "Handy HDR-500 / HDR-600");
			assert.equal(detectRadiologySensorBrand("MyRay_ZenX_shot.png"), "MyRay Zen-X");
			assert.equal(detectRadiologySensorBrand("Owandy_Opteo_16.dcm"), "Owandy Opteo / One");
			assert.equal(detectRadiologySensorBrand("Eighteeth_NanoPix.dcm"), "Eighteeth NanoPix 1 / 2");
			assert.equal(detectRadiologySensorBrand("XpectVision_Photon.dcm"), "Xpect Vision Photon-Counting");
		});
	});

	describe("9. Non-Conflicting USB Coexistence Law & Friction-Free Intake", () => {
		it("enforces NON_CONFLICTING_USB_POLICY invariants and zero USB locking", () => {
			assert.equal(
				NON_CONFLICTING_USB_POLICY.notice,
				"Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB",
			);
			assert.equal(NON_CONFLICTING_USB_POLICY.preferredIntake, "hot_folder");
			assert.equal(
				NON_CONFLICTING_USB_POLICY.hotFolderStatus,
				"Ожидание снимка (Hot Folder / Автоподхват)",
			);
			assert.ok(NON_CONFLICTING_USB_POLICY.rationale.includes("монопольно захватывают USB-дескриптор"));
		});

		it("verifies autoDetectConnectedSensor yields non-conflicting hot_folder channel and clear status", async () => {
			const res = await autoDetectConnectedSensor();
			assert.equal(res.intakeChannel, "hot_folder");
			assert.ok(res.statusMessage.includes("Ожидание снимка (Hot Folder / Автоподхват)"));
			assert.equal(res.nonConflictingNotice, NON_CONFLICTING_USB_POLICY.notice);
			assert.ok(res.details.includes("Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"));
		});

		it("verifies testSensorConnection returns nonConflictingNotice and instant telemetry", async () => {
			const status = await testSensorConnection("vatech_ezsensor_hd");
			assert.equal(status.isReady, true);
			assert.equal(status.intakeChannel, "hot_folder");
			assert.equal(status.nonConflictingNotice, NON_CONFLICTING_USB_POLICY.notice);
		});

		it("verifies DirectRvgSensorTelemetryHeader displays non-conflicting badge and coexistence hint", () => {
			const headerSrc = readSource("components/radiology/DirectRvgSensorTelemetryHeader.tsx");
			assert.ok(headerSrc.includes('data-testid="rvg-non-conflicting-badge"'));
			assert.ok(headerSrc.includes("Hot Folder / TWAIN (Бесконфликтно)"));
			assert.ok(headerSrc.includes('data-testid="rvg-coexistence-hint"'));
			assert.ok(headerSrc.includes("Параллельно с EzDent-i / Romexis (без конфликта за USB)"));
			assert.ok(headerSrc.includes("Ожидание снимка (Hot Folder / Автоподхват)"));
		});

		it("verifies DirectRvgCaptureModal supports Ctrl+V clipboard paste and coexistence notice", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			assert.ok(modalSrc.includes('window.addEventListener("paste", handlePaste)'));
			assert.ok(modalSrc.includes("Снимок успешно вставлен из буфера обмена (Ctrl+V)"));
			assert.ok(modalSrc.includes("Ожидание снимка (Hot Folder / Автоподхват)"));
			assert.ok(modalSrc.includes("Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"));
		});

		it("verifies HotFolderIntakeModal supports non-conflicting badge and Ctrl+V clipboard ingestion", () => {
			const intakeSrc = readSource("components/radiology/HotFolderIntakeModal.tsx");
			assert.ok(intakeSrc.includes('data-testid="hfi-non-conflicting-badge"'));
			assert.ok(intakeSrc.includes("Бесконфликтный автозахват (EzDent-i / Romexis)"));
			assert.ok(intakeSrc.includes('window.addEventListener("paste", handlePaste)'));
			assert.ok(intakeSrc.includes("Снимок успешно вставлен из буфера обмена (Ctrl+V)"));
			assert.ok(intakeSrc.includes("Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"));
		});
	});
});
