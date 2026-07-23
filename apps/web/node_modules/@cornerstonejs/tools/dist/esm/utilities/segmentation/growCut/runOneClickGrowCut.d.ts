import type { Types } from '@cornerstonejs/core';
import type { GrowCutOptions } from './runGrowCut';
type GrowCutOneClickOptions = GrowCutOptions & {
    initialNeighborhoodRadius?: number;
    positiveStdDevMultiplier?: number;
    negativeStdDevMultiplier?: number;
    negativeSeedMargin?: number;
    negativeSeedsTargetPatches?: number;
    positiveSeedValue?: number;
    negativeSeedValue?: number;
    seeds?: {
        positiveSeedIndices: Set<number>;
        negativeSeedIndices: Set<number>;
    };
};
declare function calculateGrowCutSeeds(referencedVolume: Types.IImageVolume, worldPosition: Types.Point3, options?: GrowCutOneClickOptions): {
    positiveSeedIndices: Set<number>;
    negativeSeedIndices: Set<number>;
} | null;
declare function runOneClickGrowCut({ referencedVolumeId, worldPosition, options, }: {
    referencedVolumeId: string;
    worldPosition: Types.Point3;
    options?: GrowCutOneClickOptions;
}): Promise<Types.IImageVolume | null>;
export { runOneClickGrowCut as default, runOneClickGrowCut, calculateGrowCutSeeds, };
export type { GrowCutOneClickOptions };
