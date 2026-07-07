import type IImage from './IImage';
type ImageLoaderFn = (imageId: string, options?: Record<string, unknown>) => {
    promise: Promise<IImage>;
    cancelFn?: () => void | undefined;
    decache?: () => void | undefined;
};
export type { ImageLoaderFn as default };
