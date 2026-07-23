import type { InterpolationViewportData } from '../../../types';
import type { InterpolationROIAnnotation } from '../../../types/ToolSpecificAnnotationTypes';
import type { FilterParam } from './getInterpolationData';
export default function getInterpolationDataCollection(viewportData: InterpolationViewportData, filterParams: FilterParam[]): InterpolationROIAnnotation[];
