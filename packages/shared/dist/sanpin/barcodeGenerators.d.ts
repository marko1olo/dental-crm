/**
 * ============================================================================
 * SANPIN VECTOR BARCODE GENERATORS (DATAMATRIX 2D & CODE128 1D)
 * Чистая TypeScript реализация без внешних сетевых зависимостей.
 * Поддерживает генерацию SVG, битовой матрицы и расчет контрольных сумм.
 * ============================================================================
 */
export interface DataMatrixSvgOptions {
    readonly size?: number | undefined;
    readonly color?: string | undefined;
    readonly bgColor?: string | undefined;
    readonly quietZone?: boolean | undefined;
    readonly margin?: number | undefined;
}
export interface SanpinCode128SvgOptions {
    readonly height?: number | undefined;
    readonly width?: number | undefined;
    readonly showText?: boolean | undefined;
    readonly barColor?: string | undefined;
    readonly quietZoneModules?: number | undefined;
}
/**
 * Generates Code 128 (Subset B) vector SVG string.
 */
export declare function generateSanpinCode128Svg(value: string, options?: SanpinCode128SvgOptions): string;
/**
 * Computes deterministic DataMatrix 2D bit grid (20x20 or specified dimension) with L-finder pattern and timing tracks.
 */
export declare function generateDataMatrixBitGrid(payload: string, dimension?: number): boolean[][];
/**
 * Generates standalone 2D DataMatrix vector SVG string.
 */
export declare function generateSanpinDataMatrixSvg(payload: string, options?: DataMatrixSvgOptions): string;
/**
 * Formats standardized SanPiN DataMatrix payload string.
 */
export declare function formatKraftDataMatrixPayload(params: {
    batchId: string;
    autoclaveId: string;
    cycleNumber: number;
    packDate: string;
    expDate: string;
    operatorId?: string | undefined;
    toolSetId: string;
    serialNumber?: number | undefined;
}): string;
/**
 * Generates 1D Code128 text barcode string for Kraft package serial tracking.
 */
export declare function generate1DBarcodeString(batchId: string, serialNumber: number): string;
