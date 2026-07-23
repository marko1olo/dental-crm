import { resetModifierKey } from '../../eventListeners/keyboard/keyDownListener';
import getActiveToolForKeyboardEvent from '../shared/getActiveToolForKeyboardEvent';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
export default function keyUp(evt) {
    const activeTool = getActiveToolForKeyboardEvent(evt);
    if (!activeTool) {
        return;
    }
    const { renderingEngineId, viewportId } = evt.detail;
    const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
    resetModifierKey();
    const toolName = activeTool.getToolName();
    if (Object.keys(toolGroup.toolOptions).includes(toolName)) {
        toolGroup.setViewportsCursorByToolName(toolName);
    }
}
