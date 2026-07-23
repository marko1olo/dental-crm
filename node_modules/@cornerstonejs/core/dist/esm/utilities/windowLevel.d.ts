import VOILUTFunctionType from '../enums/VOILUTFunctionType';
declare function toWindowLevel(low: number, high: number): {
    windowWidth: number;
    windowCenter: number;
};
declare function toLowHighRange(windowWidth: number, windowCenter: number, voiLUTFunction?: VOILUTFunctionType): {
    lower: number;
    upper: number;
};
export { toWindowLevel, toLowHighRange };
