import type { Types } from '@cornerstonejs/core';
import type { FanShapeContour, ContourExportOptions, PixelDataResult, FanGeometryResult } from './types';
export declare function exportContourJpeg(pixelData: Types.PixelDataTypedArray, width: number, height: number, contour: FanShapeContour, opts?: ContourExportOptions): string;
export declare function getPixelData(imageId: string): PixelDataResult | undefined;
export default function saveBinaryData(url: string, filename: string): void;
export declare function downloadFanJpeg(imageId: string, contourType?: number): void;
export declare function calculateFanGeometry(imageId: string): FanGeometryResult | undefined;
