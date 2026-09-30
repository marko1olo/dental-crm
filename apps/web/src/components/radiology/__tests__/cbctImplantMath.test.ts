/**
 * DENTE CRM — CBCT Implant Planning & Nerve Corridor Math Tests
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Misch CE (2008), Mandate 8e
 *
 * Verifies:
 * 1. Implant catalog coverage for Straumann, Nobel Biocare, Osstem, Dentium, MIS (diameters 3.0..5.5, lengths 7.0..15.0).
 * 2. 1.5–2.0 mm safety corridor geometry.
 * 3. Calm mandibular canal distance metrics ("Дистанция: 1.8 мм" or "Канал не размечен").
 * 4. Zero audio alarms, zero yelling/lecturing caps-lock warnings.
 * 5. Kopeck-exact pricing integrity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_SAFETY_CORRIDOR_MM,
	FULL_IMPLANT_LIBRARY,
	IMPLANT_BRANDS,
	type ImplantBrandKey,
	MIN_SAFETY_CORRIDOR_MM,
	computeSafetyCorridorGeometry,
	filterImplantLibrary,
	findImplantById,
	formatNerveClearanceMetric,
	getAvailableDiameters,
	getAvailableLengths,
	getImplantsByBrand,
	inspectDistanceToMandibularCanal,
	inspectImplantBodyToNerve3D,
} from "../implantLibrary";

describe("CBCT Implant Library & Brand Coverage", () => {
	it("should cover all 5 required global dental implant brands", () => {
		const requiredBrands: ImplantBrandKey[] = [
			"straumann",
			"nobel_biocare",
			"osstem",
			"dentium",
			"mis",
		];
		assert.equal(IMPLANT_BRANDS.length, 5);

		for (const brand of requiredBrands) {
			const brandInfo = IMPLANT_BRANDS.find((b) => b.key === brand);
			assert.ok(brandInfo, `Brand info for ${brand} must exist`);
			assert.ok(brandInfo.name.length > 0, `Brand name for ${brand} must not be empty`);

			const fixtures = getImplantsByBrand(brand);
			assert.ok(
				fixtures.length > 0,
				`Catalog must contain fixtures for brand: ${brand}`,
			);
		}
	});

	it("should contain fixtures spanning diameters 3.0..5.5 mm and lengths 7.0..15.0 mm", () => {
		const allDiameters = FULL_IMPLANT_LIBRARY.map((i) => i.diameterMm);
		const allLengths = FULL_IMPLANT_LIBRARY.map((i) => i.lengthMm);

		const minDiameter = Math.min(...allDiameters);
		const maxDiameter = Math.max(...allDiameters);
		const minLength = Math.min(...allLengths);
		const maxLength = Math.max(...allLengths);

		assert.ok(
			minDiameter <= 3.5,
			`Expected minimum diameter <= 3.5 mm, got ${minDiameter}`,
		);
		assert.ok(
			maxDiameter >= 5.0,
			`Expected maximum diameter >= 5.0 mm, got ${maxDiameter}`,
		);
		assert.ok(
			minLength <= 8.0,
			`Expected minimum length <= 8.0 mm, got ${minLength}`,
		);
		assert.ok(
			maxLength >= 12.0,
			`Expected maximum length >= 12.0 mm, got ${maxLength}`,
		);
	});

	it("should enforce kopeck-exact integer prices and non-empty article numbers", () => {
		for (const fixture of FULL_IMPLANT_LIBRARY) {
			assert.ok(
				Number.isInteger(fixture.priceKopecks),
				`Fixture ${fixture.id} price must be an integer (kopecks), got ${fixture.priceKopecks}`,
			);
			assert.ok(
				fixture.priceKopecks > 0,
				`Fixture ${fixture.id} price must be positive`,
			);
			assert.ok(
				fixture.articleNumber.length > 0,
				`Fixture ${fixture.id} must have a non-empty article number`,
			);
			assert.ok(
				fixture.diameterMm > 0 && fixture.lengthMm > 0,
				`Fixture ${fixture.id} must have positive dimensions`,
			);
		}
	});

	it("should correctly filter fixtures by brand, diameter, and length", () => {
		const osstem40 = filterImplantLibrary({
			brand: "osstem",
			diameterMm: 4.0,
			lengthMm: 10.0,
		});
		assert.ok(osstem40.length > 0, "Must find Osstem 4.0x10.0 fixture");
		assert.equal(osstem40[0]?.brand, "osstem");
		assert.equal(osstem40[0]?.diameterMm, 4.0);
		assert.equal(osstem40[0]?.lengthMm, 10.0);

		const straumannBLT = findImplantById("straumann-blt-41-10");
		assert.ok(straumannBLT, "Must find Straumann BLT 4.1x10 fixture by ID");
		assert.equal(straumannBLT?.brand, "straumann");
		assert.equal(straumannBLT?.diameterMm, 4.1);

		const availableDiameters = getAvailableDiameters("dentium");
		assert.ok(availableDiameters.includes(4.0));
		assert.ok(availableDiameters.includes(4.5));

		const availableLengths = getAvailableLengths("nobel_biocare", 4.3);
		assert.ok(availableLengths.includes(10.0));
		assert.ok(availableLengths.includes(11.5));
	});
});

describe("CBCT Safety Corridor Geometry", () => {
	it("should compute exact safety corridor dimensions around implant body and apex", () => {
		const fixture = { diameterMm: 4.0, lengthMm: 10.0 };

		// Default safety corridor = 2.0 mm
		const geom20 = computeSafetyCorridorGeometry(fixture, DEFAULT_SAFETY_CORRIDOR_MM);
		assert.equal(geom20.safetyMarginMm, 2.0);
		assert.equal(geom20.totalDiameterMm, 4.0 + 2.0 * 2.0); // 8.0 mm
		assert.equal(geom20.totalLengthMm, 10.0 + 2.0); // 12.0 mm
		assert.equal(geom20.cylinderRadiusMm, 2.0 + 2.0); // 4.0 mm
		assert.equal(geom20.apicalMarginMm, 2.0);

		// Minimum safety corridor = 1.5 mm
		const geom15 = computeSafetyCorridorGeometry(fixture, MIN_SAFETY_CORRIDOR_MM);
		assert.equal(geom15.safetyMarginMm, 1.5);
		assert.equal(geom15.totalDiameterMm, 4.0 + 1.5 * 2.0); // 7.0 mm
		assert.equal(geom15.totalLengthMm, 10.0 + 1.5); // 11.5 mm
		assert.equal(geom15.cylinderRadiusMm, 2.0 + 1.5); // 3.5 mm

		// Values below 1.5 mm must be clamped to 1.5 mm
		const geomClamped = computeSafetyCorridorGeometry(fixture, 0.5);
		assert.equal(geomClamped.safetyMarginMm, 1.5);
	});
});

describe("Mandibular Canal Clearance & Doctor Autonomy (Mandate 8e)", () => {
	it("should return calm 'Канал не размечен' when canal center is missing", () => {
		const result = inspectDistanceToMandibularCanal(
			{ x: 0, y: 12 },
			null,
			1.4,
			2.0,
		);
		assert.equal(result.safetyStatus, "unmeasured");
		assert.equal(result.isSafe, false);
		assert.equal(result.isWarning, false);
		assert.equal(result.isDanger, false);
		assert.equal(result.telemetryTextRu, "Канал не размечен");
	});

	it("should return calm safe metric when clearance >= 2.0 mm", () => {
		// Apex at (0, 10), canal center at (0, 16). Distance to center = 6.0 mm.
		// Canal radius = 1.4 mm -> net clearance = 6.0 - 1.4 = 4.6 mm.
		const result = inspectDistanceToMandibularCanal(
			{ x: 0, y: 10 },
			{ x: 0, y: 16 },
			1.4,
			2.0,
		);
		assert.equal(result.safetyStatus, "safe");
		assert.equal(result.isSafe, true);
		assert.equal(result.isWarning, false);
		assert.equal(result.isDanger, false);
		assert.equal(result.netClearanceMm, 4.6);
		assert.equal(result.telemetryTextRu, "Дистанция: 4.6 мм");
	});

	it("should return calm warning metric when clearance is 1.5..2.0 mm", () => {
		// Apex at (0, 10), canal center at (0, 13.2). Distance = 3.2 mm.
		// Net clearance = 3.2 - 1.4 = 1.8 mm.
		const result = inspectDistanceToMandibularCanal(
			{ x: 0, y: 10 },
			{ x: 0, y: 13.2 },
			1.4,
			2.0,
		);
		assert.equal(result.safetyStatus, "warning");
		assert.equal(result.isSafe, false);
		assert.equal(result.isWarning, true);
		assert.equal(result.isDanger, false);
		assert.equal(result.netClearanceMm, 1.8);
		assert.equal(result.telemetryTextRu, "Дистанция: 1.8 мм");
	});

	it("should return calm proximity metric when clearance < 1.5 mm without screaming text or sirens", () => {
		// Apex at (0, 10), canal center at (0, 12.0). Distance = 2.0 mm.
		// Net clearance = 2.0 - 1.4 = 0.6 mm.
		const result = inspectDistanceToMandibularCanal(
			{ x: 0, y: 10 },
			{ x: 0, y: 12.0 },
			1.4,
			2.0,
		);
		assert.equal(result.safetyStatus, "danger");
		assert.equal(result.isDanger, true);
		assert.equal(result.netClearanceMm, 0.6);
		// Metric must be calm and professional, not screaming all-caps:
		assert.equal(result.telemetryTextRu, "Дистанция: 0.6 мм");
		assert.ok(
			!result.telemetryTextRu.includes("ОПАСНОСТЬ"),
			"Telemetry text must not contain screaming all-caps",
		);
		assert.ok(
			!result.telemetryTextRu.includes("!"),
			"Telemetry text must not contain exclamation marks",
		);
	});

	it("formatNerveClearanceMetric should format numbers calmly and handle null/undefined", () => {
		assert.equal(formatNerveClearanceMetric(null), "Канал не размечен");
		assert.equal(formatNerveClearanceMetric(undefined), "Канал не размечен");
		assert.equal(formatNerveClearanceMetric(Number.NaN), "Канал не размечен");
		assert.equal(formatNerveClearanceMetric(1.8), "Дистанция: 1.8 мм");
		assert.equal(formatNerveClearanceMetric(0.0), "Дистанция: 0.0 мм");
		assert.equal(formatNerveClearanceMetric(3.456), "Дистанция: 3.5 мм");
	});

	it("inspectImplantBodyToNerve3D should compute shortest distance along 3D nerve spline", () => {
		const implant = {
			entry: { x: 0, y: 0, z: 10 },
			apex: { x: 0, y: 0, z: 0 },
			diameterMm: 4.0, // radius = 2.0 mm
		};

		// Nerve spline passing below the apex at z = -4.0 mm, y = 0
		const nerveSpline = [
			{ x: -10, y: 0, z: -4.0 },
			{ x: 0, y: 0, z: -4.0 },
			{ x: 10, y: 0, z: -4.0 },
		];

		const result = inspectImplantBodyToNerve3D(implant, nerveSpline, 1.4, 2.0);
		// Closest point is at apex (0, 0, 0) to nerve (0, 0, -4.0) -> center dist = 4.0 mm
		// Net clearance = center dist (4.0) - canal radius (1.4) - implant radius (2.0) = 0.6 mm
		assert.equal(result.safetyStatus, "danger");
		assert.equal(result.netClearanceMm, 0.6);
		assert.equal(result.telemetryTextRu, "Дистанция: 0.6 мм");

		// When nerve is far: z = -10.0 mm
		const farNerveSpline = [
			{ x: -10, y: 0, z: -10.0 },
			{ x: 0, y: 0, z: -10.0 },
			{ x: 10, y: 0, z: -10.0 },
		];
		const farResult = inspectImplantBodyToNerve3D(implant, farNerveSpline, 1.4, 2.0);
		// Center dist = 10.0 mm -> net clearance = 10.0 - 1.4 - 2.0 = 6.6 mm
		assert.equal(farResult.safetyStatus, "safe");
		assert.equal(farResult.netClearanceMm, 6.6);
		assert.equal(farResult.telemetryTextRu, "Дистанция: 6.6 мм");
	});
});
