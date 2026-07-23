import type IGeometry from './IGeometry';
type GeometryLoaderFn = (geometryId: string, options?: Record<string, unknown>, loaderOptions?: GeometryLoaderOptions) => {
    promise: Promise<IGeometry>;
    cancelFn?: () => void | undefined;
    decache?: () => void | undefined;
};
export interface GeometryLoaderOptions {
    beforeSend?: (xhr: XMLHttpRequest, defaultHeaders: Record<string, string>) => Promise<Record<string, string> | void> | Record<string, string> | void;
}
export type { GeometryLoaderFn as default };
