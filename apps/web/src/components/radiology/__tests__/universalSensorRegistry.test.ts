/**
 * universalSensorRegistry.test.ts — Test Suite for Multi-Vendor Sensor Registry, Profiles, TWAIN & Hot Folders.
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero sensor lock-in, immediate capture <50ms)
 * - Mandate 8s: Single Canonical Domain Authority & Best-of-Breed Architecture
 * - Mandate 8p: Clean Ergonomics & Factual Proof
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	UNIVERSAL_SENSOR_CATALOG,
	SENSOR_VENDOR_PROFILES,
	KNOWN_TWAIN_DATA_SOURCES,
	routeIncomingHotFolder,
	getAllVendorHotFolders,
	getUniversalSensorById,
	getSensorsByBrand,
	type SensorBrandId,
} from "../UniversalSensorGateway";

describe("Universal Sensor Registry & Profiles Suite", () => {
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
});
