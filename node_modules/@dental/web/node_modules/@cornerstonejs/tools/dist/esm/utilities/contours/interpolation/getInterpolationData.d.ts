import type { InterpolationViewportData, Annotation } from '../../../types';
export type FilterParam = {
    parentKey?: (annotation: Annotation) => unknown;
    key: string;
    value: unknown;
};
export default function getInterpolationData(viewportData: InterpolationViewportData, filterParams?: any[]): Map<number, Annotation[]>;
