import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
import type Point3 from './Point3';
import type Metadata from './Metadata';
import type Mat3 from './Mat3';
import type { PixelDataTypedArray, PixelDataTypedArrayString } from './PixelDataTypedArray';
import type RGB from './RGB';
import type { IVoxelManager } from './IVoxelManager';
interface VolumeProps {
    volumeId: string;
    metadata: Metadata;
    dimensions: Point3;
    spacing: Point3;
    origin: Point3;
    direction: Mat3;
    imageData?: vtkImageData;
    voxelManager?: IVoxelManager<number> | IVoxelManager<RGB>;
    dataType: PixelDataTypedArrayString;
    scalarData?: PixelDataTypedArray | PixelDataTypedArray[];
    sizeInBytes?: number;
    additionalDetails?: Record<string, unknown>;
    scaling?: {
        PT?: {
            SUVlbmFactor?: number;
            SUVbsaFactor?: number;
            suvbwToSuvlbm?: number;
            suvbwToSuvbsa?: number;
        };
    };
    referencedVolumeId?: string;
    numberOfComponents?: number;
}
export type { VolumeProps };
