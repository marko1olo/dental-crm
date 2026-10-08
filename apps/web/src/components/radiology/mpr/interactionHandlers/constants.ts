/**
 * Layer 0: Constants for CBCT MPR Interaction Handlers
 * Limits, hit-test radii, sensitivity factors and step sizes.
 */

export const WW_DRAG_SENSITIVITY = 8;
export const WL_DRAG_SENSITIVITY = 4;
export const WW_MIN_LIMIT = 100;
export const WW_MAX_LIMIT = 10000;
export const WL_MIN_LIMIT = -1000;
export const WL_MAX_LIMIT = 4000;

export const ZOOM_MIN_LIMIT = 0.5;
export const ZOOM_MAX_LIMIT = 5.0;
export const ZOOM_FACTOR_EXP = 0.01;
export const ZOOM_CLICK_STEP = 1.25;
export const ZOOM_ALT_CLICK_STEP = 0.8;

export const WHEEL_QUANTIZE_INTERVAL = 60;
export const WHEEL_STEP_NORMAL = 1;
export const WHEEL_STEP_SHIFT = 5;

export const MEASUREMENT_HANDLE_HIT_RADIUS = 12;
export const MEASUREMENT_OBJECT_HIT_RADIUS = 10;
export const ROTATION_HANDLE_HIT_RADIUS = 24;
export const ROTATION_HANDLE_DISTANCE_PX = 65;
export const CROSSHAIR_CENTER_HIT_RADIUS = 18;
export const NERVE_NODE_HIT_RADIUS = 14;
export const DENTAL_ARCH_ANCHOR_HIT_RADIUS = 14;

export const RULER_MIN_VALID_DISTANCE_MM = 0.3;
