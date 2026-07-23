import type { ViewPresentation, ViewReference, ViewportInputOptions, Point3 } from '../types';
import { RequestType } from '../enums';
export interface StackLoadImageOptions {
    imageId: string;
}
export interface FullImageLoadOptions {
    viewReference: ViewReference;
    viewPresentation: ViewPresentation;
    imageId: undefined;
}
export type CanvasLoadPosition = {
    origin: Point3;
    topRight: Point3;
    bottomLeft: Point3;
    thicknessMm: number;
    rightVector: Point3;
    downVector: Point3;
};
export type LoadImageOptions = {
    canvas: HTMLCanvasElement;
    imageId?: string;
    viewReference?: ViewReference;
    viewPresentation?: ViewPresentation;
    requestType?: RequestType;
    priority?: number;
    renderingEngineId?: string;
    useCPURendering?: boolean;
    thumbnail?: boolean;
    imageAspect?: boolean;
    physicalPixels?: boolean;
    viewportOptions?: ViewportInputOptions;
} & (StackLoadImageOptions | FullImageLoadOptions);
export default function loadImageToCanvas(options: LoadImageOptions): Promise<CanvasLoadPosition>;
