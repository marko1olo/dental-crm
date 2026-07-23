interface ScalingParameters {
    rescaleSlope: number;
    rescaleIntercept: number;
    modality: string;
    suvbw?: number;
    suvlbm?: number;
    suvbsa?: number;
}
interface PTScaling {
    suvbwToSuvlbm?: number;
    suvbwToSuvbsa?: number;
    suvbw?: number;
    suvlbm?: number;
    suvbsa?: number;
}
interface Scaling {
    PT?: PTScaling;
}
export type { PTScaling, Scaling, ScalingParameters };
