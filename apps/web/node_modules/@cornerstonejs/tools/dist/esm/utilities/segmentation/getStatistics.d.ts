import type { NamedStatistics } from '../../types';
declare function getStatistics({ segmentationId, segmentIndices, mode, }: {
    segmentationId: string;
    segmentIndices: number[] | number;
    mode?: 'collective' | 'individual';
}): Promise<NamedStatistics | {
    [segmentIndex: number]: NamedStatistics;
}>;
export default getStatistics;
