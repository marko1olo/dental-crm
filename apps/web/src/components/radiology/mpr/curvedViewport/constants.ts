/**
 * DENTE CRM — CBCT Curved Viewport Constants
 * Layer 0: Pure constants, limits, and configuration defaults (0 side effects)
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

/**
 * Zoom level boundaries and multipliers
 */
export const CBCT_MIN_ZOOM = 0.5;
export const CBCT_MAX_ZOOM = 5.0;
export const CBCT_ZOOM_IN_STEP_FACTOR = 1.25;
export const CBCT_ZOOM_OUT_STEP_FACTOR = 0.8;
export const CBCT_ZOOM_DRAG_FACTOR = 0.01;

/**
 * Window / Level (Hounsfield Units) manipulation boundaries
 */
export const CBCT_MIN_WINDOW_WIDTH = 100;
export const CBCT_MAX_WINDOW_WIDTH = 10000;
export const CBCT_MIN_WINDOW_LEVEL = -1000;
export const CBCT_MAX_WINDOW_LEVEL = 4000;
export const CBCT_WL_DRAG_SCALE_X = 8;
export const CBCT_WL_DRAG_SCALE_Y = 4;

/**
 * Measurement rulers and calipers hit-testing thresholds
 */
export const CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX = 12;
export const CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX = 10;
export const CBCT_MIN_RULER_DISTANCE_MM = 0.5;

/**
 * Cross-section virtual implant interactive editing boundaries
 */
export const IMPLANT_HIT_HANDLE_RADIUS_PX = 12;
export const IMPLANT_BODY_HIT_TOLERANCE_PX = 10;
export const IMPLANT_MIN_ENTRY_X_OFFSET_MM = -8.0;
export const IMPLANT_MAX_ENTRY_X_OFFSET_MM = 8.0;
export const IMPLANT_MIN_ENTRY_DEPTH_MM = 0.0;
export const IMPLANT_MAX_ENTRY_DEPTH_MM = 15.0;
export const IMPLANT_MIN_ANGULATION_DEG = -30;
export const IMPLANT_MAX_ANGULATION_DEG = 30;
export const IMPLANT_MIN_ROTATION_DRAG_HYPOT_PX = 8;

/**
 * Default dimensions and fallbacks for reconstructions
 */
export const DEFAULT_PANORAMIC_WIDTH_PX = 1000;
export const DEFAULT_PANORAMIC_HEIGHT_PX = 500;
export const DEFAULT_CROSS_SECTION_WIDTH_PX = 400;
export const DEFAULT_CROSS_SECTION_HEIGHT_PX = 400;
export const DEFAULT_PIXEL_SPACING_MM = 0.25;
export const DEFAULT_ALVEOLAR_CREST_INSET_MM = 4.0;
