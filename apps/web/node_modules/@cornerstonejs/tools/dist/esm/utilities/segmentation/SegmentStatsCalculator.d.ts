import type { Types } from '@cornerstonejs/core';
import type { NamedStatistics } from '../../types';
export default class SegmentStatsCalculator {
    private static calculators;
    private static indices;
    private static mode;
    static statsInit(options: {
        storePointData: boolean;
        indices: number[];
        mode: 'collective' | 'individual';
    }): void;
    static statsCallback(data: {
        value: number | Types.RGB;
        pointLPS?: Types.Point3;
        pointIJK?: Types.Point3;
        segmentIndex?: number;
    }): void;
    static getStatistics(options?: {
        spacing?: number[] | number;
        unit?: string;
        calibration?: unknown;
        hasPixelSpacing?: boolean;
    }): NamedStatistics | {
        [segmentIndex: number]: NamedStatistics;
    };
}
