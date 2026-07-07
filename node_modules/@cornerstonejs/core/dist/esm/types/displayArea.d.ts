import type InterpolationType from '../enums/InterpolationType';
interface DisplayArea {
    type?: 'SCALE' | 'FIT';
    scale?: number;
    interpolationType?: InterpolationType;
    imageArea?: [number, number];
    imageCanvasPoint?: {
        imagePoint: [number, number];
        canvasPoint?: [number, number];
    };
    storeAsInitialCamera?: boolean;
}
export type { DisplayArea as default };
