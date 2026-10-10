/**
 * @file MobileChairsideRadiologyViewer.tsx
 * @description Canonical Thin Facade for Mobile Chairside Radiology Viewer (<150 lines).
 * Decomposed into modular architecture under `./mobileViewer/`:
 * - types.ts: Contract interfaces & gesture/filter types
 * - MobileGestureViewport.tsx: Canvas touch-gesture viewport (pan, pinch zoom, caliper)
 * - MobileRadiologyFilterToolbar.tsx: Thumb zone actions (invert, contrast, zoom, rotate, filters)
 * - MobileStudiesDrawer.tsx: Native bottom sheet drawer for patient studies
 * - MobilePatientShowcaseOverlay.tsx: Chairside patient presentation ('До/После', Form 043/u)
 * - index.tsx: Master coordinator
 */

export * from "./mobileViewer/index.js";
export { MobileChairsideRadiologyViewer as default } from "./mobileViewer/index.js";
