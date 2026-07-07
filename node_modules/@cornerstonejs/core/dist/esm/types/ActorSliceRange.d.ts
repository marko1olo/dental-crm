import type { VolumeActor } from './IActor';
import type Point3 from './Point3';
interface ActorSliceRange {
    actor: VolumeActor;
    viewPlaneNormal: Point3;
    focalPoint: Point3;
    min: number;
    max: number;
    current: number;
}
export type { ActorSliceRange as default };
