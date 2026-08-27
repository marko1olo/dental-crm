import { type AapClassificationOptions } from "./grading.js";
import type { PerioChartSummary, PerioToothRecord } from "./types.js";
export interface GenerateProtocol043Options extends AapClassificationOptions {
    readonly doctorName?: string | undefined;
    readonly customNotes?: string | undefined;
}
/**
 * Generates an exhaustive, structured clinical diary text for Form 043/u (Форма 043/у)
 * with complete 6-point charting, AAP/EFP 2018 staging/grading, and treatment plan.
 */
export declare function generateComprehensivePerio043Text(teeth: readonly PerioToothRecord[], summary?: PerioChartSummary, options?: GenerateProtocol043Options): string;
