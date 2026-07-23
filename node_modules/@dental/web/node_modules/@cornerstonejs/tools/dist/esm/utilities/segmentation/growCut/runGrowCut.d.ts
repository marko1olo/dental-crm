type GrowCutOptions = {
    maxProcessingTime?: number;
    windowSize?: number;
    positiveSeedValue?: number;
    negativeSeedValue?: number;
    positiveSeedVariance?: number;
    negativeSeedVariance?: number;
    inspection?: {
        numCyclesInterval?: number;
        numCyclesBelowThreashold?: number;
        threshold?: number;
    };
};
declare function runGrowCut(referenceVolumeId: string, labelmapVolumeId: string, options?: GrowCutOptions): Promise<void>;
export { runGrowCut as default, runGrowCut as run };
export type { GrowCutOptions };
