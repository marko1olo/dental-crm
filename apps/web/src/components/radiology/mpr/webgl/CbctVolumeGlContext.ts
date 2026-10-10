/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Canonical Thin Facade (Mandate 8b / Decomposer Wave 22)
 *
 * All implementations have been safely decomposed into the modular `volumeGlContext` package:
 * - types.ts (GL context, uniforms, textures, buffers, render options)
 * - glShaderPrograms.ts (vertex/fragment shaders compilation & linking)
 * - glTextureManager.ts (3D voxel texture uploads, LOD downsampling, VRAM disposal)
 * - glRenderPipelines.ts (slice drawing pipelines, viewport setup, buffer clearing)
 * - CbctVolumeGlContextCore.ts (CbctVolumeGlContext core lifecycle & render methods)
 * - index.ts (shared pool management singleton & full re-exports)
 */

export * from "./volumeGlContext/index";
