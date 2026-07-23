import type { Types } from '@cornerstonejs/core';
import type { PolylineInfoCanvas } from './polylineInfoTypes';
import type { ContourSegmentationAnnotation } from '../../types';
export declare function unifyPolylineSets(polylinesSetA: PolylineInfoCanvas[], polylinesSetB: PolylineInfoCanvas[]): PolylineInfoCanvas[];
export declare function unifyMultiplePolylineSets(polylineSets: PolylineInfoCanvas[][]): PolylineInfoCanvas[];
export declare function unifyAnnotationPolylines(annotationsSetA: ContourSegmentationAnnotation[], annotationsSetB: ContourSegmentationAnnotation[], viewport: Types.IViewport): PolylineInfoCanvas[];
