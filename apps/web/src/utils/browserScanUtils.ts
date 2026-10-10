/**
 * @file browserScanUtils.ts
 * @description Canonical Facade for browser-side filesystem and imaging/migration scanner utilities.
 * Decomposed into modular DAG layers under ./browserScan/:
 * - types.ts: Filesystem handles, scanner runtime contracts, limit constants
 * - errorClassifiers.ts: Abort errors, signal checking
 * - dicomDiscovery.ts: DICOM magic sniffing, workstation facts, folder fingerprinting, preview storage
 * - directoryTraverser.ts: Classification, hint scoring, discovery builder, progress and yielding
 *
 * Preserves 100% AST export parity for backward compatibility.
 */

export * from "./browserScan/index.js";
