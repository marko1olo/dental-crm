/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: BINARY STL EXPORTER & SURGICAL GUIDE GEOMETRY
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure binary STL serialization (IEEE 754 float32 Little Endian) for 3D printing
 * of patient-specific dental surgical navigation templates:
 *  - 80-byte binary header
 *  - 32-bit unsigned integer triangle count
 *  - 50-byte per facet: facet normal, 3 vertices (float32 LE), 16-bit attribute
 *  - Closed 2-manifold geometric primitives (cylinders, swept arch bars, sleeve seats)
 *
 * Adapted from DenCT core/guideExport.ts & guideGeom.ts for dental outpatient care.
 * Pure TypeScript, zero DOM/VTK/WASM dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./guideValidate.js";

export interface TriMesh {
	/** xyz vertex coordinates [x0, y0, z0, x1, y1, z1, ...], length 3 * V */
	positions: Float32Array;
	/** 3 vertex indices per triangle, length 3 * T */
	indices: Uint32Array;
}

// ── Vector Helpers ─────────────────────────────────────────────

const sub3 = (a: Vec3, b: Vec3): Vec3 => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2],
];

const cross3 = (a: Vec3, b: Vec3): Vec3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];

const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

const norm3 = (a: Vec3): Vec3 => {
	const l = len3(a) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};

/** Unit vector perpendicular to w */
function anyPerp(w: Vec3): Vec3 {
	const ax: Vec3 = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
	return norm3(cross3(w, ax));
}

// ── Mesh Accumulator ───────────────────────────────────────────

class MeshBuilder {
	private pos: number[] = [];
	private idx: number[] = [];

	addVertex(p: Vec3): number {
		this.pos.push(p[0], p[1], p[2]);
		return this.pos.length / 3 - 1;
	}

	addTri(a: number, b: number, c: number): void {
		this.idx.push(a, b, c);
	}

	/** Quad a->b->c->d (CCW) as two triangles */
	addQuad(a: number, b: number, c: number, d: number): void {
		this.idx.push(a, b, c, a, c, d);
	}

	build(): TriMesh {
		return {
			positions: new Float32Array(this.pos),
			indices: new Uint32Array(this.idx),
		};
	}
}

// ── Geometry Generators ────────────────────────────────────────

/**
 * Closed capped cylinder between world points `p0` and `p1` with given `radius`.
 * Emits consistently-oriented outward normals.
 */
export function cylinderMesh(
	p0: Vec3,
	p1: Vec3,
	radius: number,
	segments = 48,
): TriMesh {
	const seg = Math.max(3, Math.floor(segments));
	const w = norm3(sub3(p1, p0));
	const u = anyPerp(w);
	const v = norm3(cross3(w, u));
	const b = new MeshBuilder();

	const ring0: number[] = [];
	const ring1: number[] = [];
	for (let k = 0; k < seg; k++) {
		const t = (k / seg) * Math.PI * 2;
		const dx = Math.cos(t) * radius;
		const dy = Math.sin(t) * radius;
		const off: Vec3 = [
			u[0] * dx + v[0] * dy,
			u[1] * dx + v[1] * dy,
			u[2] * dx + v[2] * dy,
		];
		ring0.push(b.addVertex([p0[0] + off[0], p0[1] + off[1], p0[2] + off[2]]));
		ring1.push(b.addVertex([p1[0] + off[0], p1[1] + off[1], p1[2] + off[2]]));
	}
	const c0 = b.addVertex(p0);
	const c1 = b.addVertex(p1);

	for (let k = 0; k < seg; k++) {
		const k1 = (k + 1) % seg;
		b.addQuad(ring0[k]!, ring0[k1]!, ring1[k1]!, ring1[k]!);
		b.addTri(c1, ring1[k]!, ring1[k1]!);
		b.addTri(c0, ring0[k1]!, ring0[k]!);
	}
	return b.build();
}

/**
 * Rectangular-section guide base prism swept along dental arch `centerline`.
 */
export function sweptBarMesh(
	centerline: Vec3[],
	width: number,
	height: number,
): TriMesh {
	if (centerline.length < 2) {
		return { positions: new Float32Array(), indices: new Uint32Array() };
	}
	const halfW = width / 2;
	const halfH = height / 2;
	const Z: Vec3 = [0, 0, 1];
	const b = new MeshBuilder();

	const rings: number[][] = [];
	const n = centerline.length;
	for (let i = 0; i < n; i++) {
		const prev = centerline[Math.max(0, i - 1)]!;
		const next = centerline[Math.min(n - 1, i + 1)]!;
		let f = norm3(sub3(next, prev));
		if (len3(f) < 1e-9) f = [1, 0, 0];
		let r = cross3(Z, f);
		if (len3(r) < 1e-9) r = [1, 0, 0];
		r = norm3(r);
		const c = centerline[i]!;
		const corner = (sr: number, sz: number): Vec3 => [
			c[0] + r[0] * sr * halfW,
			c[1] + r[1] * sr * halfW,
			c[2] + sz * halfH,
		];
		const A = b.addVertex(corner(-1, -1));
		const B = b.addVertex(corner(1, -1));
		const C = b.addVertex(corner(1, 1));
		const D = b.addVertex(corner(-1, 1));
		rings.push([A, B, C, D]);
	}

	for (let i = 0; i < n - 1; i++) {
		const a = rings[i]!;
		const d = rings[i + 1]!;
		for (let k = 0; k < 4; k++) {
			const k1 = (k + 1) % 4;
			b.addQuad(a[k]!, a[k1]!, d[k1]!, d[k]!);
		}
	}
	const s = rings[0]!;
	b.addQuad(s[0]!, s[3]!, s[2]!, s[1]!);
	const e = rings[n - 1]!;
	b.addQuad(e[0]!, e[1]!, e[2]!, e[3]!);

	return b.build();
}

