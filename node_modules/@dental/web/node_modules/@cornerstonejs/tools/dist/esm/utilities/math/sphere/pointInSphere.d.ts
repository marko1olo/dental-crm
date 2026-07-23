import type { Types } from '@cornerstonejs/core';
import type { vec3 } from 'gl-matrix';
type Sphere = {
    center: Types.Point3 | vec3;
    radius: number;
    radius2?: number;
};
export default function pointInSphere(sphere: Sphere, pointLPS: vec3): boolean;
export {};
