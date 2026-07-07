import { state } from '../../store/state';
import getActiveToolForMouseEvent from '../shared/getActiveToolForMouseEvent';
import { MouseBindings } from '../../enums/ToolBindings';
function mouseWheel(evt) {
    if (state.isInteractingWithTool) {
        return;
    }
    evt.detail.buttons =
        MouseBindings.Wheel | (evt.detail.event.buttons || 0);
    const activeTool = getActiveToolForMouseEvent(evt);
    if (!activeTool) {
        return;
    }
    return activeTool.mouseWheelCallback(evt);
}
export default mouseWheel;
