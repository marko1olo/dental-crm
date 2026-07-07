export interface CornerstoneImageUrl {
    scheme: string;
    url: string;
    frame: number;
    pixelDataFrame: number;
}
declare function parseImageId(imageId: string): CornerstoneImageUrl;
export default parseImageId;
