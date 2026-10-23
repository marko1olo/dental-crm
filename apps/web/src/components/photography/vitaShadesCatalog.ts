/**
 * VITA Classical & VITA 3D-Master Calibrated Dental Color Scales
 *
 * Re-exports:
 * - Color models and conversions (sRGB <-> CIELAB)
 * - Classical & 3D-Master catalogs
 * - Cyrillic homoglyph normalization & shade lookup
 * - CIEDE2000 & CIE76 color difference calculations
 */

export * from './vita/types';
export * from './vita/colorimetry';
export * from './vita/createShade';
export * from './vita/vitaClassical';
export * from './vita/vita3dMaster';
export * from './vita/normalize';
export * from './vita/ciede2000';
