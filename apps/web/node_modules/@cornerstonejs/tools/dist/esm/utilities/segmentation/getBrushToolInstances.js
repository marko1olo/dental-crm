import { getToolGroup } from '../../store/ToolGroupManager';
import BrushTool from '../../tools/segmentation/BrushTool';
export function getBrushToolInstances(toolGroupId, toolName) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return [];
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return [];
    }
    if (toolName && toolInstances[toolName]) {
        return [toolInstances[toolName]];
    }
    const brushBasedToolInstances = Object.values(toolInstances).filter((toolInstance) => toolInstance instanceof BrushTool);
    return brushBasedToolInstances;
}
