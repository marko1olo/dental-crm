/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — MESH GENERATOR (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Parametric 3D implant mesh generation:
 * - Apical taper, neck microthreads, cancellous macrothreads, platform bevel
 * - Closed, watertight 2-manifold surface with positive volume
 * - Pre-computed smooth vertex normals and continuous CCW triangle indices
 * - 3D affine world coordinate transformation with roll angle
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3, ImplantDimensions, Implant3DPlacement, ImplantMeshBuffers } from "./types.js";
import { normalize3, cross3 } from "./mathVectors.js";

// ── DenCT Silhouette Radius Profile ────────────────────────────

export function radiusProfile(t01: number): number {
	const t = Math.max(0, Math.min(1, t01));
	if (t <= 0.14) return 1.0;
	if (t <= 0.90) return 1.0 - 0.36 * ((t - 0.14) / 0.76);
	if (t >= 1.0) return 0.0;
	const a = (t - 0.90) / 0.10;
	const val = 0.64 * Math.sqrt(Math.max(0, 1.0 - a * a));
	return val < 1e-6 ? 0.0 : val;
}

export function calculateImplantRadius(z: number, dims: ImplantDimensions): number {
	const L = Math.max(1.0, dims.lengthMm);
	const Rplat = dims.platformDiameterMm / 2;
	const Rbody = dims.diameterMm / 2;
	const Rapex = dims.apexDiameterMm / 2;
	const P = Math.max(0.2, dims.threadPitchMm);

	if (z <= 0) return Rplat;
	if (z >= L) return 0;

	// 1. Platform Bevel (Chamfer)
	const bevelH = Math.min(0.4, L * 0.05);
	let baseR: number;
	if (z < bevelH) {
		baseR = Rplat + (Rbody - Rplat) * (z / bevelH);
	} else {
		const taperStart = Math.max(bevelH + 1.0, L * 0.72);
		const domeStart = L - Math.min(0.8, L * 0.10);
		if (z < taperStart) {
			baseR = Rbody;
		} else if (z < domeStart) {
			const t = (z - taperStart) / (domeStart - taperStart);
			baseR = Rbody + (Rapex - Rbody) * (t * t * (3 - 2 * t));
		} else {
			const t = (z - domeStart) / (L - domeStart);
			baseR = Rapex * Math.sqrt(Math.max(0, 1 - t * t));
		}
	}

	// 2. Thread Profiling
	let threadDelta = 0;
	const neckStart = bevelH;
	const neckEnd = Math.min(2.5, L * 0.22);
	const macroEnd = Math.max(neckEnd + 1.0, L * 0.85);

	if (z >= neckStart && z < neckEnd) {
		const microPitch = Math.max(0.18, P * 0.35);
		const microAmp = Math.min(0.08, Rbody * 0.04);
		const phase = ((z - neckStart) / microPitch) * 2 * Math.PI;
		const env = Math.sin(((z - neckStart) / (neckEnd - neckStart)) * Math.PI);
		threadDelta = microAmp * Math.sin(phase) * env;
	} else if (z >= neckEnd && z < macroEnd) {
		const macroAmp = Math.min(0.35, Rbody * 0.14);
		const phase = ((z - neckEnd) / P) * 2 * Math.PI;
		const env = Math.sin(((z - neckEnd) / (macroEnd - neckEnd)) * Math.PI);
		threadDelta = macroAmp * Math.sin(phase) * env;
	}

	return Math.max(0.05, baseR + threadDelta);
}

// ── Parametric 3D Mesh Generator ───────────────────────────────

