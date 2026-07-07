import { getToolGroup } from '../../store/ToolGroupManager';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getBrushToolInstances } from './getBrushToolInstances';
export function setBrushSizeForToolGroup(toolGroupId, brushSize, toolName) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId, toolName);
    brushBasedToolInstances.forEach((tool) => {
        const minRadius = tool.configuration.minRadius;
        const maxRadius = tool.configuration.maxRadius;
        let newBrushSize = minRadius ? Math.max(brushSize, minRadius) : brushSize;
        newBrushSize = maxRadius ? Math.min(newBrushSize, maxRadius) : newBrushSize;
        tool.configuration.brushSize = newBrushSize;
        tool.invalidateBrushCursor();
    });
    const viewportIds = toolGroup.getViewportIds();
    triggerAnnotationRenderForViewportIds(viewportIds);
}
export function getBrushSizeForToolGroup(toolGroupId, toolName) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId, toolName);
    const brushToolInstance = brushBasedToolInstances[0];
    if (!brushToolInstance) {
        return;
    }
    return brushToolInstance.configuration.brushSize;
}
