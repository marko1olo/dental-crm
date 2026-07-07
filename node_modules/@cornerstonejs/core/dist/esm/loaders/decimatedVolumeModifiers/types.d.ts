import type { ImageVolumeProps } from '../../types';
import type Point3 from '../../types/Point3';
export declare namespace points {
    type points3 = Point3;
}
export interface DecimatedVolumeLoaderOptions {
    ijkDecimation?: points.points3;
}
export interface DecimatedVolumeModifierContext {
    volumeId: string;
    imageIds: string[];
    options: DecimatedVolumeLoaderOptions;
}
export interface DecimatedVolumeModifier {
    name: string;
    apply(volumeProps: ImageVolumeProps, context: DecimatedVolumeModifierContext): ImageVolumeProps;
}
