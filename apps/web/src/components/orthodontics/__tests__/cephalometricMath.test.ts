import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	angle3Points,
	angleBetweenLines,
	angleBetweenVectors,
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	distance,
	dotProduct,
	type LandmarkMap,
	type Point2D,
	projectPointOntoLine,
	vector,
	vectorLength,
} from "../cephalometricMath";

describe("Cephalometric Math & Vector Geometry Engine", () => {
	it("calculates 2D vector operations correctly", () => {
		const p1: Point2D = { x: 0, y: 0 };
		const p2: Point2D = { x: 3, y: 4 };

		const v = vector(p1, p2);
		assert.equal(v.x, 3);
		assert.equal(v.y, 4);

		assert.equal(vectorLength(v), 5);
		assert.equal(distance(p1, p2), 5);
		assert.equal(dotProduct(v, { x: 1, y: 0 }), 3);
	});

	it("calculates angles between vectors and lines correctly", () => {
		const v1: Point2D = { x: 1, y: 0 };
		const v2: Point2D = { x: 0, y: 1 };
		const v3: Point2D = { x: -1, y: 0 };

		assert.equal(Math.round(angleBetweenVectors(v1, v2)), 90);
		assert.equal(Math.round(angleBetweenVectors(v1, v3)), 180);
		assert.equal(Math.round(angleBetweenVectors(v1, v1)), 0);

		// 3 points angle (vertex at {0,0})
		const a = { x: 10, y: 0 };
		const vertex = { x: 0, y: 0 };
		const b = { x: 0, y: 10 };
		assert.equal(Math.round(angle3Points(a, vertex, b)), 90);

		// Angle between parallel lines is 0
		const l1_p1 = { x: 0, y: 0 };
		const l1_p2 = { x: 10, y: 0 };
		const l2_p1 = { x: 0, y: 10 };
		const l2_p2 = { x: 10, y: 10 };
		assert.equal(Math.round(angleBetweenLines(l1_p1, l1_p2, l2_p1, l2_p2)), 0);
	});

	it("projects a point perpendicularly onto a 2D line", () => {
		const lineStart: Point2D = { x: 0, y: 0 };
		const lineEnd: Point2D = { x: 100, y: 0 };
		const point: Point2D = { x: 50, y: 25 };

		const proj = projectPointOntoLine(point, lineStart, lineEnd);
		assert.equal(proj.x, 50);
		assert.equal(proj.y, 0);
	});

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
		const facialAngle = result.measurements.find((m) => m.id === "Downs-FA");
		const convexity = result.measurements.find((m) => m.id === "Downs-Conv");
		const abPlane = result.measurements.find((m) => m.id === "Downs-AB");
		const yAxis = result.measurements.find((m) => m.id === "Downs-YAxis");
		const cantOp = result.measurements.find((m) => m.id === "Downs-CantOP");
		const nlMl = result.measurements.find((m) => m.id === "NL-ML");

		// Steiner
		assert.ok(sna && sna.value !== null);
		assert.ok(snb && snb.value !== null);
		assert.ok(anb && anb.value !== null);
		assert.ok(snGogn && snGogn.value !== null);
		assert.ok(u1Sn && u1Sn.value !== null);

		// Tweed
		assert.ok(fma && fma.value !== null);
		assert.ok(l1Mp && l1Mp.value !== null);

		// Jacobson Wits
		assert.ok(wits && wits.value !== null);

		// Downs
		assert.ok(facialAngle && facialAngle.value !== null);
		assert.ok(convexity && convexity.value !== null);
		assert.ok(abPlane && abPlane.value !== null);
		assert.ok(yAxis && yAxis.value !== null);
		assert.ok(cantOp && cantOp.value !== null);

		// Ricketts
		assert.ok(nlMl && nlMl.value !== null);

		// Verify that ANB = SNA - SNB
		assert.equal(
			Number((sna.value! - snb.value!).toFixed(1)),
			anb.value,
			"ANB must equal SNA - SNB",
		);

		// Diagnosis checks
		assert.ok(result.diagnosis.skeletalClass !== "Undefined");
		assert.ok(result.diagnosis.skeletalClassRu.length > 0);
		assert.ok(result.diagnosis.growthPatternRu.length > 0);
		assert.ok(result.diagnosis.summaryRu.length > 0);
		assert.ok(result.diagnosis.protocol043Text.includes("Форма 043/у"));
		assert.ok(result.diagnosis.protocol043Text.includes("Steiner"));
		assert.ok(result.diagnosis.protocol043Text.includes("Downs"));
		assert.ok(result.diagnosis.protocol043Text.includes("Tweed"));
	});

	it("identifies Skeletal Class II malocclusion (ANB > 4°)", () => {
		const class2Landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			A: { x: 495, y: 342 }, // displaced forward
			B: { x: 430, y: 440 }, // retrognathic mandible
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
			B: { x: 475, y: 440 }, // prognathic mandible ahead of A
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
			U1t: { x: 485, y: 395 }, // tipped far forward
		};

		const resPro = calculateCephalometrics(proUpperLandmarks);
		const u1Sn = resPro.measurements.find((m) => m.id === "U1-SN");
		assert.ok(u1Sn && u1Sn.value !== null);
		assert.ok(u1Sn.value > 106);
		assert.equal(resPro.diagnosis.upperIncisorInclination, "Proclination");

		const retroUpperLandmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			U1a: { x: 455, y: 325 },
			U1t: { x: 445, y: 395 }, // upright/retroclined
		};

		const resRetro = calculateCephalometrics(retroUpperLandmarks);
		const u1SnRetro = resRetro.measurements.find((m) => m.id === "U1-SN");
		assert.ok(u1SnRetro && u1SnRetro.value !== null);
		assert.ok(u1SnRetro.value < 102);
		assert.equal(resRetro.diagnosis.upperIncisorInclination, "Retroclination");
	});

	it("gracefully handles empty or partial landmarks without crashing", () => {
		const emptyResult = calculateCephalometrics({});
		assert.equal(emptyResult.isComplete, false);
		assert.equal(emptyResult.placedCount, 0);
		assert.equal(emptyResult.diagnosis.skeletalClass, "Undefined");

		// All measurements should be pending/null
		for (const m of emptyResult.measurements) {
			assert.equal(m.value, null);
			assert.equal(m.status, "pending");
		}
	});

	it("contains all 16 mandatory orthodontic landmark definitions including Orbitale and Porion", () => {
		assert.equal(CEPHALOMETRIC_LANDMARKS.length, 16);
		const keys = CEPHALOMETRIC_LANDMARKS.map((l) => l.key);
		assert.ok(keys.includes("S"));
		assert.ok(keys.includes("N"));
		assert.ok(keys.includes("Or"));
		assert.ok(keys.includes("Po"));
		assert.ok(keys.includes("A"));
		assert.ok(keys.includes("B"));
		assert.ok(keys.includes("Pog"));
		assert.ok(keys.includes("Gn"));
		assert.ok(keys.includes("Me"));
		assert.ok(keys.includes("Go"));
		assert.ok(keys.includes("ANS"));
		assert.ok(keys.includes("PNS"));
		assert.ok(keys.includes("U1t"));
		assert.ok(keys.includes("U1a"));
		assert.ok(keys.includes("L1t"));
		assert.ok(keys.includes("L1a"));
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

		// Verified within Steiner clinical ranges
		assert.ok(u1NaAngle.value >= 18 && u1NaAngle.value <= 26, `1-NA angle was ${u1NaAngle.value}`);
		assert.ok(u1NaDist.value >= 2.5 && u1NaDist.value <= 5.5, `1-NA distance was ${u1NaDist.value}`);
		assert.ok(l1NbAngle.value >= 20 && l1NbAngle.value <= 30, `1-NB angle was ${l1NbAngle.value}`);
		assert.ok(l1NbDist.value >= 2.5 && l1NbDist.value <= 5.5, `1-NB distance was ${l1NbDist.value}`);

		// Form 043/u text includes Steiner metrics
		assert.ok(res.diagnosis.protocol043Text.includes("1-NA угол"));
		assert.ok(res.diagnosis.protocol043Text.includes("1-NA мм"));
		assert.ok(res.diagnosis.protocol043Text.includes("1-NB угол"));
		assert.ok(res.diagnosis.protocol043Text.includes("1-NB мм"));
	});

	it("executes 1000 full cephalometric analyses in < 100ms (O(1) closed-form geometry without academic bloat)", () => {
		const startTime = performance.now();
		const iterations = 1000;

		for (let i = 0; i < iterations; i++) {
			calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);
		}

		const totalDuration = performance.now() - startTime;
		const perIteration = totalDuration / iterations;

		assert.ok(
			totalDuration < 100,
			`1000 cephalometric iterations took ${totalDuration.toFixed(2)}ms (expected < 100ms)`,
		);
		assert.ok(
			perIteration < 0.1,
			`Single cephalometric calculation took ${perIteration.toFixed(4)}ms (expected < 0.1ms)`,
		);
	});
});
