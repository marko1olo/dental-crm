import { getToolGroup } from '../../store/ToolGroupManager';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getBrushToolInstances } from './getBrushToolInstances';
export function setBrushThresholdForToolGroup(toolGroupId, threshold) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    brushBasedToolInstances.forEach((tool) => {
        const activeStrategy = tool.configuration.activeStrategy;
        if (!activeStrategy.toLowerCase().includes('threshold')) {
            return;
        }
        tool.configuration = {
            ...tool.configuration,
            threshold: {
                ...tool.configuration.threshold,
                ...threshold,
            },
        };
    });
    const viewportsInfo = toolGroup.getViewportsInfo();
    if (!viewportsInfo.length) {
        return;
    }
    const viewportIds = toolGroup.getViewportIds();
    triggerAnnotationRenderForViewportIds(viewportIds);
}
export function getBrushThresholdForToolGroup(toolGroupId) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    const brushToolInstance = brushBasedToolInstances[0];
    if (!brushToolInstance) {
        return;
    }
    return brushToolInstance.configuration.threshold.range;
}
