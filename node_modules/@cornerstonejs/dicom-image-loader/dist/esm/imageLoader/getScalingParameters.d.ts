export default function getScalingParameters(metaData: any, imageId: string): {
    doseGridScaling: any;
    doseSummation: any;
    doseType: any;
    doseUnit: any;
    suvbw: any;
    rescaleSlope: any;
    rescaleIntercept: any;
    modality: string;
};
