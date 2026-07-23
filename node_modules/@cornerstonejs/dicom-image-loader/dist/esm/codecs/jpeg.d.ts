export default JpegImage;
declare class JpegImage {
    load(path: any): void;
    parse(data: any): void;
    width: any;
    height: any;
    jfif: {
        version: {
            major: any;
            minor: any;
        };
        densityUnits: any;
        xDensity: number;
        yDensity: number;
        thumbWidth: any;
        thumbHeight: any;
        thumbData: any;
    };
    adobe: {
        version: any;
        flags0: number;
        flags1: number;
        transformCode: any;
    };
    components: any[];
    colorspace: any;
    getData16(width: any, height: any): Uint16Array;
    getData(width: any, height: any): Uint8Array;
}
