import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCephalometrics,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkMap,
} from "../cephalometricMath";

describe("Cephalometric Math — Skeletal & Dental Malocclusions", () => {
	it("identifies Skeletal Class II malocclusion (ANB > 4°)", () => {
		const class2Landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			A: { x: 495, y: 342 },
			B: { x: 430, y: 440 },
		};

		const result = calculateCephalometrics(class2Landmarks);
		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null);
		assert.ok(anb.value > 4.0);
		assert.equal(result.diagnosis.skeletalClass, "Class II");
		assert.equal(anb.status, "increased");
	});

	it("identifies Skeletal Class III malocclusion (ANB < 0°)", () => {
		const class3Landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			A: { x: 440, y: 342 },
			B: { x: 475, y: 440 },
		};

		const result = calculateCephalometrics(class3Landmarks);
		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null);
		assert.ok(anb.value < 0.0);
		assert.equal(result.diagnosis.skeletalClass, "Class III");
		assert.equal(anb.status, "decreased");
	});

	it("identifies Hyperdivergent / Dolichofacial growth pattern (High angle)", () => {
		const highAngleLandmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			Go: { x: 230, y: 380 },
			Me: { x: 430, y: 590 },
		};

		const result = calculateCephalometrics(highAngleLandmarks);
		const snGogn = result.measurements.find((m) => m.id === "SN-GoGn");
		assert.ok(snGogn && snGogn.value !== null);
		assert.ok(snGogn.value > 35);
		assert.equal(result.diagnosis.growthPattern, "Dolichofacial (Hyperdivergent)");
	});

	it("identifies Incisor Proclination and Retroclination correctly", () => {
		const proUpperLandmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			U1a: { x: 430, y: 325 },
			U1t: { x: 485, y: 395 },
		};
		const resPro = calculateCephalometrics(proUpperLandmarks);
		const u1Sn = resPro.measurements.find((m) => m.id === "U1-SN");
		assert.ok(u1Sn && u1Sn.value !== null);
		assert.ok(u1Sn.value > 106);
		assert.equal(resPro.diagnosis.upperIncisorInclination, "Proclination");

		const retroUpperLandmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			U1a: { x: 455, y: 325 },
			U1t: { x: 445, y: 395 },
		};
		const resRetro = calculateCephalometrics(retroUpperLandmarks);
		const u1SnRetro = resRetro.measurements.find((m) => m.id === "U1-SN");
		assert.ok(u1SnRetro && u1SnRetro.value !== null);
		assert.ok(u1SnRetro.value < 102);
		assert.equal(resRetro.diagnosis.upperIncisorInclination, "Retroclination");
	});
});
