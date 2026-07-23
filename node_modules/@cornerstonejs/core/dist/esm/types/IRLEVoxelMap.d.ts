import type RLEVoxelMap from '../utilities/RLEVoxelMap';
export interface RLERun<T> {
    value: T;
    start: number;
    end: number;
}
export type IRLEVoxelMap<T> = RLEVoxelMap<T>;
