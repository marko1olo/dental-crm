import type { Types } from '@cornerstonejs/core';
import type { InterpolationViewportData } from '../../../types/InterpolationTypes';
export type PointsXYZI = Types.PointsXYZ & {
    I?: boolean[];
    kIndex?: number;
};
export type PointsArray3 = Types.IPointsManager<Types.Point3> & {
    I?: boolean[];
};
declare function interpolate(viewportData: InterpolationViewportData): void;
export default interpolate;
