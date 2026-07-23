export interface ITransferFunctionNode {
    x: number;
    r: number;
    g: number;
    b: number;
    midpoint?: number;
    sharpness?: number;
}
export type TransferFunctionNodes = ITransferFunctionNode[];
