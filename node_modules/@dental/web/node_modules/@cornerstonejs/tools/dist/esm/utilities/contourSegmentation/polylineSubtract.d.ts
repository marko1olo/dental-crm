import type { Types } from '@cornerstonejs/core';
import type { PolylineInfoCanvas } from './polylineInfoTypes';
import type { ContourSegmentationAnnotation } from '../../types';
export declare function subtractPolylineSets(polylinesSetA: PolylineInfoCanvas[], polylinesSetB: PolylineInfoCanvas[]): PolylineInfoCanvas[];
export declare function subtractMultiplePolylineSets(basePolylineSet: PolylineInfoCanvas[], subtractorSets: PolylineInfoCanvas[][]): PolylineInfoCanvas[];
export declare function subtractAnnotationPolylines(baseAnnotations: ContourSegmentationAnnotation[], subtractorAnnotations: ContourSegmentationAnnotation[], viewport: Types.IViewport): PolylineInfoCanvas[];
