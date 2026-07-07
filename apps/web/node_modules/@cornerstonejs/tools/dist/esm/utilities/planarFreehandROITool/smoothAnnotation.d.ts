import type { PlanarFreehandROIAnnotation } from '../../types/ToolSpecificAnnotationTypes';
export type SmoothOptions = {
    knotsRatioPercentage: number;
    loop: number;
};
export default function smoothAnnotation(annotation: PlanarFreehandROIAnnotation, options?: SmoothOptions): boolean;
