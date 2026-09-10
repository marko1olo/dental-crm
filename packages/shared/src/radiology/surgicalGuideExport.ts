/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL 3D SURGICAL GUIDE STL EXPORT ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical binary STL (stereolithography) serialization of 3D triangle meshes:
 *  - Complies with standard Binary STL specification
 *  - 80-byte header + uint32 triangle count + 50 bytes per triangle
 *  - Analytical unit normal calculation per facet: (b - a) x (c - a)
 *  - Export to ArrayBuffer and Blob (MIME type: model/stl)
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TriMesh } from "./surgicalGuideGeom.js";

/**
 * Binary STL serialization of an indexed triangle mesh — pure TypeScript, zero external dependencies.
 * Each triangle gets an analytical outward unit normal.
 * Layout strictly adheres to standard binary STL specification:
 *  - 80-byte header (zeroed / ASCII descriptor)
 *  - 4-byte uint32 little-endian triangle count (T)
 *  - 50 bytes per triangle:
 *      * Normal vector: 3x float32 (12 bytes)
 *      * Vertex 1 (a):  3x float32 (12 bytes)
 *      * Vertex 2 (b):  3x float32 (12 bytes)
 *      * Vertex 3 (c):  3x float32 (12 bytes)
 *      * Attribute:     1x uint16  (2 bytes, zeroed)
 * Total buffer byte length = 84 + T * 50.
 */
export function triMeshToBinarySTL(mesh: TriMesh): ArrayBuffer {
  const idx = mesh.indices;
  const p = mesh.positions;
  const nTri = Math.floor(idx.length / 3);

  const buf = new ArrayBuffer(84 + nTri * 50);
  const view = new DataView(buf);

  // 80-byte header
  const headerText = "DentalCRM 3D Surgical Guide Binary STL";
  const headerBytes = new Uint8Array(buf, 0, 80);
  for (let i = 0; i < Math.min(headerText.length, 80); i++) {
    headerBytes[i] = headerText.charCodeAt(i);
  }

  // 80: uint32 triangle count (little-endian)
  view.setUint32(80, nTri, true);

  let o = 84;
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
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;

    // Normal vector
    view.setFloat32(o, nx, true);
    view.setFloat32(o + 4, ny, true);
    view.setFloat32(o + 8, nz, true);

    // Vertex 1
    view.setFloat32(o + 12, ax, true);
    view.setFloat32(o + 16, ay, true);
    view.setFloat32(o + 20, az, true);

    // Vertex 2
    view.setFloat32(o + 24, bx, true);
    view.setFloat32(o + 28, by, true);
    view.setFloat32(o + 32, bz, true);

    // Vertex 3
    view.setFloat32(o + 36, cx, true);
    view.setFloat32(o + 40, cy, true);
    view.setFloat32(o + 44, cz, true);

    // Attribute byte count
    view.setUint16(o + 48, 0, true);

    o += 50;
  }

  return buf;
}

/**
 * Serializes a TriMesh into a binary STL Blob for browser export / download.
 */
export function exportSurgicalGuideStlBlob(mesh: TriMesh): Blob {
  const buf = triMeshToBinarySTL(mesh);
  return new Blob([buf], { type: "model/stl" });
}
