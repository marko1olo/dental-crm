interface RotationMatrixInformation {
    isStandard: boolean;
    rotationMatrix: number[];
}
export declare function inverse3x3Matrix(matrix: number[]): number[];
export declare function checkStandardBasis(directions: number[]): RotationMatrixInformation;
export declare function rotatePoints(rotationMatrix: number[], origin: number[], points: number[]): number[];
export {};