/**
 * Signed volume of an indexed triangle mesh using the divergence theorem.
 */
export function meshVolume(m: TriMesh): number {
	const p = m.positions;
	const idx = m.indices;
	let vol = 0;
	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t]! * 3;
		const b = idx[t + 1]! * 3;
		const c = idx[t + 2]! * 3;
		const ax = p[a]!,
			ay = p[a + 1]!,
			az = p[a + 2]!;
		const bx = p[b]!,
			by = p[b + 1]!,
			bz = p[b + 2]!;
		const cx = p[c]!,
			cy = p[c + 1]!,
			cz = p[c + 2]!;
		vol +=
			(ax * (by * cz - bz * cy) -
				ay * (bx * cz - bz * cx) +
				az * (bx * cy - by * cx)) /
			6;
	}
	return vol;
}

/**
 * Checks if every directed edge appears exactly once with opposite half-edge.
 */
export function isClosedOriented(m: TriMesh): boolean {
	const seen = new Map<string, number>();
	const idx = m.indices;
	for (let t = 0; t < idx.length; t += 3) {
		const tri = [idx[t]!, idx[t + 1]!, idx[t + 2]!];
		for (let k = 0; k < 3; k++) {
			const a = tri[k]!;
			const bb = tri[(k + 1) % 3]!;
			seen.set(`${a}_${bb}`, (seen.get(`${a}_${bb}`) ?? 0) + 1);
		}
	}
	for (const [key, count] of seen) {
		if (count !== 1) return false;
		const [a, bb] = key.split("_");
		if ((seen.get(`${bb}_${a}`) ?? 0) !== 1) return false;
	}
	return true;
}

// ── Binary STL Serializer ──────────────────────────────────────

/**
 * Serializes an indexed triangle mesh into pure binary STL format (IEEE 754 float32 Little Endian).
 *
 * Binary Layout:
 *  - Bytes 0..79: 80-byte header
 *  - Bytes 80..83: 32-bit unsigned integer triangle count (N)
 *  - Bytes 84..(84 + N * 50 - 1): N * 50 bytes of facet records:
 *      * Float32[3]: Facet normal (nx, ny, nz)
 *      * Float32[3]: Vertex 1 (x, y, z)
 *      * Float32[3]: Vertex 2 (x, y, z)
 *      * Float32[3]: Vertex 3 (x, y, z)
 *      * Uint16: Attribute byte count (0)
 *
 * @param mesh Input indexed triangle mesh
 * @param headerText Optional header ASCII text (truncated to max 79 chars)
 * @returns ArrayBuffer containing valid binary STL stream
 */
export function triMeshToBinarySTL(
	mesh: TriMesh,
	headerText = "Dente Surgical Guide STL 3D Print - ISO 13485",
): ArrayBuffer {
	const idx = mesh.indices;
	const p = mesh.positions;
	const nTri = Math.floor(idx.length / 3);

	const buffer = new ArrayBuffer(84 + nTri * 50);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// Write 80-byte header in ASCII
	const cleanHeader = headerText.slice(0, 79);
	for (let i = 0; i < cleanHeader.length; i++) {
		bytes[i] = cleanHeader.charCodeAt(i);
	}

	// Write triangle count at byte offset 80 (uint32 Little Endian)
	view.setUint32(80, nTri, true);

	let offset = 84;
	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t]! * 3;
		const b = idx[t + 1]! * 3;
		const c = idx[t + 2]! * 3;

		const ax = p[a]!;
		const ay = p[a + 1]!;
		const az = p[a + 2]!;

		const bx = p[b]!;
		const by = p[b + 1]!;
		const bz = p[b + 2]!;

		const cx = p[c]!;
		const cy = p[c + 1]!;
		const cz = p[c + 2]!;

		// Facet normal = normalize((b - a) x (c - a))
		const ux = bx - ax;
		const uy = by - ay;
		const uz = bz - az;

		const vx = cx - ax;
		const vy = cy - ay;
		const vz = cz - az;

		let nx = uy * vz - uz * vy;
		let ny = uz * vx - ux * vz;
		let nz = ux * vy - uy * vx;
		const nLen = Math.hypot(nx, ny, nz) || 1;
		nx /= nLen;
		ny /= nLen;
		nz /= nLen;

		// Normal
		view.setFloat32(offset, nx, true);
		view.setFloat32(offset + 4, ny, true);
		view.setFloat32(offset + 8, nz, true);

		// Vertex 1
		view.setFloat32(offset + 12, ax, true);
		view.setFloat32(offset + 16, ay, true);
		view.setFloat32(offset + 20, az, true);

		// Vertex 2
		view.setFloat32(offset + 24, bx, true);
		view.setFloat32(offset + 28, by, true);
		view.setFloat32(offset + 32, bz, true);

		// Vertex 3
		view.setFloat32(offset + 36, cx, true);
		view.setFloat32(offset + 40, cy, true);
		view.setFloat32(offset + 44, cz, true);

		// Attribute byte count (0)
		view.setUint16(offset + 48, 0, true);

		offset += 50;
	}

	return buffer;
}
