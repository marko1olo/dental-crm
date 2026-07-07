import type { Types } from '@cornerstonejs/core';
declare function getDataInTime(dynamicVolume: Types.IDynamicImageVolume, options: {
    dimensionGroupNumbers?: number[];
    frameNumbers?: number[];
    maskVolumeId?: string;
    worldCoordinate?: Types.Point3;
}): number[] | number[][];
export default getDataInTime;
