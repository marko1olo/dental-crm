import { ToolModes } from '../../enums';
import { keyEventListener } from '../../eventListeners';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
import getMouseModifier from './getMouseModifier';
const { Active } = ToolModes;
export default function getActiveToolForMouseEvent(evt) {
    const { renderingEngineId, viewportId, event: mouseEvent } = evt.detail;
    const modifierKey = getMouseModifier(mouseEvent) || keyEventListener.getModifierKey();
    const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
    if (!toolGroup) {
        return null;
    }
    const toolGroupToolNames = Object.keys(toolGroup.toolOptions);
    const defaultMousePrimary = toolGroup.getDefaultMousePrimary();
    const mouseButton = evt.detail.buttons ?? mouseEvent?.buttons ?? defaultMousePrimary;
    for (let j = 0; j < toolGroupToolNames.length; j++) {
        const toolName = toolGroupToolNames[j];
        const toolOptions = toolGroup.toolOptions[toolName];
        const correctBinding = toolOptions.bindings.length &&
            toolOptions.bindings.some((binding) => {
                return (binding.mouseButton === mouseButton &&
                    binding.modifierKey === modifierKey);
            });
        if (toolOptions.mode === Active && correctBinding) {
            return toolGroup.getToolInstance(toolName);
        }
    }
}
