import type { NamedStatistics } from '../../types';
declare function computeMetabolicStats({ segmentationIds, segmentIndex, }: {
    segmentationIds: string[];
    segmentIndex: number;
}): Promise<NamedStatistics | {
    [segmentIndex: number]: NamedStatistics;
}>;
export { computeMetabolicStats };
