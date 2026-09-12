/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 130: CBCT 3D IMPLANT GEOMETRY & MESH GENERATOR ENGINE TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 100% Zero-Mock comprehensive unit tests for:
 * 1. Parametric 3D implant mesh generation (buffers, normal validity, closed 2-manifold)
 * 2. Radial profiling (chamfer, neck microthreads, body macrothreads, apical taper/dome)
 * 3. 3D Safety zone clearance evaluator (IAN canal >= 2.0 mm, adjacent tooth >= 1.5 mm, cortical >= 1.0 mm)
 * 4. DenCT clinical arch-frame axis projection & resection polygon slicing
 * 5. Official Russian clinical A4 surgical implant protocol (Form 043/u, 0 emojis by Mandate 8d)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateImplantMesh,
	transformImplantMesh,
	calculateImplantRadius,
	radiusProfile,
	checkImplantSafetyDistances,
	formatImplantPlanningReportA4,
	archFrameAt,
	nearestArchFrame,
	implantAxis,
	implantWorldAxis,
	projectToPlane,
	cylinderPlaneStrip,
	implantPlaneStrip,
	sleeveBody,
	drillSegment,
	type ImplantDimensions,
	type Implant3DPlacement,
	type PlaneFrame,
	type ImplantBody,
	type SleeveSpec,
	type Vec3,
} from "../implantGeometryEngine.js";
import type { Point2 } from "../cprMath.js";

/** Helper for testing 2-manifold closed property */
function isClosedOriented(m: { indices: Uint32Array }): boolean {
	const idx = m.indices;
	if (idx.length === 0 || idx.length % 3 !== 0) return false;
	const seen = new Map<string, number>();

	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t]!;
		const b = idx[t + 1]!;
		const c = idx[t + 2]!;
		const edges: [number, number][] = [
			[a, b],
			[b, c],
			[c, a],
		];
		for (const [u, v] of edges) {
			const k = `${u}_${v}`;
			seen.set(k, (seen.get(k) ?? 0) + 1);
		}
	}

	for (const [key, count] of seen) {
		if (count !== 1) return false;
		const sep = key.indexOf("_");
		const u = key.slice(0, sep);
		const v = key.slice(sep + 1);
		const revKey = `${v}_${u}`;
		if (seen.get(revKey) !== 1) return false;
	}

	return true;
}

/** Helper for testing mesh volume via Ostrogradsky-Gauss divergence theorem */
function meshVolume(m: { positions: Float32Array; indices: Uint32Array }): number {
	const p = m.positions;
	const idx = m.indices;
	let vol = 0;
	for (let t = 0; t < idx.length; t += 3) {
		const a = (idx[t] ?? 0) * 3;
		const b = (idx[t + 1] ?? 0) * 3;
		const c = (idx[t + 2] ?? 0) * 3;
		const ax = p[a] ?? 0;
		const ay = p[a + 1] ?? 0;
		const az = p[a + 2] ?? 0;
		const bx = p[b] ?? 0;
		const by = p[b + 1] ?? 0;
		const bz = p[b + 2] ?? 0;
		const cx = p[c] ?? 0;
		const cy = p[c + 1] ?? 0;
		const cz = p[c + 2] ?? 0;
		vol +=
			(ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) /
			6;
	}
	return vol;
}

