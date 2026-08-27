import { type PerioToothRecord } from "./types.js";
/**
 * WHO 6-Sextant PSR / CPITN Screening definitions:
 * S1: 17..14 (Upper Right Posterior)
 * S2: 13..23 (Upper Anterior)
 * S3: 24..27 (Upper Left Posterior)
 * S4: 37..34 (Lower Left Posterior)
 * S5: 33..43 (Lower Anterior)
 * S6: 44..47 (Lower Right Posterior)
 */
export declare const PSR_SEXTANTS: readonly [{
    readonly name: "S1";
    readonly label: "Верхний правый дистальный (17-14)";
    readonly teeth: readonly [17, 16, 15, 14];
}, {
    readonly name: "S2";
    readonly label: "Верхний фронтальный (13-23)";
    readonly teeth: readonly [13, 12, 11, 21, 22, 23];
}, {
    readonly name: "S3";
    readonly label: "Верхний левый дистальный (24-27)";
    readonly teeth: readonly [24, 25, 26, 27];
}, {
    readonly name: "S4";
    readonly label: "Нижний левый дистальный (37-34)";
    readonly teeth: readonly [37, 36, 35, 34];
}, {
    readonly name: "S5";
    readonly label: "Нижний фронтальный (33-43)";
    readonly teeth: readonly [33, 32, 31, 41, 42, 43];
}, {
    readonly name: "S6";
    readonly label: "Нижний правый дистальный (44-47)";
    readonly teeth: readonly [44, 45, 46, 47];
}];
export type PsrSextantResult = {
    code: 0 | 1 | 2 | 3 | 4;
    asterisk: boolean;
    highestPocketDepthMm: number;
    teethCount: number;
};
/**
 * Calculates PSR / CPITN screening codes per sextant:
 * - Code 0: Colored band completely visible, no calculus, no bleeding (PD <= 3mm)
 * - Code 1: Colored band completely visible, bleeding on probing present (PD <= 3mm, BOP+)
 * - Code 2: Colored band completely visible, supra/subgingival calculus or overhang present
 * - Code 3: Colored band partially submerged (PD 4-5 mm)
 * - Code 4: Colored band completely submerged inside pocket (PD >= 6 mm)
 * - Asterisk (*): Furcation involvement (>= Class I) or pathological mobility (>= Degree II)
 */
export declare function calculatePsrSextants(teeth: PerioToothRecord[]): Record<string, PsrSextantResult>;
/**
 * Formats PSR sextants into standard clinical string:
 * S1: 4* | S2: 1 | S3: 3 | S4: 2 | S5: 1 | S6: 4*
 */
export declare function formatPsrSextantsSummary(psr: Record<string, PsrSextantResult>): string;
