import type { Types } from '@cornerstonejs/core';
export declare function getPointInLineOfSightWithCriteria(viewport: Types.IVolumeViewport, worldPos: Types.Point3, targetVolumeId: string, criteriaFunction: (intensity: number, point: Types.Point3) => Types.Point3, stepSize?: number): Types.Point3;
export declare function getPointsInLineOfSight(viewport: Types.IVolumeViewport, worldPos: Types.Point3, { targetVolumeId, stepSize }: {
    targetVolumeId: string;
    stepSize: number;
}): Types.Point3[];
