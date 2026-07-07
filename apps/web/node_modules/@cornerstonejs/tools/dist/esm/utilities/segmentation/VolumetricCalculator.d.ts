import type { Types } from '@cornerstonejs/core';
import type { NamedStatistics } from '../../types';
import { BasicStatsCalculator, InstanceBasicStatsCalculator } from '../math/basic/BasicStatsCalculator';
export declare class VolumetricCalculator extends BasicStatsCalculator {
    private static volumetricState;
    static statsInit(options: {
        storePointData: boolean;
    }): void;
    static statsCallback(data: {
        value: number | Types.RGB;
        pointLPS?: Types.Point3;
        pointIJK?: Types.Point3;
    }): void;
    static getStatistics(options: {
        spacing?: number[] | number;
        unit?: string;
        calibration?: unknown;
        hasPixelSpacing?: boolean;
    }): NamedStatistics;
}
export declare class InstanceVolumetricCalculator extends InstanceBasicStatsCalculator {
    private volumetricState;
    constructor(options: {
        storePointData: boolean;
    });
    statsInit(options: {
        storePointData: boolean;
    }): void;
    statsCallback(data: {
        value: number | Types.RGB;
        pointLPS?: Types.Point3;
        pointIJK?: Types.Point3;
    }): void;
    getStatistics(options?: {
        spacing?: number[] | number;
        unit?: string;
        calibration?: unknown;
        hasPixelSpacing?: boolean;
    }): NamedStatistics;
}
export default VolumetricCalculator;
