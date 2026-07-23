import { getToolGroup } from '../../store/ToolGroupManager';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getBrushToolInstances } from './getBrushToolInstances';
export function invalidateBrushCursor(toolGroupId) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    brushBasedToolInstances.forEach((tool) => {
        tool.invalidateBrushCursor();
    });
    const viewportsInfo = toolGroup.getViewportsInfo();
    const viewportsInfoArray = Object.keys(viewportsInfo).map((key) => viewportsInfo[key]);
    if (!viewportsInfoArray.length) {
        return;
    }
    const viewportIds = toolGroup.getViewportIds();
    triggerAnnotationRenderForViewportIds(viewportIds);
}
