import type { Types } from '@cornerstonejs/core';
import type { PlanarFreehandROIAnnotation } from '../../../types/ToolSpecificAnnotationTypes';
type PlanarFreehandROIDrawData = {
    polylineIndex: number;
    canvasPoints: Types.Point2[];
    contourHoleProcessingEnabled: boolean;
};
type PlanarFreehandROIEditData = {
    prevCanvasPoints: Types.Point2[];
    editCanvasPoints: Types.Point2[];
    fusedCanvasPoints: Types.Point2[];
    startCrossingIndex?: Types.Point2;
    editIndex: number;
    snapIndex?: number;
    newAnnotation?: boolean;
};
type PlanarFreehandROICommonData = {
    annotation: PlanarFreehandROIAnnotation;
    viewportIdsToRender: string[];
    spacing: Types.Point2;
    xDir: Types.Point3;
    yDir: Types.Point3;
    movingTextBox?: boolean;
};
export type { PlanarFreehandROIDrawData, PlanarFreehandROIEditData, PlanarFreehandROICommonData, };
