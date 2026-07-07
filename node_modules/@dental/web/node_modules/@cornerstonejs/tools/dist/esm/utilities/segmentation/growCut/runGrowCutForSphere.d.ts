import type { Types } from '@cornerstonejs/core';
import { type GrowCutOptions } from './runGrowCut';
type SphereInfo = {
    center: Types.Point3;
    radius: number;
};
declare function runGrowCutForSphere(referencedVolumeId: string, sphereInfo: SphereInfo, viewport: Types.IViewport, options?: GrowCutOptions): Promise<Types.IImageVolume>;
export { runGrowCutForSphere as default, runGrowCutForSphere };
export type { SphereInfo, GrowCutOptions as GrowCutSphereOptions };
