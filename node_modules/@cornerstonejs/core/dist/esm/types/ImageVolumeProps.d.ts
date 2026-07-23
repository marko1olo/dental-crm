import type { VolumeProps } from './VolumeProps';
interface ImageVolumeProps extends VolumeProps {
    imageIds: string[];
    referencedImageIds?: string[];
}
export type { ImageVolumeProps };