export function generateImplantMesh(dims: ImplantDimensions, segments = 32): ImplantMeshBuffers {
	const seg = Math.max(8, Math.floor(segments));
	const L = Math.max(1.0, dims.lengthMm);
	const numRings = Math.max(48, Math.min(180, Math.round(L / 0.09)));
	const totalVertices = 2 + numRings * seg;
	const positions = new Float32Array(totalVertices * 3);

	// Platform center: [0, 0, 0]
	positions[0] = 0; positions[1] = 0; positions[2] = 0;

	// Radial ring vertices along Z
	const deltaZ = L / (numRings * 2);
	const maxZ = L - deltaZ;
	for (let i = 0; i < numRings; i++) {
		const z = (i / (numRings - 1)) * maxZ;
		const r = calculateImplantRadius(z, dims);
		for (let j = 0; j < seg; j++) {
			const theta = (2 * Math.PI * j) / seg;
			const vIdx = (1 + i * seg + j) * 3;
			positions[vIdx] = r * Math.cos(theta);
			positions[vIdx + 1] = r * Math.sin(theta);
			positions[vIdx + 2] = z;
		}
	}

	// Bottom apex center: [0, 0, L]
	const bottomCenterIdx = 1 + numRings * seg;
	positions[bottomCenterIdx * 3] = 0;
	positions[bottomCenterIdx * 3 + 1] = 0;
	positions[bottomCenterIdx * 3 + 2] = L;

	const totalTriangles = seg + (numRings - 1) * seg * 2 + seg;
	const indices = new Uint32Array(totalTriangles * 3);
	let triPtr = 0;

	// Top cap (CCW looking from -Z)
	for (let j = 0; j < seg; j++) {
		const j1 = (j + 1) % seg;
		indices[triPtr++] = 0; indices[triPtr++] = 1 + j1; indices[triPtr++] = 1 + j;
	}

	// Lateral body quads
	for (let i = 0; i < numRings - 1; i++) {
		const r0 = 1 + i * seg;
		const r1 = 1 + (i + 1) * seg;
		for (let j = 0; j < seg; j++) {
			const j1 = (j + 1) % seg;
			indices[triPtr++] = r0 + j; indices[triPtr++] = r0 + j1; indices[triPtr++] = r1 + j1;
			indices[triPtr++] = r0 + j; indices[triPtr++] = r1 + j1; indices[triPtr++] = r1 + j;
		}
	}

	// Bottom apex cap (CCW looking from +Z)
	const lastRingBase = 1 + (numRings - 1) * seg;
	for (let j = 0; j < seg; j++) {
		const j1 = (j + 1) % seg;
		indices[triPtr++] = bottomCenterIdx; indices[triPtr++] = lastRingBase + j; indices[triPtr++] = lastRingBase + j1;
	}

	// Vertex normals accumulation
	const normals = new Float32Array(totalVertices * 3);
	for (let t = 0; t < totalTriangles; t++) {
		const i0 = indices[t * 3]!;
		const i1 = indices[t * 3 + 1]!;
		const i2 = indices[t * 3 + 2]!;
		const ax = positions[i0 * 3]!, ay = positions[i0 * 3 + 1]!, az = positions[i0 * 3 + 2]!;
		const bx = positions[i1 * 3]!, by = positions[i1 * 3 + 1]!, bz = positions[i1 * 3 + 2]!;
		const cx = positions[i2 * 3]!, cy = positions[i2 * 3 + 1]!, cz = positions[i2 * 3 + 2]!;
		const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
		const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
		const nx = e1y * e2z - e1z * e2y;
		const ny = e1z * e2x - e1x * e2z;
		const nz = e1x * e2y - e1y * e2x;
		normals[i0 * 3] = (normals[i0 * 3] ?? 0) + nx; normals[i0 * 3 + 1] = (normals[i0 * 3 + 1] ?? 0) + ny; normals[i0 * 3 + 2] = (normals[i0 * 3 + 2] ?? 0) + nz;
		normals[i1 * 3] = (normals[i1 * 3] ?? 0) + nx; normals[i1 * 3 + 1] = (normals[i1 * 3 + 1] ?? 0) + ny; normals[i1 * 3 + 2] = (normals[i1 * 3 + 2] ?? 0) + nz;
		normals[i2 * 3] = (normals[i2 * 3] ?? 0) + nx; normals[i2 * 3 + 1] = (normals[i2 * 3 + 1] ?? 0) + ny; normals[i2 * 3 + 2] = (normals[i2 * 3 + 2] ?? 0) + nz;
	}

	for (let v = 0; v < totalVertices; v++) {
		const nx = normals[v * 3]!, ny = normals[v * 3 + 1]!, nz = normals[v * 3 + 2]!;
		const l = Math.hypot(nx, ny, nz);
		if (l > 1e-8) {
			normals[v * 3] = nx / l; normals[v * 3 + 1] = ny / l; normals[v * 3 + 2] = nz / l;
		} else {
			normals[v * 3] = v === 0 ? 0 : v === bottomCenterIdx ? 0 : 1;
			normals[v * 3 + 1] = 0;
			normals[v * 3 + 2] = v === 0 ? -1 : v === bottomCenterIdx ? 1 : 0;
		}
	}

	return { positions, indices, normals };
}

export function transformImplantMesh(mesh: ImplantMeshBuffers, placement: Implant3DPlacement): ImplantMeshBuffers {
	const w = normalize3(placement.direction);
	const ax: Vec3 = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
	let u = normalize3(cross3(w, ax));
	let v = normalize3(cross3(w, u));

	if (placement.rollDeg) {
		const rad = (placement.rollDeg * Math.PI) / 180;
		const cosR = Math.cos(rad);
		const sinR = Math.sin(rad);
		const uNew: Vec3 = [u[0] * cosR + v[0] * sinR, u[1] * cosR + v[1] * sinR, u[2] * cosR + v[2] * sinR];
		const vNew: Vec3 = [-u[0] * sinR + v[0] * cosR, -u[1] * sinR + v[1] * cosR, -u[2] * sinR + v[2] * cosR];
		u = uNew; v = vNew;
	}

	const vCount = mesh.positions.length / 3;
	const outPos = new Float32Array(mesh.positions.length);
	const outNorm = new Float32Array(mesh.normals.length);
	const p0 = placement.position;

	for (let i = 0; i < vCount; i++) {
		const lx = mesh.positions[i * 3]!, ly = mesh.positions[i * 3 + 1]!, lz = mesh.positions[i * 3 + 2]!;
		outPos[i * 3] = p0[0] + u[0] * lx + v[0] * ly + w[0] * lz;
		outPos[i * 3 + 1] = p0[1] + u[1] * lx + v[1] * ly + w[1] * lz;
		outPos[i * 3 + 2] = p0[2] + u[2] * lx + v[2] * ly + w[2] * lz;

		const lnx = mesh.normals[i * 3]!, lny = mesh.normals[i * 3 + 1]!, lnz = mesh.normals[i * 3 + 2]!;
		outNorm[i * 3] = u[0] * lnx + v[0] * lny + w[0] * lnz;
		outNorm[i * 3 + 1] = u[1] * lnx + v[1] * lny + w[1] * lnz;
		outNorm[i * 3 + 2] = u[2] * lnx + v[2] * lny + w[2] * lnz;
	}

	return { positions: outPos, indices: new Uint32Array(mesh.indices), normals: outNorm };
}
