import type { vec3 } from 'gl-matrix';
import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
import type BoundsIJK from '../types/BoundsIJK';
import type { CPUImageData, Point3 } from '../types';
export type PointInShape = {
    value: number;
    index: number;
    pointIJK: vec3;
    pointLPS: vec3 | number[];
};
export type PointInShapeCallback = ({ value, index, pointIJK, pointLPS, }: {
    value: number;
    index: number;
    pointIJK: Point3;
    pointLPS: Point3;
}) => void;
export type ShapeFnCriteria = (pointLPS: vec3, pointIJK: vec3) => boolean;
export interface PointInShapeOptions {
    pointInShapeFn: ShapeFnCriteria;
    callback?: PointInShapeCallback;
    boundsIJK?: BoundsIJK;
    returnPoints?: boolean;
}
export declare function pointInShapeCallback(imageData: vtkImageData | CPUImageData, options: PointInShapeOptions): Array<PointInShape> | undefined;
export declare function iterateOverPointsInShape({ imageData, bounds, scalarData, pointInShapeFn, callback, }: {
    imageData: any;
    bounds: any;
    scalarData: any;
    pointInShapeFn: any;
    callback: any;
}): PointInShape[];
export declare function iterateOverPointsInShapeVoxelManager({ voxelManager, bounds, imageData, pointInShapeFn, callback, returnPoints, }: {
    voxelManager: any;
    bounds: any;
    imageData: any;
    pointInShapeFn: any;
    callback: any;
    returnPoints: any;
}): PointInShape[];
