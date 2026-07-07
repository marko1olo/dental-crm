import type { Types } from '@cornerstonejs/core';
import type { PolylineInfoWorld } from './polylineInfoTypes';
export default function addPolylinesToSegmentation(viewport: Types.IViewport, annotationUIDsMap: Map<number, Set<string>>, segmentationId: string, polylinesInfo: PolylineInfoWorld[], segmentIndex: number): Map<number, Set<string>>;
