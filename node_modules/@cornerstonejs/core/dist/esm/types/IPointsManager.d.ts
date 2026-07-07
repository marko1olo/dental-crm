import type PointsManager from '../utilities/PointsManager';
export type IPointsManager<T> = PointsManager<T>;
export interface PolyDataPointConfiguration {
    dimensions?: number;
    initialSize?: number;
    growSize?: number;
}
