declare function getUSEnhancedRegions(metadata: any): {
    regionLocationMinY0: number;
    regionLocationMaxY1: number;
    regionLocationMinX0: number;
    regionLocationMaxX1: number;
    referencePixelX0: number;
    referencePixelY0: number;
    physicalDeltaX: number;
    physicalDeltaY: number;
    physicalUnitsXDirection: number;
    physicalUnitsYDirection: number;
    referencePhysicalPixelValueY: number;
    referencePhysicalPixelValueX: number;
    regionSpatialFormat: number;
    regionDataType: number;
    regionFlags: number;
    transducerFrequency: number;
}[];
export { getUSEnhancedRegions };
