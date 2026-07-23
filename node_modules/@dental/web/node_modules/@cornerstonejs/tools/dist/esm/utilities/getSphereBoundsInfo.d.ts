import type { Types } from '@cornerstonejs/core';
import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
import type { BoundsIJK } from '../types';
type SphereBoundsInfo = {
    boundsIJK: BoundsIJK;
    centerWorld: Types.Point3;
    radiusWorld: number;
    topLeftWorld: Types.Point3;
    bottomRightWorld: Types.Point3;
};
declare function getSphereBoundsInfo(circlePoints: [Types.Point3, Types.Point3], imageData: vtkImageData): SphereBoundsInfo;
declare function getSphereBoundsInfoFromViewport(circlePoints: [Types.Point3, Types.Point3], imageData: vtkImageData, viewport: any): SphereBoundsInfo;
export { getSphereBoundsInfo, getSphereBoundsInfoFromViewport };
export type { SphereBoundsInfo };
