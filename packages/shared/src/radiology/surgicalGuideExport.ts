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

export {
  triMeshToBinarySTL,
  exportSurgicalGuideStlBlob,
} from "./guideExportEngine.js";

