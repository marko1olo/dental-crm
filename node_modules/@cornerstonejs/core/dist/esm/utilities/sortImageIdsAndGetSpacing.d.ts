import { vec3 } from 'gl-matrix';
import type { Point3 } from '../types';
interface SortedImageIdsItem {
    zSpacing: number;
    origin: Point3;
    sortedImageIds: string[];
}
export default function sortImageIdsAndGetSpacing(imageIds: string[], scanAxisNormal?: vec3): SortedImageIdsItem;
export {};
