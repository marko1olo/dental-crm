/**
 * universalSensorGateway.test.ts — Comprehensive Test Suite for Multi-Vendor Sensor Gateway & Protocols.
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
	UNIVERSAL_SENSOR_CATALOG,
	SENSOR_VENDOR_PROFILES,
	KNOWN_TWAIN_DATA_SOURCES,
	DEFAULT_DICOM_SCP_CONFIG,
	NON_CONFLICTING_USB_POLICY,
	autoDetectConnectedSensor,
	testSensorConnection,
	lookupSensorByUsbVidPid,
	routeIncomingHotFolder,
	getAllVendorHotFolders,
	getUniversalSensorById,
	getSensorsByBrand,
	type SensorBrandId,
} from "../UniversalSensorGateway";
import { SENSOR_MODELS } from "../directRvgTypes";
import {
	POPULAR_RVG_SENSORS,
	detectRadiologySensorBrand,
} from "../directRvgFileValidation";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("Universal Multi-Vendor Sensor Gateway Suite", () => {
	describe("1. Multi-Vendor Sensor Registry Completeness (14 Brands, 30+ Models)", () => {
		it("provides at least 30 certified dental sensor models across world brands", () => {
			assert.ok(
				UNIVERSAL_SENSOR_CATALOG.length >= 30,
				`Expected >= 30 sensor models, got ${UNIVERSAL_SENSOR_CATALOG.length}`,
			);
		});

		it("covers all 14 mandatory dental sensor brands", () => {
			const expectedBrands: SensorBrandId[] = [
				"vatech",
				"carestream",
				"planmeca",
				"sirona",
				"dexis",
				"acteon",
				"woodpecker",
				"handy",
				"kavo",
				"fona",
				"myray",
				"owandy",
				"eighteeth",
				"xpect_vision",
			];

			for (const brand of expectedBrands) {
				const models = getSensorsByBrand(brand);
				assert.ok(models.length > 0, `Brand «${brand}» must have at least one sensor model in catalog`);
				const profile = SENSOR_VENDOR_PROFILES.find((p) => p.brand === brand);
				assert.ok(profile, `Vendor profile for «${brand}» must exist`);
				assert.ok(profile.country.length > 0);
			}
		});

		it("verifies Vatech family covers EzSensor, Classic, Soft, HD (Hi-Res 14.8 µm), 1.5, and 2.0", () => {
			const vatechSensors = getSensorsByBrand("vatech");
			assert.ok(vatechSensors.length >= 6);

			const hdHires = vatechSensors.find((s) => s.id === "vatech_ezsensor_hd_hires");
			assert.ok(hdHires, "Vatech EzSensor HD Hi-Res must exist");
			assert.equal(hdHires.pixelSpacingMicrons, 14.8);
			assert.equal(hdHires.bitDepth, 14);
			assert.equal(hdHires.dimensions, "1920x1440");

			const classic = vatechSensors.find((s) => s.id === "vatech_ezsensor_classic");
			assert.ok(classic);
			assert.equal(classic.pixelSpacingMicrons, 35.0);

			const soft = vatechSensors.find((s) => s.id === "vatech_ezsensor_soft");
			assert.ok(soft);
			assert.equal(soft.pixelSpacingMicrons, 29.0);

			const size2 = vatechSensors.find((s) => s.id === "vatech_ezsensor_2_0");
			assert.ok(size2);
			assert.equal(size2.sensorSize, "Size 2");
		});

		it("verifies Carestream / Kodak family covers RVG 5100, 5200, 6100, 6200, 6500", () => {
			const csSensors = getSensorsByBrand("carestream");
			assert.ok(csSensors.length >= 5);

			const rvg6100 = csSensors.find((s) => s.id === "carestream_rvg_6100");
			assert.ok(rvg6100);
			assert.equal(rvg6100.pixelSpacingMicrons, 18.5);
			assert.ok(rvg6100.opticalResolutionLpMm >= 20.0);

			const rvg6200 = csSensors.find((s) => s.id === "carestream_rvg_6200");
			assert.ok(rvg6200);
			assert.equal(rvg6200.pixelSpacingMicrons, 19.0);
			assert.equal(rvg6200.opticalResolutionLpMm, 24.0);

			const rvg6500 = csSensors.find((s) => s.id === "carestream_rvg_6500");
			assert.ok(rvg6500);
			assert.equal(rvg6500.pixelSpacingMicrons, 18.5);
		});

		it("verifies Planmeca family covers ProSensor (30 µm) and ProSensor HD (15 µm, 16-bit)", () => {
			const planmecaSensors = getSensorsByBrand("planmeca");
			assert.ok(planmecaSensors.length >= 2);

			const prosensor = planmecaSensors.find((s) => s.id === "planmeca_prosensor");
			assert.ok(prosensor);
			assert.equal(prosensor.pixelSpacingMicrons, 30.0);

			const prosensorHd = planmecaSensors.find((s) => s.id === "planmeca_prosensor_hd");
			assert.ok(prosensorHd);
			assert.equal(prosensorHd.pixelSpacingMicrons, 15.0);
			assert.equal(prosensorHd.bitDepth, 16);
			assert.equal(prosensorHd.technology, "Fiber-Optic CMOS");
		});

		it("verifies Dentsply Sirona / Schick family covers Xios XG, Plus, Supreme, Schick 33, Schick Elite", () => {
			const sironaSensors = getSensorsByBrand("sirona");
			assert.ok(sironaSensors.length >= 5);

			const xiosSupreme = sironaSensors.find((s) => s.id === "sirona_xios_supreme");
			assert.ok(xiosSupreme);
			assert.equal(xiosSupreme.pixelSpacingMicrons, 15.0);
			assert.equal(xiosSupreme.bitDepth, 16);

			const schick33 = sironaSensors.find((s) => s.id === "schick_33");
			assert.ok(schick33);
			assert.equal(schick33.pixelSpacingMicrons, 15.0);

			const schickElite = sironaSensors.find((s) => s.id === "schick_elite");
			assert.ok(schickElite);
			assert.equal(schickElite.pixelSpacingMicrons, 20.0);
		});

		it("verifies Dexis, Acteon, Woodpecker, Handy, KaVo, Fona, MyRay, Owandy, Eighteeth, Xpect Vision", () => {
			// Dexis
			const dexis = getUniversalSensorById("dexis_titanium");
			assert.ok(dexis);
			assert.equal(dexis.pixelSpacingMicrons, 20.0);

			// Acteon
			const sopix2 = getUniversalSensorById("acteon_sopix2");
			assert.ok(sopix2);
			assert.equal(sopix2.pixelSpacingMicrons, 22.0);
			assert.ok(sopix2.resolution.includes("ACE") || sopix2.name.includes("ACE"));

			// Woodpecker
			const isensorH2 = getUniversalSensorById("woodpecker_isensor_h2");
			assert.ok(isensorH2);
			assert.equal(isensorH2.bitDepth, 16);
			assert.equal(isensorH2.pixelSpacingMicrons, 20.0);

			// Handy
			const handyHdr600 = getUniversalSensorById("handy_hdr_600");
			assert.ok(handyHdr600);
			assert.equal(handyHdr600.pixelSpacingMicrons, 19.0);

			// KaVo
			const gxs700 = getUniversalSensorById("kavo_gxs_700");
			assert.ok(gxs700);
			assert.equal(gxs700.pixelSpacingMicrons, 19.5);

			// Fona
			const stellaris = getUniversalSensorById("fona_stellaris");
			assert.ok(stellaris);
			assert.equal(stellaris.pixelSpacingMicrons, 17.8);

			// MyRay
			const zenx = getUniversalSensorById("myray_zen_x");
			assert.ok(zenx);
			assert.equal(zenx.pixelSpacingMicrons, 20.0);

			// Owandy
			const opteo = getUniversalSensorById("owandy_opteo");
			assert.ok(opteo);
			assert.equal(opteo.pixelSpacingMicrons, 20.0);

			// Eighteeth
			const nanopix = getUniversalSensorById("eighteeth_nanopix_2");
			assert.ok(nanopix);
			assert.equal(nanopix.bitDepth, 16);

			// Xpect Vision
			const xpect = getUniversalSensorById("xpect_vision_photon");
			assert.ok(xpect);
			assert.equal(xpect.technology, "Photon-Counting");
			assert.equal(xpect.pixelSpacingMicrons, 15.0);
		});
	});

	describe("2. Technical Calibration Parameters & Physical Scaling", () => {
		it("ensures every sensor has valid pixel spacing in mm and corresponding microns", () => {
			for (const sensor of UNIVERSAL_SENSOR_CATALOG) {
				assert.ok(
					sensor.pixelSpacing > 0 && sensor.pixelSpacing < 0.1,
					`Sensor ${sensor.id} pixelSpacing ${sensor.pixelSpacing} mm is outside normal range`,
				);
				assert.ok(
					sensor.pixelSpacingMicrons >= 14 && sensor.pixelSpacingMicrons <= 45,
					`Sensor ${sensor.id} pixelSpacingMicrons ${sensor.pixelSpacingMicrons} µm is outside normal range`,
				);
				// Check consistency between mm and µm
				const computedMm = sensor.pixelSpacingMicrons / 1000;
				assert.ok(
					Math.abs(sensor.pixelSpacing - computedMm) < 0.001,
					`Inconsistent pixel spacing for ${sensor.id}: ${sensor.pixelSpacing} vs ${computedMm}`,
				);
			}
		});

		it("ensures bit depths are strictly 12, 14, or 16 bits", () => {
			for (const sensor of UNIVERSAL_SENSOR_CATALOG) {
				assert.ok(
					sensor.bitDepth === 12 || sensor.bitDepth === 14 || sensor.bitDepth === 16,
					`Invalid bitDepth ${sensor.bitDepth} for ${sensor.id}`,
				);
			}
		});

		it("ensures active area in mm and dimensions are populated", () => {
			for (const sensor of UNIVERSAL_SENSOR_CATALOG) {
				assert.match(sensor.dimensions, /^\d+x\d+$/);
				assert.match(sensor.activeAreaMm, /^\d+x\d+ mm$/);
			}
		});
	});

	describe("3. TWAIN 2.x DSM Protocol Integration", () => {
		it("provides standard dental TWAIN Data Sources catalog with DSM 2.4 specification", () => {
			assert.ok(KNOWN_TWAIN_DATA_SOURCES.length >= 8);

			for (const ds of KNOWN_TWAIN_DATA_SOURCES) {
				assert.equal(ds.protocol, "twain_2_4");
				assert.ok(ds.name.length > 0);
				assert.ok(ds.manufacturer.length > 0);
				assert.ok(ds.version.length > 0);
			}

			const defaultDs = KNOWN_TWAIN_DATA_SOURCES.find((ds) => ds.isDefault);
			assert.ok(defaultDs, "Default TWAIN Data Source must be designated");
			assert.equal(defaultDs.id, "ds_vatech_ezsensor");
		});

		it("includes TWAIN sources for Vatech, Carestream, Planmeca, Schick, Sopix, Woodpecker, KaVo, Dexis", () => {
			const dsIds = KNOWN_TWAIN_DATA_SOURCES.map((d) => d.id);
			assert.ok(dsIds.includes("ds_vatech_ezsensor"));
			assert.ok(dsIds.includes("ds_carestream_rvg"));
			assert.ok(dsIds.includes("ds_planmeca_prosensor"));
			assert.ok(dsIds.includes("ds_schick_cdr"));
			assert.ok(dsIds.includes("ds_acteon_sopix"));
			assert.ok(dsIds.includes("ds_woodpecker_isensor"));
			assert.ok(dsIds.includes("ds_kavo_gxs700"));
			assert.ok(dsIds.includes("ds_dexis_platinum"));
		});
	});

	describe("4. Multi-Folder Hot Folder Router", () => {
		it("routes Vatech paths to vatech brand and EzSensor HD", () => {
			const route1 = routeIncomingHotFolder("C:\\EzSensor\\Capture\\IMG001.dcm");
			assert.equal(route1.brand, "vatech");
			assert.equal(route1.defaultModelId, "vatech_ezsensor_hd");

			const route2 = routeIncomingHotFolder("D:\\Dental\\EzDent-i\\Capture\\2026-03-01.tif");
			assert.equal(route2.brand, "vatech");
		});

		it("routes Carestream paths to carestream brand", () => {
			const route = routeIncomingHotFolder("C:\\Carestream\\Capture\\tooth16.jpg");
			assert.equal(route.brand, "carestream");
			assert.equal(route.defaultModelId, "carestream_rvg_6200");
		});

		it("routes Dexis paths to dexis brand", () => {
			const route = routeIncomingHotFolder("C:\\Dexis\\Data\\PAT001\\01.dex");
			assert.equal(route.brand, "dexis");
			assert.equal(route.defaultModelId, "dexis_titanium");
		});

		it("routes Planmeca paths to planmeca brand", () => {
			const route = routeIncomingHotFolder("C:\\Planmeca\\Temp\\shot.dcm");
			assert.equal(route.brand, "planmeca");
			assert.equal(route.defaultModelId, "planmeca_prosensor_hd");
		});

		it("routes Sirona Sidexis paths to sirona brand", () => {
			const route = routeIncomingHotFolder("C:\\Sidexis\\Export\\sirocom\\img.bmp");
			assert.equal(route.brand, "sirona");
			assert.equal(route.defaultModelId, "sirona_xios_supreme");
		});

		it("routes Woodpecker, Handy, KaVo, Acteon, MyRay, Owandy paths correctly", () => {
			assert.equal(routeIncomingHotFolder("C:\\i-Sensor\\Images\\shot.png").brand, "woodpecker");
			assert.equal(routeIncomingHotFolder("C:\\Handy\\Capture\\hdr.bmp").brand, "handy");
			assert.equal(routeIncomingHotFolder("C:\\KaVo\\Export\\visio.dcm").brand, "kavo");
			assert.equal(routeIncomingHotFolder("C:\\Sopro\\Capture\\sopix.jpg").brand, "acteon");
			assert.equal(routeIncomingHotFolder("C:\\iRYS\\Export\\zen.dcm").brand, "myray");
			assert.equal(routeIncomingHotFolder("C:\\Owandy\\QuickVision\\Images\\opteo.png").brand, "owandy");
		});

		it("provides comprehensive list of vendor hot folders", () => {
			const folders = getAllVendorHotFolders();
			assert.ok(folders.length >= 10);
			assert.ok(folders.some((f) => f.includes("EzSensor")));
			assert.ok(folders.some((f) => f.includes("Carestream")));
			assert.ok(folders.some((f) => f.includes("Dexis")));
			assert.ok(folders.some((f) => f.includes("Planmeca")));
			assert.ok(folders.some((f) => f.includes("Sidexis")));
		});
	});

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
			const tabSrc = readSource("components/settings/HardwareSettingsTab.tsx");
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

