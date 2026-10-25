import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCephalometrics,
	DEFAULT_CEPH_LANDMARKS_PRESET,
} from "../cephalometricMath";

describe("Cephalometric Math — Default Preset & Steiner Measurements", () => {
	it("calculates full cephalometric analysis for default clinical preset (Steiner, Tweed, Downs, Jacobson)", () => {
		const result = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);
		assert.equal(result.isComplete, true);
		assert.ok(result.placedCount >= 10);

		const sna = result.measurements.find((m) => m.id === "SNA");
		const snb = result.measurements.find((m) => m.id === "SNB");
		const anb = result.measurements.find((m) => m.id === "ANB");
		const fma = result.measurements.find((m) => m.id === "FMA");
		const snGogn = result.measurements.find((m) => m.id === "SN-GoGn");
		const u1Sn = result.measurements.find((m) => m.id === "U1-SN");
		const l1Mp = result.measurements.find((m) => m.id === "L1-MP");
		const wits = result.measurements.find((m) => m.id === "Wits");

		assert.ok(sna && sna.value !== null);
		assert.ok(snb && snb.value !== null);
		assert.ok(anb && anb.value !== null);
		assert.ok(snGogn && snGogn.value !== null);
		assert.ok(u1Sn && u1Sn.value !== null);
		assert.ok(fma && fma.value !== null);
		assert.ok(l1Mp && l1Mp.value !== null);
		assert.ok(wits && wits.value !== null);

		assert.equal(Number((sna.value! - snb.value!).toFixed(1)), anb.value, "ANB must equal SNA - SNB");
		assert.ok(result.diagnosis.skeletalClass !== "Undefined");
		assert.ok(result.diagnosis.skeletalClassRu.length > 0);
		assert.ok(result.diagnosis.growthPatternRu.length > 0);
		assert.ok(result.diagnosis.summaryRu.length > 0);
		assert.ok(result.diagnosis.protocol043Text.includes("Медицинская карта"));
	});

	it("calculates Steiner 1-NA and 1-NB angular and linear measurements correctly", () => {
		const res = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);

		const u1NaAngle = res.measurements.find((m) => m.id === "1-NA-Angle");
		const u1NaDist = res.measurements.find((m) => m.id === "1-NA-Dist");
		const l1NbAngle = res.measurements.find((m) => m.id === "1-NB-Angle");
		const l1NbDist = res.measurements.find((m) => m.id === "1-NB-Dist");

		assert.ok(u1NaAngle && u1NaAngle.value !== null);
		assert.ok(u1NaDist && u1NaDist.value !== null);
		assert.ok(l1NbAngle && l1NbAngle.value !== null);
		assert.ok(l1NbDist && l1NbDist.value !== null);

		assert.ok(u1NaAngle.value >= 18 && u1NaAngle.value <= 26);
		assert.ok(u1NaDist.value >= 2.5 && u1NaDist.value <= 5.5);
		assert.ok(l1NbAngle.value >= 20 && l1NbAngle.value <= 30);
		assert.ok(l1NbDist.value >= 2.5 && l1NbDist.value <= 5.5);

		assert.ok(res.diagnosis.protocol043Text.includes("1-NA угол"));
		assert.ok(res.diagnosis.protocol043Text.includes("1-NB угол"));
	});

	it("gracefully handles empty or partial landmarks without crashing", () => {
		const emptyResult = calculateCephalometrics({});
		assert.equal(emptyResult.isComplete, false);
		assert.equal(emptyResult.placedCount, 0);
		assert.equal(emptyResult.diagnosis.skeletalClass, "Undefined");

		for (const m of emptyResult.measurements) {
			assert.equal(m.value, null);
			assert.equal(m.status, "pending");
		}
	});
});
