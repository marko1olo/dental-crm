import type { Types } from '@cornerstonejs/core';
export type FanShapeContour = Types.Point2[];
export interface FanGeometry {
    center: Types.Point2;
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
}
export interface ContourExportOptions {
    strokeStyle?: string;
    lineWidth?: number;
    quality?: number;
}
export interface FanExportOptions {
    strokeStyle?: string;
    lineWidth?: number;
    quality?: number;
}
export interface FanShapeCorners {
    P1: Types.Point2;
    P2: Types.Point2;
    P3: Types.Point2;
    P4: Types.Point2;
}
export interface PixelDataResult {
    pixelData: Types.PixelDataTypedArray;
    width: number;
    height: number;
}
export interface RefinementOptions {
    maxDist?: number;
    step?: number;
}
export interface FanGeometryResult {
    contour: FanShapeContour;
    simplified: FanShapeContour;
    hull: FanShapeContour;
    refined: FanShapeCorners;
    fanGeometry: FanGeometry;
}
