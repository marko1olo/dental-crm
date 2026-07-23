import type { NamedStatistics } from '../../../types';
export declare abstract class Calculator {
    static getStatistics: () => NamedStatistics;
}
export declare class InstanceCalculator {
    private storePointData;
    constructor(options: {
        storePointData: boolean;
    });
    getStatistics(): void;
}
