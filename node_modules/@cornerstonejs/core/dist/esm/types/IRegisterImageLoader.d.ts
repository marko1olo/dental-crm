import type ImageLoaderFn from './ImageLoaderFn';
interface IRegisterImageLoader {
    registerImageLoader: (scheme: string, imageLoader: ImageLoaderFn) => void;
}
export type { IRegisterImageLoader as default };