describe("Wave 130: CBCT 3D Implant Geometry & Mesh Generator Engine", () => {
	const standardDims: ImplantDimensions = {
		lengthMm: 10.0,
		diameterMm: 4.0,
		platformDiameterMm: 3.8,
		apexDiameterMm: 2.8,
		threadPitchMm: 0.8,
	};

	// ── 1. Parametric 3D Mesh Generation ──────────────────────────

	describe("1. Parametric 3D Mesh Generation", () => {
		it("generates valid mesh buffers with correct dimensions and index continuity", () => {
			const mesh = generateImplantMesh(standardDims, 24);

			assert.ok(mesh.positions instanceof Float32Array);
			assert.ok(mesh.indices instanceof Uint32Array);
			assert.ok(mesh.normals instanceof Float32Array);

			assert.strictEqual(mesh.positions.length % 3, 0);
			assert.strictEqual(mesh.indices.length % 3, 0);
			assert.strictEqual(mesh.normals.length, mesh.positions.length);

			const vertexCount = mesh.positions.length / 3;
			const triangleCount = mesh.indices.length / 3;

			assert.ok(vertexCount > 100, `Expected >100 vertices, got ${vertexCount}`);
			assert.ok(triangleCount > 200, `Expected >200 triangles, got ${triangleCount}`);

			// All indices are strictly within valid vertex bounds
			let minIdx = Number.POSITIVE_INFINITY;
			let maxIdx = Number.NEGATIVE_INFINITY;
			for (let i = 0; i < mesh.indices.length; i++) {
				const idx = mesh.indices[i]!;
				assert.ok(idx >= 0 && idx < vertexCount, `Index ${idx} out of range [0, ${vertexCount - 1}]`);
				if (idx < minIdx) minIdx = idx;
				if (idx > maxIdx) maxIdx = idx;
			}
			assert.strictEqual(minIdx, 0);
			assert.strictEqual(maxIdx, vertexCount - 1);
		});

		it("produces strictly unit-length, valid non-NaN normal vectors", () => {
			const mesh = generateImplantMesh(standardDims, 16);
			const vCount = mesh.positions.length / 3;

			for (let i = 0; i < vCount; i++) {
				const nx = mesh.normals[i * 3]!;
				const ny = mesh.normals[i * 3 + 1]!;
				const nz = mesh.normals[i * 3 + 2]!;

				assert.ok(!Number.isNaN(nx) && !Number.isNaN(ny) && !Number.isNaN(nz), `NaN normal at vertex ${i}`);
				const len = Math.hypot(nx, ny, nz);
				assert.ok(
					Math.abs(len - 1.0) < 1e-3,
					`Normal at vertex ${i} is not unit length: got ${len}`,
				);
			}

			// Top platform center normal points towards -Z
			const topNormZ = mesh.normals[2]!;
			assert.ok(topNormZ < -0.9, `Top platform normal should point along -Z, got ${topNormZ}`);

			// Bottom apex center normal points towards +Z
			const botNormZ = mesh.normals[mesh.normals.length - 1]!;
			assert.ok(botNormZ > 0.9, `Bottom apex normal should point along +Z, got ${botNormZ}`);
		});

		it("creates a closed, watertight 2-manifold surface with positive volume", () => {
			const mesh = generateImplantMesh(standardDims, 20);

			// Test strict 2-manifold property: each directed half-edge has exactly one opposite half-edge
			const closed = isClosedOriented(mesh);
			assert.strictEqual(closed, true, "Generated implant mesh must be a closed, watertight 2-manifold");

			// Test signed volume via Ostrogradsky-Gauss divergence theorem
			const vol = meshVolume(mesh);
			assert.ok(vol > 50 && vol < 200, `Expected realistic implant volume ~100 mm³, got ${vol} mm³`);
		});

		it("transforms mesh into world coordinates given an 3D placement", () => {
			const mesh = generateImplantMesh(standardDims, 16);
			const placement: Implant3DPlacement = {
				position: [10, 20, 30],
				direction: [0, 0, 1],
				rollDeg: 45,
			};

			const worldMesh = transformImplantMesh(mesh, placement);
			assert.strictEqual(worldMesh.positions.length, mesh.positions.length);
			assert.strictEqual(worldMesh.indices.length, mesh.indices.length);

			// First vertex (platform center) must match placement.position
			assert.ok(Math.abs(worldMesh.positions[0]! - 10) < 1e-4);
			assert.ok(Math.abs(worldMesh.positions[1]! - 20) < 1e-4);
			assert.ok(Math.abs(worldMesh.positions[2]! - 30) < 1e-4);

			// Last vertex (apex center) must be displaced by length (10 mm) along Z
			const lastIdx = (worldMesh.positions.length / 3 - 1) * 3;
			assert.ok(Math.abs(worldMesh.positions[lastIdx]! - 10) < 1e-4);
			assert.ok(Math.abs(worldMesh.positions[lastIdx + 1]! - 20) < 1e-4);
			assert.ok(Math.abs(worldMesh.positions[lastIdx + 2]! - 40) < 1e-4);
		});
	});

	// ── 2. Radial Profiling (Bevel, Threads, Taper) ─────────────────

	describe("2. Radial Profiling & DenCT Silhouette", () => {
		it("calculates platform bevel, collar, body, and apical dome radii correctly", () => {
			// At platform Z = 0: equals platformDiameter / 2
			const rPlatform = calculateImplantRadius(0, standardDims);
			assert.ok(Math.abs(rPlatform - standardDims.platformDiameterMm / 2) < 1e-4);

			// In main body Z = 5.0 mm: average radius is approximately diameter / 2
			const rBody = calculateImplantRadius(5.0, standardDims);
			assert.ok(rBody > 1.7 && rBody < 2.3);

			// At apical dome transition Z = 9.8 mm: radius tapers significantly
			const rNearApex = calculateImplantRadius(9.8, standardDims);
			assert.ok(rNearApex < standardDims.diameterMm / 2);

			// At apex tip Z = 10.0 mm: closes to 0
			const rApex = calculateImplantRadius(10.0, standardDims);
			assert.strictEqual(rApex, 0);
		});

		it("matches DenCT normalized radius profile curve", () => {
			assert.strictEqual(radiusProfile(0.0), 1.0);
			assert.strictEqual(radiusProfile(0.14), 1.0);
			assert.ok(Math.abs(radiusProfile(0.90) - 0.64) < 1e-4);
			assert.strictEqual(radiusProfile(1.0), 0.0);
		});
	});

	// ── 3. 3D Safety Zones & Clearance Evaluator ───────────────────

	describe("3. 3D Safety Zones & Clearance Evaluator", () => {
		const safePlacement: Implant3DPlacement = {
			position: [0, 0, 0],
			direction: [0, 0, 1],
			dimensions: standardDims,
			corticalClearanceMm: 1.8,
		};

		it("confirms safe status when all clearance thresholds are met", () => {
			// Canal at distance Z=14.5 mm (4.5 mm apical from apex at Z=10 -> clearance 4.5 mm >= 2.0 mm)
			const canalPoints: Vec3[] = [
				[-10, 0, 14.5],
				[0, 0, 14.5],
				[10, 0, 14.5],
			];
			// Adjacent teeth at X = 4.5 mm (axis-to-point 4.5 mm, radius 2.0 mm -> clearance 2.5 mm >= 1.5 mm)
			const adjacentTeeth: Vec3[] = [
				[4.5, 0, 5.0],
				[-4.5, 0, 5.0],
			];

			const res = checkImplantSafetyDistances(safePlacement, canalPoints, adjacentTeeth);

			assert.strictEqual(res.isSafe, true);
			assert.strictEqual(res.violations.length, 0);
			assert.ok(res.minCanalDistanceMm >= 2.0);
			assert.ok(res.minAdjacentDistanceMm >= 1.5);
			assert.ok(res.corticalClearanceMm >= 1.0);
		});

		it("detects safety violation when mandibular canal distance is < 2.0 mm", () => {
			// Canal at Z = 11.2 mm (clearance = 1.2 mm < 2.0 mm)
			const canalPoints: Vec3[] = [
				[-5, 0, 11.2],
				[0, 0, 11.2],
				[5, 0, 11.2],
			];
			const adjacentTeeth: Vec3[] = [[6.0, 0, 5.0]];

			const res = checkImplantSafetyDistances(safePlacement, canalPoints, adjacentTeeth);

			assert.strictEqual(res.isSafe, false);
			assert.ok(res.violations.length > 0);
			assert.ok(res.minCanalDistanceMm < 2.0);
			assert.ok(res.violations.some((v) => v.includes("нижнечелюстного канала") && v.includes("1.20 мм")));
		});

		it("detects critical collision when implant collides with mandibular canal", () => {
			// Canal intersects implant apex at Z = 9.5 mm (apex is at 10.0 mm -> collision!)
			const canalPoints: Vec3[] = [
				[-5, 0, 9.5],
				[0, 0, 9.5],
				[5, 0, 9.5],
			];

			const res = checkImplantSafetyDistances(safePlacement, canalPoints, []);

			assert.strictEqual(res.isSafe, false);
			assert.ok(res.violations.some((v) => v.includes("Критическая коллизия") && v.includes("нижнечелюстным каналом")));
		});

		it("detects safety violation when adjacent tooth root distance is < 1.5 mm", () => {
			const canalPoints: Vec3[] = [[0, 0, 15.0]];
			// Tooth center at X = 3.2 mm (axis-to-point 3.2 mm, radius 2.0 mm -> clearance 1.2 mm < 1.5 mm)
			const adjacentTeeth: Vec3[] = [[3.2, 0, 5.0]];

			const res = checkImplantSafetyDistances(safePlacement, canalPoints, adjacentTeeth);

			assert.strictEqual(res.isSafe, false);
			assert.ok(res.minAdjacentDistanceMm < 1.5);
			assert.ok(res.violations.some((v) => v.includes("соседнего зуба") && v.includes("1.20 мм")));
		});

		it("detects cortical plate clearance violation when < 1.0 mm", () => {
			const placementWithThinCortical: Implant3DPlacement = {
				...safePlacement,
				corticalClearanceMm: 0.6,
			};

			const res = checkImplantSafetyDistances(placementWithThinCortical, [], []);

			assert.strictEqual(res.isSafe, false);
			assert.ok(res.corticalClearanceMm < 1.0);
			assert.ok(res.violations.some((v) => v.includes("кортикальный зазор") && v.includes("0.60 мм")));
		});
	});

	// ── 4. DenCT Arch Frame, Axis & Plane Resection ───────────────

	describe("4. DenCT Arch Frame, Axis & Plane Resection", () => {
		const archControlPoints: Point2[] = [
			[-25, -20],
			[-20, 0],
			[0, 20],
			[20, 0],
			[25, -20],
		];

		it("retrieves arch frames at normalized arc positions", () => {
			const frame0 = archFrameAt(archControlPoints, 0.0);
			const frameMid = archFrameAt(archControlPoints, 0.5);
			const frame1 = archFrameAt(archControlPoints, 1.0);

			assert.ok(frame0 !== null);
			assert.ok(frameMid !== null);
			assert.ok(frame1 !== null);

			// Tangent and normal must be orthogonal
			const dotTN = frameMid.normal[0] * frameMid.tangent[0] + frameMid.normal[1] * frameMid.tangent[1];
			assert.ok(Math.abs(dotTN) < 1e-4);
		});

		it("finds nearest arch frame to a 2D world point", () => {
			const frame = nearestArchFrame(archControlPoints, [0, 19]);
			assert.ok(frame !== null);
			assert.ok(Math.abs(frame.s - 0.5) < 0.1);
		});

		it("computes 3D implant axis from buccolingual and mesiodistal clinical tilt", () => {
			const frame = archFrameAt(archControlPoints, 0.5)!;
			const axis0 = implantAxis(frame, 0, 0);

			// 0 BL and 0 MD points straight down (-Z)
			assert.ok(Math.abs(axis0[0]) < 1e-4);
			assert.ok(Math.abs(axis0[1]) < 1e-4);
			assert.ok(Math.abs(axis0[2] - (-1)) < 1e-4);

			// Tilted BL 10°
			const axisBL = implantAxis(frame, 10, 0);
			assert.ok(Math.abs(Math.hypot(axisBL[0], axisBL[1], axisBL[2]) - 1.0) < 1e-4);
		});

		it("resolves world axis segment with entry and apex", () => {
			const res = implantWorldAxis(archControlPoints, {
				position: [0, 18, 5],
				angleBLDeg: 0,
				angleMDDeg: 0,
				length: 10,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.entry[2], 5);
			assert.strictEqual(res.apex[2], -5);
		});

		it("projects points onto plane and computes intersection strip", () => {
			const plane: PlaneFrame = {
				origin: [0, 0, 5],
				eU: [1, 0, 0],
				eV: [0, 0, 1],
			};
			const pWorld: Vec3 = [3, 0, 8];
			const projected = projectToPlane(pWorld, plane);
			assert.strictEqual(projected[0], 3);
			assert.strictEqual(projected[1], 3);
			assert.strictEqual(projected[2], 0);

			const body: ImplantBody = {
				entry: [0, 0, 0],
				axis: [0, 0, 1],
				diameter: 4.0,
				length: 10.0,
			};
			const strip = cylinderPlaneStrip(body, plane);
			assert.ok(strip !== null);
			assert.ok(strip.length > 10);

			const implantStrip = implantPlaneStrip(body, plane);
			assert.ok(implantStrip !== null);
			assert.ok(implantStrip.length > 10);
		});

		it("computes guided drill sleeve and osteotomy drill segment", () => {
			const body: ImplantBody = {
				entry: [0, 0, 10],
				axis: [0, 0, -1],
				diameter: 4.0,
				length: 10.0,
			};
			const sleeve: SleeveSpec = {
				diameter: 5.0,
				offset: 2.0,
				height: 4.0,
			};

			const slv = sleeveBody(body, sleeve);
			assert.strictEqual(slv.diameter, 5.0);
			assert.strictEqual(slv.length, 4.0);

			const [drillStart, drillEnd] = drillSegment(body, sleeve, 12.0);
			assert.ok(drillStart[2] > body.entry[2]);
			assert.strictEqual(drillEnd[2], body.entry[2] - 12.0);
		});
	});

	// ── 5. Official A4 Surgical Protocol & Zero Emoji Check ───────

	describe("5. Official A4 Implant Planning Protocol & Zero Emoji Law", () => {
		it("formats complete Russian clinical A4 protocol without emojis", () => {
			const safetyCheck = checkImplantSafetyDistances(
				{
					position: [12.4, -8.6, 2.0],
					direction: [0, 0, -1],
					dimensions: standardDims,
					toothNumber: 36,
					implantModel: "Osstem TS III SA 4.0x10",
					corticalClearanceMm: 1.8,
				},
				[
					[12.4, -8.6, -12.5],
					[15.0, -8.6, -12.5],
				],
				[[16.0, -8.6, -3.0]],
			);

			const report = formatImplantPlanningReportA4({
				patientName: "Ковалев Андрей Дмитриевич",
				patientBirthDate: "1978-11-24",
				medicalRecordNumber: "043-У-2026/89",
				doctorName: "Д-р Кузнецов М.С.",
				clinicName: "Стоматологическая клиника DENTE",
				studyDate: "2026-09-12",
				toothNumber: 36,
				implantModel: "Osstem TS III SA 4.0x10",
				dimensions: standardDims,
				placement: {
					position: [12.4, -8.6, 2.0],
					direction: [0, 0, -1],
					rollDeg: 15.0,
				},
				safetyCheck,
				boneDensityHU: 920,
				boneClass: "D2",
				surgicalNotes: "Планируется установка с применением индивидуального хирургического шаблона.",
			});

			// Header & Patient passport
			assert.ok(report.includes("РЕГЛАМЕНТНЫЙ ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ"));
			assert.ok(report.includes("Ковалев Андрей Дмитриевич"));
			assert.ok(report.includes("043-У-2026/89"));
			assert.ok(report.includes("Д-р Кузнецов М.С."));

			// Implant specifications
			assert.ok(report.includes("Зуб 36"));
			assert.ok(report.includes("Osstem TS III SA 4.0x10"));
			assert.ok(report.includes("10.0 мм"));
			assert.ok(report.includes("4.0 мм"));

			// Clearances
			assert.ok(report.includes("нижнечелюстного канала"));
			assert.ok(report.includes("соседних зубов"));
			assert.ok(report.includes("[БЕЗОПАСНО: ВСЕ ЗАЗОРЫ СОБЛЮДЕНЫ]"));

			// Bone Quality & Carl Misch
			assert.ok(report.includes("920.0 HU"));
			assert.ok(report.includes("Класс D2"));

			// Clinical verdict & signature
			assert.ok(report.includes("Заключение: План дентальной имплантации одобрен"));
			assert.ok(report.includes("Врач хирург-имплантолог"));

			// Strict 0 emojis check per Mandate 8d item 7
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			assert.strictEqual(
				emojiRegex.test(report),
				false,
				"A4 protocol must strictly contain 0 cartoon emojis per Mandate 8d item 7",
			);
		});

		it("correctly issues warning verdict in A4 protocol when safety violations exist", () => {
			const report = formatImplantPlanningReportA4({
				patientName: "Сидорова Анна Павловна",
				dimensions: standardDims,
				placement: {
					position: [0, 0, 0],
					direction: [0, 0, 1],
				},
				safetyCheck: {
					isSafe: false,
					minCanalDistanceMm: 1.1,
					minAdjacentDistanceMm: 2.5,
					corticalClearanceMm: 1.5,
					violations: ["Нарушение зоны безопасности нижнечелюстного канала: расстояние 1.10 мм меньше порога 2.00 мм"],
				},
			});

			assert.ok(report.includes("[ВНИМАНИЕ: ОБНАРУЖЕНЫ НАРУШЕНИЯ ЗОН БЕЗОПАСНОСТИ]"));
			assert.ok(report.includes("ТРЕБУЕТ КОРРЕКЦИИ"));
			assert.ok(report.includes("1.10 мм"));

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			assert.strictEqual(emojiRegex.test(report), false);
		});
	});
});
