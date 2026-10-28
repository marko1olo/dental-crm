/**
 * DENTE CRM — CBCT MPR Hardware WebGL2 Shaders (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8b: Decomposed into planar and panoramic shader modules (<= 350L each).
 */

export {
	CBCT_MPR_VERTEX_SHADER,
	CBCT_MPR_FRAGMENT_SHADER,
} from "./cbctPlanarMprShaders";

import {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
} from "./cbctPanoramicMprShaders";

export {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
};

export const CBCT_PANORAMIC_VERTEX_SHADER = CBCT_PANORAMIC_CURVED_VERTEX_SHADER;
export const CBCT_PANORAMIC_FRAGMENT_SHADER = CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER;

export type CbctColorMapMode = "grayscale" | "bone_density" | "endo" | "inverted";

export const CBCT_COLORMAP_MODES = {
	GRAYSCALE: 0,
	BONE_DENSITY: 1,
	ENDO: 2,
	INVERTED: 3,
} as const;
