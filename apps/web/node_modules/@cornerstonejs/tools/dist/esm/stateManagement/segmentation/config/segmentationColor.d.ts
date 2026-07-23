import type { Types } from '@cornerstonejs/core';
declare function addColorLUT(colorLUT: Types.ColorLUT, colorLUTIndex?: number): number;
declare function setColorLUT(viewportId: string, segmentationId: string, colorLUTsIndex: number): void;
declare function getSegmentIndexColor(viewportId: string, segmentationId: string, segmentIndex: number): Types.Color;
declare function setSegmentIndexColor(viewportId: string, segmentationId: string, segmentIndex: number, color: Types.Color): void;
export { getSegmentIndexColor, addColorLUT, setColorLUT, setSegmentIndexColor };
