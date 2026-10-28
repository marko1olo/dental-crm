/**
 * DENTE CRM — CBCT Panoramic (OPG) Reconstruction & 3D Nerve Projection Engine
 * Canonical Facade per Mandate 8b: logic decomposed into <= 300L modules.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

export {
	resolveOcclusalCenterZ,
	downsampleVolumeData,
	calculateToothMarkersOnPano,
} from "./cbctPanoramicGeometry";

export {
	type Projected3DNervePoint,
	type Projected3DNerveResult,
	type Project3DNerveOptions,
	project3DNerveToPanorama,
} from "./cbctPanoramicNerveProjection";

export {
	type PanoramicReconstructionResult,
	type PanoramicReconstructionOptions,
	reconstructPanoramicView,
	reconstructPanoramicOpg,
} from "./cbctPanoramicCpuEngine";

export {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
	CBCT_PANORAMIC_VERTEX_SHADER,
	CBCT_PANORAMIC_FRAGMENT_SHADER,
	WebGl2PanoramicEngine,
	getGlobalWebGl2PanoramicEngine,
	reconstructPanoramicViewWebGl2,
} from "./cbctPanoramicWebGlEngine";
