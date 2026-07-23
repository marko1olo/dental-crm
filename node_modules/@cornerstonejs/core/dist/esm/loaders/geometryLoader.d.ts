import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import { GeometryType } from '../enums';
import type { IGeometry, PublicContourSetData, PublicSurfaceData, PublicMeshData, GeometryLoaderFn } from '../types';
import type { GeometryLoaderOptions } from '../types/GeometryLoaderFn';
export declare function setOptions(newOptions: GeometryLoaderOptions): void;
export declare function getOptions(): GeometryLoaderOptions;
export interface GeometryOptions {
    type: GeometryType;
    geometryData: PublicContourSetData | PublicSurfaceData | PublicMeshData;
    sizeInBytes?: number;
    segmentIndex?: number;
}
export declare function loadGeometry(geometryId: string, options?: GeometryOptions): Promise<IGeometry>;
export declare function loadAndCacheGeometry(geometryId: string, options?: GeometryOptions): Promise<IGeometry>;
export declare function createAndCacheGeometry(geometryId: string, options: GeometryOptions): IGeometry;
export declare function registerGeometryLoader(scheme: string, geometryLoader: GeometryLoaderFn): void;
export declare function registerUnknownGeometryLoader(geometryLoader: GeometryLoaderFn): GeometryLoaderFn | undefined;
