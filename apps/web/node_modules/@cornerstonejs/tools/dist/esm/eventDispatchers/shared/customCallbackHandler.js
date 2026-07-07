import { state } from '../../store/state';
import ToolModes from '../../enums/ToolModes';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
const { Active } = ToolModes;
export default function customCallbackHandler(handlerType, customFunction, evt) {
    if (state.isInteractingWithTool) {
        return false;
    }
    const { renderingEngineId, viewportId } = evt.detail;
    const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
    if (!toolGroup) {
        return false;
    }
    let activeTool;
    const toolGroupToolNames = Object.keys(toolGroup.toolOptions);
    for (let j = 0; j < toolGroupToolNames.length; j++) {
        const toolName = toolGroupToolNames[j];
        const tool = toolGroup.toolOptions[toolName];
        const toolInstance = toolGroup.getToolInstance(toolName);
        if (tool.mode === Active &&
            typeof toolInstance[customFunction] === 'function') {
            activeTool = toolGroup.getToolInstance(toolName);
            break;
        }
    }
    if (!activeTool) {
        return;
    }
    activeTool[customFunction](evt);
}
