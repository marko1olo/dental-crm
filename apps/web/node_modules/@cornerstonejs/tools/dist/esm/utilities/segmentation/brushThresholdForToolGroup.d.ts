import type { Types } from '@cornerstonejs/core';
export declare function setBrushThresholdForToolGroup(toolGroupId: string, threshold: {
    range: Types.Point2;
    isDynamic: boolean;
    dynamicRadius: number;
}): void;
export declare function getBrushThresholdForToolGroup(toolGroupId: string): any;
