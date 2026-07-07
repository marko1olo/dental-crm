import type { mat3 } from 'gl-matrix';
import type { IImageVolume, Point3 } from '../types';
export default function getClosestImageId(imageVolume: IImageVolume | {
    direction: mat3;
    spacing: Point3;
    imageIds: string[];
}, worldPos: Point3, viewPlaneNormal: Point3, options?: {
    ignoreSpacing?: boolean;
}): string | undefined;
