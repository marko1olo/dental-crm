import type { NamedStatistics } from '../../../types';
import { Calculator, InstanceCalculator } from './Calculator';
import type { Types } from '@cornerstonejs/core';
interface BasicStatsState {
    max: number[];
    min: number[];
    sum: number[];
    count: number;
    maxIJK: Types.Point3 | null;
    maxLPS: Types.Point3 | null;
    minIJK: Types.Point3 | null;
    minLPS: Types.Point3 | null;
    runMean: number[];
    m2: number[];
    m3: number[];
    m4: number[];
    allValues: number[][];
    pointsInShape?: Types.IPointsManager<Types.Point3> | null;
    sumLPS: Types.Point3;
}
export declare class BasicStatsCalculator extends Calculator {
    protected static state: BasicStatsState;
    static statsInit(options: {
        storePointData: boolean;
    }): void;
    static statsCallback: ({ value: newValue, pointLPS, pointIJK, }: {
        value: number | Types.RGB;
        pointLPS?: Types.Point3 | null;
        pointIJK?: Types.Point3 | null;
    }) => void;
    static getStatistics: (options?: {
        unit: string;
    }) => NamedStatistics;
}
export declare class InstanceBasicStatsCalculator extends InstanceCalculator {
    private state;
    constructor(options: {
        storePointData: boolean;
    });
    statsInit(options: {
        storePointData: boolean;
    }): void;
    statsCallback(data: {
        value: number | Types.RGB;
        pointLPS?: Types.Point3 | null;
        pointIJK?: Types.Point3 | null;
    }): void;
    getStatistics(options?: {
        unit: string;
        spacing?: number[] | number;
    }): NamedStatistics;
}
export {};
