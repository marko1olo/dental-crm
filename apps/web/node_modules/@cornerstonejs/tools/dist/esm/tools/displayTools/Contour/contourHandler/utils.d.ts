import type { Types } from '@cornerstonejs/core';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
export declare function validateGeometry(geometry: Types.IGeometry): void;
export declare function getPolyData(contourSet: Types.IContourSet): vtkPolyData;
